// app/api/permissions/route.ts

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

// ── Denial logger ─────────────────────────────────────────────────────────────
function logDenied(
  method: string,
  type: string | null,
  email: string,
  reason: string,
  ip?: string | null
) {
  console.warn(
    `[permissions] DENIED | method=${method} type=${type ?? 'n/a'} user=${email} ip=${ip ?? 'unknown'} reason="${reason}"`
  );
}

// ── Human-readable description generator ─────────────────────────────────────
function generateDescription(
  action: 'POST' | 'PATCH' | 'DELETE',
  table: string,
  match: Record<string, unknown> | null,
  values: Record<string, unknown> | null,
  performedBy: string
): string {
  const by = performedBy;

  switch (table) {

    // ── user_roles ──────────────────────────────────────────────────────────
    case 'user_roles': {
      if (action === 'POST') {
        const email = values?.email ?? 'unknown';
        const roles = (values?.roles as string[] | undefined)?.join(', ') || 'no roles';
        const name  = values?.display_name ? ` (${values.display_name})` : '';
        return `${by} created user ${email}${name} with roles: ${roles}`;
      }
      if (action === 'PATCH') {
        const target = match?.id ? `user ID ${match.id}` : 'a user';
        const parts: string[] = [];
        if (values?.roles) {
          const roles = (values.roles as string[]).join(', ') || 'none';
          parts.push(`roles set to: ${roles}`);
        }
        if ('display_name' in (values ?? {})) {
          parts.push(`name set to: ${values!.display_name ?? '(cleared)'}`);
        }
        return `${by} updated ${target} — ${parts.join('; ')}`;
      }
      if (action === 'DELETE') {
        const target = match?.id ? `user ID ${match.id}` : 'a user';
        return `${by} deleted ${target}`;
      }
      break;
    }

    // ── menu_permissions ────────────────────────────────────────────────────
    case 'menu_permissions': {
      const menuId = match?.menu_id ?? values?.menu_id ?? 'unknown section';
      if (action === 'PATCH') {
        const parts: string[] = [];
        if ('is_enabled' in (values ?? {})) {
          parts.push(values!.is_enabled ? 'enabled' : 'disabled');
        }
        if (values?.allowed_roles !== undefined) {
          const roles = (values.allowed_roles as string[]).join(', ') || 'all roles';
          parts.push(`visible to: ${roles}`);
        }
        return `${by} updated menu section "${menuId}" — ${parts.join(', ')}`;
      }
      break;
    }

    // ── protected_routes ────────────────────────────────────────────────────
    case 'protected_routes': {
      if (action === 'POST') {
        const path = values?.path_prefix ?? 'unknown path';
        const desc = values?.description ? ` (${values.description})` : '';
        return `${by} added protected route ${path}${desc}`;
      }
      if (action === 'PATCH') {
        const routeId = match?.id ?? 'unknown route';
        if ('is_enabled' in (values ?? {})) {
          return `${by} ${values!.is_enabled ? 'enabled' : 'disabled'} route ID ${routeId}`;
        }
        return `${by} updated route ID ${routeId}`;
      }
      if (action === 'DELETE') {
        return `${by} deleted route ID ${match?.id ?? 'unknown'}`;
      }
      break;
    }

    // ── route_permissions ───────────────────────────────────────────────────
    case 'route_permissions': {
      const route = match?.route ?? values?.route ?? 'unknown route';
      if (action === 'POST') {
        const roles = (values?.allowed_roles as string[] | undefined)?.join(', ') || 'all roles';
        return `${by} set route "${route}" access to: ${roles}`;
      }
      if (action === 'PATCH') {
        const roles = (values?.allowed_roles as string[] | undefined)?.join(', ') || 'all roles';
        return `${by} updated route "${route}" access to: ${roles}`;
      }
      if (action === 'DELETE') {
        return `${by} removed access rules for route "${route}"`;
      }
      break;
    }

    // ── role_hierarchy ──────────────────────────────────────────────────────
    case 'role_hierarchy': {
      const role = values?.role ?? match?.role ?? 'unknown role';
      if (action === 'POST') {
        const inherited = (values?.inherited_roles as string[] | undefined)?.join(', ') || 'none';
        return `${by} set role hierarchy — "${role}" now inherits: ${inherited}`;
      }
      if (action === 'PATCH') {
        const inherited = (values?.inherited_roles as string[] | undefined)?.join(', ') || 'none';
        return `${by} updated role hierarchy — "${role}" inherits: ${inherited}`;
      }
      break;
    }

    // ── user_permission_overrides ───────────────────────────────────────────
    case 'user_permission_overrides': {
      if (action === 'POST') {
        const email      = values?.email      ?? 'unknown user';
        const effect     = values?.effect     ?? 'unknown';
        const targetType = values?.target_type ?? 'resource';
        const targetId   = values?.target_id  ?? 'unknown';
        const verb       = effect === 'deny' ? 'blocked from' : 'granted access to';
        return `${by} ${verb} ${email} for ${targetType} "${targetId}"`;
      }
      if (action === 'PATCH') {
        const newEffect = values?.effect;
        if (newEffect) {
          const verb = newEffect === 'deny' ? 'blocked' : 'granted';
          return `${by} changed override ID ${match?.id ?? 'unknown'} to: ${verb}`;
        }
        return `${by} updated override ID ${match?.id ?? 'unknown'}`;
      }
      if (action === 'DELETE') {
        return `${by} removed override ID ${match?.id ?? 'unknown'}`;
      }
      break;
    }
  }

  // Fallback for anything unhandled
  return `${by} performed ${action} on ${table}`;
}

