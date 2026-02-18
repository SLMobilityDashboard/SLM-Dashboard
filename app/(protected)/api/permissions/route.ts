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
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = req.nextUrl.searchParams.get('type');
  const supabase = getServiceClient();

  try {
    // Sidebar menu permissions map (used by lib/roles.ts)
    if (type === 'menu') {
      const { data, error } = await supabase
        .from('menu_permissions')
        .select('menu_id, allowed_roles');
      if (error) throw error;
      const menuPerms = Object.fromEntries(data.map((r: any) => [r.menu_id, r.allowed_roles]));
      return NextResponse.json({ menuPerms });
    }

    // Route permissions map (used by lib/roles.ts)
    if (type === 'routeperms') {
      const { data, error } = await supabase
        .from('route_permissions')
        .select('route, allowed_roles');
      if (error) throw error;
      const routePerms = Object.fromEntries(data.map((r: any) => [r.route, r.allowed_roles]));
      return NextResponse.json({ routePerms });
    }

    // All RBAC data for the admin page
    if (type === 'admin-all') {
      const [usersRes, menuRes, routesRes, routePermsRes, hierarchyRes] = await Promise.all([
        supabase.from('user_roles').select('*').order('created_at', { ascending: false }),
        supabase.from('menu_permissions').select('*').order('sort_order'),
        supabase.from('protected_routes').select('*').order('sort_order'),
        supabase.from('route_permissions').select('*'),
        supabase.from('role_hierarchy').select('*'),
      ]);

      // Surface any Supabase errors clearly
      const errs = [usersRes, menuRes, routesRes, routePermsRes, hierarchyRes]
        .map((r) => r.error)
        .filter(Boolean);
      if (errs.length) throw errs[0];

      return NextResponse.json({
        users:           usersRes.data       ?? [],
        menuPerms:       menuRes.data        ?? [],
        protectedRoutes: routesRes.data      ?? [],
        routePerms:      routePermsRes.data  ?? [],
        hierarchy:       hierarchyRes.data   ?? [],
      });
    }

    return NextResponse.json({ error: 'Provide ?type=menu|routeperms|admin-all' }, { status: 400 });
  } catch (err: any) {
    console.error('[/api/permissions] GET error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH — update rows ───────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ALLOWED = ['user_roles', 'menu_permissions', 'protected_routes', 'route_permissions', 'role_hierarchy'];

  try {
    const { table, match, values } = await req.json();
    if (!ALLOWED.includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

    const supabase = getServiceClient();
    const { error } = await supabase.from(table).update(values).match(match);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[/api/permissions] PATCH error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── POST — insert or upsert rows ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ALLOWED = ['user_roles', 'protected_routes', 'route_permissions', 'role_hierarchy'];

  try {
    const { table, values, upsert } = await req.json();
    if (!ALLOWED.includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

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

// ── DELETE — remove rows ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only allow deleting from these two tables — route_permissions is handled
  // automatically via FK cascade when a protected_route is deleted.
  const ALLOWED = ['user_roles', 'protected_routes'];

  try {
    const { table, match } = await req.json();
    if (!ALLOWED.includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

    const supabase = getServiceClient();
    const { error } = await supabase.from(table).delete().match(match);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[/api/permissions] DELETE error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}