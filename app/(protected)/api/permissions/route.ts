// app/api/permissions/route.ts
// Changes vs original:
//   • GET ?type=menu      → now returns array of MenuPermEntry (adds is_enabled + user_effect)
//   • GET ?type=routeperms → now returns array of RoutePermEntry (adds user_effect)
//   • All other handlers (admin-all, user-perms, user-overrides, PATCH, POST, DELETE) unchanged
//
// The middleware also calls this endpoint with x-internal-secret + ?type=routeperms&email=
// so it gets override-aware data without needing a NextAuth session.

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const type     = req.nextUrl.searchParams.get('type');
  const supabase = getServiceClient();

  // ── Internal middleware call ───────────────────────────────────────────────
  // Middleware can't send cookies so it uses x-internal-secret instead.
  // Only allowed for ?type=routeperms so the surface area stays minimal.
  const internalSecret = req.headers.get('x-internal-secret');
  const isInternal     = !!internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

  if (isInternal && type === 'routeperms') {
    const email = req.nextUrl.searchParams.get('email') ?? null;
    try {
      const [routePermsRes, overridesRes] = await Promise.all([
        supabase.from('route_permissions').select('route, allowed_roles'),
        email
          ? supabase
              .from('user_permission_overrides')
              .select('target_id, effect')
              .eq('email', email)
              .eq('target_type', 'route')
          : Promise.resolve({ data: [] as { target_id: string; effect: string }[], error: null }),
      ]);
      if (routePermsRes.error) throw routePermsRes.error;
      if (overridesRes.error)  throw overridesRes.error;

      const overrideMap: Record<string, 'grant' | 'deny'> = Object.fromEntries(
        (overridesRes.data ?? []).map((r) => [r.target_id, r.effect as 'grant' | 'deny'])
      );

      const routePerms = (routePermsRes.data ?? []).map((r) => ({
        route:         r.route,
        allowed_roles: r.allowed_roles as string[],
        user_effect:   overrideMap[r.route] ?? null,
      }));

      // Also include routes that only exist in overrides (grant to new route)
      for (const [target_id, effect] of Object.entries(overrideMap)) {
        if (!routePerms.find((r) => r.route === target_id)) {
          routePerms.push({ route: target_id, allowed_roles: [], user_effect: effect });
        }
      }

      return NextResponse.json({ routePerms });
    } catch (err: any) {
      console.error('[/api/permissions] internal routeperms error:', err);
      return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
    }
  }

  // ── All other requests require a NextAuth session ──────────────────────────
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userEmail = session.user?.email ?? null;

  try {
    // ── Menu permissions + user overrides ────────────────────────────────────
    // Returns: Array<{ menu_id, allowed_roles, is_enabled, user_effect }>
    if (type === 'menu') {
      const [menuRes, overridesRes] = await Promise.all([
        supabase.from('menu_permissions').select('menu_id, allowed_roles, is_enabled').order('sort_order'),
        userEmail
          ? supabase
              .from('user_permission_overrides')
              .select('target_id, effect')
              .eq('email', userEmail)
              .eq('target_type', 'menu')
          : Promise.resolve({ data: [] as { target_id: string; effect: string }[], error: null }),
      ]);
      if (menuRes.error)      throw menuRes.error;
      if (overridesRes.error) throw overridesRes.error;

      const overrideMap: Record<string, 'grant' | 'deny'> = Object.fromEntries(
        (overridesRes.data ?? []).map((r) => [r.target_id, r.effect as 'grant' | 'deny'])
      );

      const menuPerms = (menuRes.data ?? []).map((m) => ({
        menu_id:       m.menu_id,
        allowed_roles: m.allowed_roles as string[],
        is_enabled:    m.is_enabled as boolean,
        user_effect:   overrideMap[m.menu_id] ?? null,
      }));

      return NextResponse.json({ menuPerms });
    }

    // ── Route permissions + user overrides ───────────────────────────────────
    // Returns: Array<{ route, allowed_roles, user_effect }>
    if (type === 'routeperms') {
      const [routePermsRes, overridesRes] = await Promise.all([
        supabase.from('route_permissions').select('route, allowed_roles'),
        userEmail
          ? supabase
              .from('user_permission_overrides')
              .select('target_id, effect')
              .eq('email', userEmail)
              .eq('target_type', 'route')
          : Promise.resolve({ data: [] as { target_id: string; effect: string }[], error: null }),
      ]);
      if (routePermsRes.error) throw routePermsRes.error;
      if (overridesRes.error)  throw overridesRes.error;

      const overrideMap: Record<string, 'grant' | 'deny'> = Object.fromEntries(
        (overridesRes.data ?? []).map((r) => [r.target_id, r.effect as 'grant' | 'deny'])
      );

      const routePerms = (routePermsRes.data ?? []).map((r) => ({
        route:         r.route,
        allowed_roles: r.allowed_roles as string[],
        user_effect:   overrideMap[r.route] ?? null,
      }));

      // Routes that only exist as overrides (e.g. grant to unprotected route)
      for (const [target_id, effect] of Object.entries(overrideMap)) {
        if (!routePerms.find((r) => r.route === target_id)) {
          routePerms.push({ route: target_id, allowed_roles: [], user_effect: effect });
        }
      }

      return NextResponse.json({ routePerms });
    }

    // ── Admin page: all RBAC data ────────────────────────────────────────────
    if (type === 'admin-all') {
      const [usersRes, menuRes, routesRes, routePermsRes, hierarchyRes, overridesRes] =
        await Promise.all([
          supabase.from('user_roles').select('*').order('created_at', { ascending: false }),
          supabase.from('menu_permissions').select('*').order('sort_order'),
          supabase.from('protected_routes').select('*').order('sort_order'),
          supabase.from('route_permissions').select('*'),
          supabase.from('role_hierarchy').select('*'),
          supabase.from('user_permission_overrides').select('*'),
        ]);

      const errs = [usersRes, menuRes, routesRes, routePermsRes, hierarchyRes, overridesRes]
        .map((r) => r.error).filter(Boolean);
      if (errs.length) throw errs[0];

      return NextResponse.json({
        users:           usersRes.data      ?? [],
        menuPerms:       menuRes.data       ?? [],
        protectedRoutes: routesRes.data     ?? [],
        routePerms:      routePermsRes.data ?? [],
        hierarchy:       hierarchyRes.data  ?? [],
        overrides:       overridesRes.data  ?? [],
      });
    }

    // ── User-specific overrides for the logged-in user ───────────────────────
    if (type === 'user-perms') {
      const email = session.user?.email;
      if (!email) return NextResponse.json({ overrides: { route: {}, menu: {} } });

      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('target_type, target_id, effect')
        .eq('email', email);
      if (error) throw error;

      const overrides = {
        route: {} as Record<string, 'grant' | 'deny'>,
        menu:  {} as Record<string, 'grant' | 'deny'>,
      };
      for (const row of data ?? []) {
        overrides[row.target_type as 'route' | 'menu'][row.target_id] = row.effect;
      }
      return NextResponse.json({ overrides });
    }

    // ── Overrides for a specific user (admin editor) ─────────────────────────
    if (type === 'user-overrides') {
      const email = req.nextUrl.searchParams.get('email');
      if (!email) return NextResponse.json({ error: 'Provide ?email=' }, { status: 400 });

      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('email', email);
      if (error) throw error;
      return NextResponse.json({ overrides: data ?? [] });
    }

    return NextResponse.json(
      { error: 'Provide ?type=menu|routeperms|admin-all|user-perms|user-overrides' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[/api/permissions] GET error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ALLOWED = ['user_roles', 'menu_permissions', 'protected_routes', 'route_permissions', 'role_hierarchy', 'user_permission_overrides'];
  try {
    const { table, match, values } = await req.json();
    if (!ALLOWED.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    const supabase = getServiceClient();
    const { error } = await supabase.from(table).update(values).match(match);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[/api/permissions] PATCH error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ALLOWED = ['user_roles', 'protected_routes', 'route_permissions', 'role_hierarchy', 'user_permission_overrides'];
  try {
    const { table, values, upsert } = await req.json();
    if (!ALLOWED.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    const supabase = getServiceClient();
    const { data, error } = upsert
      ? await supabase.from(table).upsert(values).select().single()
      : await supabase.from(table).insert(values).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[/api/permissions] POST error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ALLOWED = ['user_roles', 'protected_routes', 'user_permission_overrides'];
  try {
    const { table, match } = await req.json();
    if (!ALLOWED.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    const supabase = getServiceClient();
    const { error } = await supabase.from(table).delete().match(match);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[/api/permissions] DELETE error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}