// ── Audit helper ──────────────────────────────────────────────────────────────
async function writeAudit(
  supabase: ReturnType<typeof getServiceClient>,
  params: {
    performed_by: string;
    action:       'POST' | 'PATCH' | 'DELETE';
    target_table: string;
    target_match?: Record<string, unknown> | null;
    new_values?:   Record<string, unknown> | null;
    ip_address?:   string | null;
  }
) {
  try {
    const description = generateDescription(
      params.action,
      params.target_table,
      params.target_match ?? null,
      params.new_values   ?? null,
      params.performed_by
    );

    const { error } = await supabase.from('audit_log').insert({
      performed_by:  params.performed_by,
      action:        params.action,
      target_table:  params.target_table,
      target_match:  params.target_match  ?? null,
      new_values:    params.new_values    ?? null,
      ip_address:    params.ip_address    ?? null,
      description,
    });
    if (error) console.error('[audit] Insert failed:', error.message);
  } catch (err) {
    console.error('[audit] Unexpected error:', err);
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const type     = req.nextUrl.searchParams.get('type');
  const supabase = getServiceClient();
  const ip       = req.headers.get('x-forwarded-for') ?? null;

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

  // ── All other GET requests require a valid session ────────────────────────
  const session = await requireSession();
  if (!session) {
    logDenied('GET', type, 'unauthenticated', 'No active session', ip);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = session.user?.email ?? 'unknown';

  try {
    if (type === 'menu') {
      console.log(`[permissions] GET menu | user=${userEmail} ip=${ip}`);
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

    if (type === 'routeperms') {
      console.log(`[permissions] GET routeperms | user=${userEmail} ip=${ip}`);
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

      for (const [target_id, effect] of Object.entries(overrideMap)) {
        if (!routePerms.find((r) => r.route === target_id)) {
          routePerms.push({ route: target_id, allowed_roles: [], user_effect: effect });
        }
      }

      return NextResponse.json({ routePerms });
    }

    if (type === 'admin-all') {
      // ✅ No Admin check — access controlled by middleware/overrides
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

    if (type === 'user-perms') {
      const email = session.user?.email;
      if (!email) {
        logDenied('GET', type, userEmail, 'No email in session', ip);
        return NextResponse.json({ overrides: { route: {}, menu: {} } });
      }

      console.log(`[permissions] GET user-perms | user=${userEmail} ip=${ip}`);

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

    if (type === 'user-overrides') {
      // ✅ No Admin check — access controlled by middleware/overrides
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
      // ✅ No Admin check — access controlled by middleware/overrides
      const page     = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')     ?? '1'));
      const pageSize = Math.min(100, parseInt(req.nextUrl.searchParams.get('pageSize') ?? '20'));
      const search   = req.nextUrl.searchParams.get('search') ?? '';
      const action   = req.nextUrl.searchParams.get('action') ?? '';
      const table    = req.nextUrl.searchParams.get('table')  ?? '';
      const offset   = (page - 1) * pageSize;

      console.log(`[permissions] GET audit | user=${userEmail} page=${page} pageSize=${pageSize} search="${search}" action="${action}" table="${table}" ip=${ip}`);

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

      return NextResponse.json({
        data:     data ?? [],
        total:    count ?? 0,
        page,
        pageSize,
      });
    }

    // Unknown type
    logDenied('GET', type, userEmail, `Unknown or missing type param: "${type}"`, ip);
    return NextResponse.json(
      { error: 'Provide ?type=menu|routeperms|admin-all|user-perms|user-overrides|audit' },
      { status: 400 }
    );

  } catch (err: any) {
    console.error(`[/api/permissions] GET error | user=${userEmail} type=${type} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const ip      = req.headers.get('x-forwarded-for') ?? null;

  if (!session) {
    logDenied('PATCH', null, 'unauthenticated', 'No active session', ip);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ No Admin check — access controlled by middleware/overrides
  const performedBy = session.user?.email ?? 'unknown';

  const ALLOWED = ['user_roles', 'menu_permissions', 'protected_routes', 'route_permissions', 'role_hierarchy', 'user_permission_overrides'];

  try {
    const { table, match, values } = await req.json();

    if (!ALLOWED.includes(table)) {
      logDenied('PATCH', null, performedBy, `Table not in allowlist: "${table}"`, ip);
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    console.log(`[permissions] PATCH | user=${performedBy} table=${table} match=${JSON.stringify(match)} ip=${ip}`);

    const supabase = getServiceClient();
    const { error } = await supabase.from(table).update(values).match(match);
    if (error) throw error;

    await writeAudit(supabase, {
      performed_by: performedBy,
      action:       'PATCH',
      target_table: table,
      target_match: match,
      new_values:   values,
      ip_address:   ip,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[/api/permissions] PATCH error | user=${performedBy} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const ip      = req.headers.get('x-forwarded-for') ?? null;

  if (!session) {
    logDenied('POST', null, 'unauthenticated', 'No active session', ip);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ No Admin check — access controlled by middleware/overrides
  const performedBy = session.user?.email ?? 'unknown';

  const ALLOWED = ['user_roles', 'protected_routes', 'route_permissions', 'role_hierarchy', 'user_permission_overrides'];

  try {
    const { table, values, upsert } = await req.json();

    if (!ALLOWED.includes(table)) {
      logDenied('POST', null, performedBy, `Table not in allowlist: "${table}"`, ip);
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    console.log(`[permissions] POST | user=${performedBy} table=${table} upsert=${!!upsert} ip=${ip}`);

    const supabase = getServiceClient();
    const { data, error } = upsert
      ? await supabase.from(table).upsert(values).select().single()
      : await supabase.from(table).insert(values).select().single();
    if (error) throw error;

    await writeAudit(supabase, {
      performed_by: performedBy,
      action:       'POST',
      target_table: table,
      target_match: null,
      new_values:   values,
      ip_address:   ip,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error(`[/api/permissions] POST error | user=${performedBy} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const ip      = req.headers.get('x-forwarded-for') ?? null;

  if (!session) {
    logDenied('DELETE', null, 'unauthenticated', 'No active session', ip);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ No Admin check — access controlled by middleware/overrides
  const performedBy = session.user?.email ?? 'unknown';

  const ALLOWED = ['user_roles', 'protected_routes', 'user_permission_overrides'];

  try {
    const { table, match } = await req.json();

    if (!ALLOWED.includes(table)) {
      logDenied('DELETE', null, performedBy, `Table not in allowlist: "${table}"`, ip);
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    console.log(`[permissions] DELETE | user=${performedBy} table=${table} match=${JSON.stringify(match)} ip=${ip}`);

    const supabase = getServiceClient();
    const { error } = await supabase.from(table).delete().match(match);
    if (error) throw error;

    await writeAudit(supabase, {
      performed_by: performedBy,
      action:       'DELETE',
      target_table: table,
      target_match: match,
      new_values:   null,
      ip_address:   ip,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[/api/permissions] DELETE error | user=${performedBy} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}