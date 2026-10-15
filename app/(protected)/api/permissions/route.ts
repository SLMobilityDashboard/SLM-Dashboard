// app/api/permissions/route.ts
//
// GET only — accessible by ALL authenticated users.
//
// ?type=menu         → any authenticated user (own overrides merged in)
// ?type=routeperms   → any authenticated user (own overrides merged in)
//                      also accepts x-internal-secret for middleware bypass
// ?type=user-perms   → any authenticated user (own overrides only)
// ?type=admin-all    → Admin role only
// ?type=user-overrides → Admin role only
// ?type=audit        → Admin role only
//
// POST / PATCH / DELETE → /api/permissions/admin/route.ts (Admin only)

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

function isAdmin(session: NonNullable<Awaited<ReturnType<typeof requireSession>>>): boolean {
  const roles: string[] = (session.user as any)?.roles ?? [];
  return roles.includes('Admin');
}

function logDenied(method: string, type: string | null, email: string, reason: string, ip?: string | null) {
  console.warn(
    `[permissions] DENIED | method=${method} type=${type ?? 'n/a'} user=${email} ip=${ip ?? 'unknown'} reason="${reason}"`
  );
}

export async function GET(req: NextRequest) {
  const type     = req.nextUrl.searchParams.get('type');
  const supabase = getServiceClient();
  const ip       = req.headers.get('x-forwarded-for') ?? null;

  // ── Internal secret bypass — middleware fetching routeperms ──────────────
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

  // ── All other requests require a valid session ────────────────────────────
  const session = await requireSession();
  if (!session) {
    logDenied('GET', type, 'unauthenticated', 'No active session', ip);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = session.user?.email ?? 'unknown';

  try {

    // ── menu — any authenticated user ─────────────────────────────────────
    if (type === 'menu') {
      console.log(`[permissions] GET menu | user=${userEmail} ip=${ip}`);

      const [menuRes, overridesRes] = await Promise.all([
        supabase.from('menu_permissions').select('menu_id, allowed_roles, is_enabled').order('sort_order'),
        supabase
          .from('user_permission_overrides')
          .select('target_id, effect')
          .eq('email', userEmail)
          .eq('target_type', 'menu'),
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

    // ── routeperms — any authenticated user ───────────────────────────────
    if (type === 'routeperms') {
      console.log(`[permissions] GET routeperms | user=${userEmail} ip=${ip}`);

      const [routePermsRes, overridesRes] = await Promise.all([
        supabase.from('route_permissions').select('route, allowed_roles'),
        supabase
          .from('user_permission_overrides')
          .select('target_id, effect')
          .eq('email', userEmail)
          .eq('target_type', 'route'),
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

      for (const [target_id, effect] of Object.entries(overrideMap)) {
        if (!routePerms.find((r) => r.route === target_id)) {
          routePerms.push({ route: target_id, allowed_roles: [], user_effect: effect });
        }
      }

      return NextResponse.json({ routePerms });
    }

    // ── user-perms — any authenticated user, own data only ────────────────
    if (type === 'user-perms') {
      console.log(`[permissions] GET user-perms | user=${userEmail} ip=${ip}`);

      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('target_type, target_id, effect')
        .eq('email', userEmail);
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

    // ── Admin-only GET types ──────────────────────────────────────────────
    if (type === 'admin-all' || type === 'user-overrides' || type === 'audit') {
      if (!isAdmin(session)) {
        logDenied('GET', type, userEmail, 'Not an Admin', ip);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (type === 'admin-all') {
      console.log(`[permissions] GET admin-all | user=${userEmail} ip=${ip}`);

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

    if (type === 'user-overrides') {
      const email = req.nextUrl.searchParams.get('email');
      if (!email) {
        logDenied('GET', type, userEmail, 'Missing ?email= query param', ip);
        return NextResponse.json({ error: 'Provide ?email=' }, { status: 400 });
      }
      console.log(`[permissions] GET user-overrides | user=${userEmail} target=${email} ip=${ip}`);

      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('email', email);
      if (error) throw error;
      return NextResponse.json({ overrides: data ?? [] });
    }

    if (type === 'audit') {
      const page     = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')     ?? '1'));
      const pageSize = Math.min(100, parseInt(req.nextUrl.searchParams.get('pageSize') ?? '20'));
      const search   = req.nextUrl.searchParams.get('search') ?? '';
      const action   = req.nextUrl.searchParams.get('action') ?? '';
      const table    = req.nextUrl.searchParams.get('table')  ?? '';
      const offset   = (page - 1) * pageSize;

      console.log(`[permissions] GET audit | user=${userEmail} page=${page} ip=${ip}`);

      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (search) query = query.ilike('performed_by', `%${search}%`);
      if (action) query = query.eq('action', action);
      if (table)  query = query.eq('target_table', table);

      const { data, error, count } = await query;
      if (error) throw error;

      return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
    }

    logDenied('GET', type, userEmail, `Unknown type param: "${type}"`, ip);
    return NextResponse.json(
      { error: 'Provide ?type=menu|routeperms|user-perms|admin-all|user-overrides|audit' },
      { status: 400 }
    );

  } catch (err: any) {
    console.error(`[/api/permissions] GET error | user=${userEmail} type=${type} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}