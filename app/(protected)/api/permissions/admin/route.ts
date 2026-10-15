// app/api/permissions/admin/route.ts
//
// POST / PATCH / DELETE — Admin role ONLY.
// All write operations on permission tables live here.
// A non-Admin who calls any of these gets 403.

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

async function requireAdminSession(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const roles: string[] = (session.user as any)?.roles ?? [];
  if (!roles.includes('Admin')) return null;
  return session;
}

function logDenied(method: string, email: string, reason: string, ip?: string | null) {
  console.warn(
    `[permissions/admin] DENIED | method=${method} user=${email} ip=${ip ?? 'unknown'} reason="${reason}"`
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
        if (values?.roles) parts.push(`roles set to: ${(values.roles as string[]).join(', ') || 'none'}`);
        if ('display_name' in (values ?? {})) parts.push(`name set to: ${values!.display_name ?? '(cleared)'}`);
        return `${by} updated ${target} — ${parts.join('; ')}`;
      }
      if (action === 'DELETE') {
        return `${by} deleted ${match?.id ? `user ID ${match.id}` : 'a user'}`;
      }
      break;
    }
    case 'menu_permissions': {
      const menuId = match?.menu_id ?? values?.menu_id ?? 'unknown section';
      if (action === 'PATCH') {
        const parts: string[] = [];
        if ('is_enabled' in (values ?? {})) parts.push(values!.is_enabled ? 'enabled' : 'disabled');
        if (values?.allowed_roles !== undefined) {
          parts.push(`visible to: ${(values.allowed_roles as string[]).join(', ') || 'all roles'}`);
        }
        return `${by} updated menu section "${menuId}" — ${parts.join(', ')}`;
      }
      break;
    }
    case 'protected_routes': {
      if (action === 'POST') {
        const path = values?.path_prefix ?? 'unknown path';
        const desc = values?.description ? ` (${values.description})` : '';
        return `${by} added protected route ${path}${desc}`;
      }
      if (action === 'PATCH') {
        const routeId = match?.id ?? 'unknown route';
        if ('is_enabled' in (values ?? {})) return `${by} ${values!.is_enabled ? 'enabled' : 'disabled'} route ID ${routeId}`;
        return `${by} updated route ID ${routeId}`;
      }
      if (action === 'DELETE') return `${by} deleted route ID ${match?.id ?? 'unknown'}`;
      break;
    }
    case 'route_permissions': {
      const route = match?.route ?? values?.route ?? 'unknown route';
      if (action === 'POST') return `${by} set route "${route}" access to: ${(values?.allowed_roles as string[] | undefined)?.join(', ') || 'all roles'}`;
      if (action === 'PATCH') return `${by} updated route "${route}" access to: ${(values?.allowed_roles as string[] | undefined)?.join(', ') || 'all roles'}`;
      if (action === 'DELETE') return `${by} removed access rules for route "${route}"`;
      break;
    }
    case 'role_hierarchy': {
      const role      = values?.role ?? match?.role ?? 'unknown role';
      const inherited = (values?.inherited_roles as string[] | undefined)?.join(', ') || 'none';
      if (action === 'POST')  return `${by} set role hierarchy — "${role}" now inherits: ${inherited}`;
      if (action === 'PATCH') return `${by} updated role hierarchy — "${role}" inherits: ${inherited}`;
      break;
    }
    case 'user_permission_overrides': {
      if (action === 'POST') {
        const verb = values?.effect === 'deny' ? 'blocked from' : 'granted access to';
        return `${by} ${verb} ${values?.email ?? 'unknown user'} for ${values?.target_type ?? 'resource'} "${values?.target_id ?? 'unknown'}"`;
      }
      if (action === 'PATCH') {
        if (values?.effect) {
          return `${by} changed override ID ${match?.id ?? 'unknown'} to: ${values.effect === 'deny' ? 'blocked' : 'granted'}`;
        }
        return `${by} updated override ID ${match?.id ?? 'unknown'}`;
      }
      if (action === 'DELETE') return `${by} removed override ID ${match?.id ?? 'unknown'}`;
      break;
    }
  }

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

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const ip      = req.headers.get('x-forwarded-for') ?? null;
  const session = await requireAdminSession(req);
  if (!session) {
    logDenied('PATCH', 'unauthenticated or non-admin', 'Not Admin or no session', ip);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const performedBy = session.user?.email ?? 'unknown';
  const ALLOWED     = ['user_roles', 'menu_permissions', 'protected_routes', 'route_permissions', 'role_hierarchy', 'user_permission_overrides'];

  try {
    const { table, match, values } = await req.json();

    if (!ALLOWED.includes(table)) {
      logDenied('PATCH', performedBy, `Table not in allowlist: "${table}"`, ip);
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    console.log(`[permissions/admin] PATCH | user=${performedBy} table=${table} match=${JSON.stringify(match)} ip=${ip}`);

    const supabase = getServiceClient();
    const { error } = await supabase.from(table).update(values).match(match);
    if (error) throw error;

    await writeAudit(supabase, { performed_by: performedBy, action: 'PATCH', target_table: table, target_match: match, new_values: values, ip_address: ip });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[/api/permissions/admin] PATCH error | user=${performedBy} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip      = req.headers.get('x-forwarded-for') ?? null;
  const session = await requireAdminSession(req);
  if (!session) {
    logDenied('POST', 'unauthenticated or non-admin', 'Not Admin or no session', ip);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const performedBy = session.user?.email ?? 'unknown';
  const ALLOWED     = ['user_roles', 'protected_routes', 'route_permissions', 'role_hierarchy', 'user_permission_overrides'];

  try {
    const { table, values, upsert } = await req.json();

    if (!ALLOWED.includes(table)) {
      logDenied('POST', performedBy, `Table not in allowlist: "${table}"`, ip);
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    console.log(`[permissions/admin] POST | user=${performedBy} table=${table} upsert=${!!upsert} ip=${ip}`);

    const supabase = getServiceClient();
    const { data, error } = upsert
      ? await supabase.from(table).upsert(values).select().single()
      : await supabase.from(table).insert(values).select().single();
    if (error) throw error;

    await writeAudit(supabase, { performed_by: performedBy, action: 'POST', target_table: table, target_match: null, new_values: values, ip_address: ip });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error(`[/api/permissions/admin] POST error | user=${performedBy} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const ip      = req.headers.get('x-forwarded-for') ?? null;
  const session = await requireAdminSession(req);
  if (!session) {
    logDenied('DELETE', 'unauthenticated or non-admin', 'Not Admin or no session', ip);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const performedBy = session.user?.email ?? 'unknown';
  const ALLOWED     = ['user_roles', 'protected_routes', 'user_permission_overrides'];

  try {
    const { table, match } = await req.json();

    if (!ALLOWED.includes(table)) {
      logDenied('DELETE', performedBy, `Table not in allowlist: "${table}"`, ip);
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    console.log(`[permissions/admin] DELETE | user=${performedBy} table=${table} match=${JSON.stringify(match)} ip=${ip}`);

    const supabase = getServiceClient();
    const { error } = await supabase.from(table).delete().match(match);
    if (error) throw error;

    await writeAudit(supabase, { performed_by: performedBy, action: 'DELETE', target_table: table, target_match: match, new_values: null, ip_address: ip });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[/api/permissions/admin] DELETE error | user=${performedBy} ip=${ip}:`, err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}