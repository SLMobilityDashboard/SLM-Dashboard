// app/api/auth/config/route.ts
// Internal-only endpoint — protected by x-internal-secret header.
// Serves all auth config from Supabase: roles, hierarchy, routes, menu & route permissions.

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error('Missing Supabase env variables.');

  // Server-side client with service role key — no cookie handling needed
  // since this is a server-to-server internal endpoint
  return createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get('x-internal-secret') === process.env.INTERNAL_API_SECRET;
}

// GET /api/auth/config?email=foo@bar.com   → roles for that email
// GET /api/auth/config?type=hierarchy      → full role hierarchy map
// GET /api/auth/config?type=routes         → protected route prefixes (for middleware)
// GET /api/auth/config?type=menu           → menu_id → allowed_roles map
// GET /api/auth/config?type=routeperms     → route → allowed_roles map
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const type  = searchParams.get('type');
  const email = searchParams.get('email');

  const supabase = getServiceClient();

  try {
    // -- Role hierarchy --
    if (type === 'hierarchy') {
      const { data, error } = await supabase
        .from('role_hierarchy')
        .select('role, inherited_roles');
      if (error) throw error;

      const hierarchy = Object.fromEntries(
        data.map((r: { role: string; inherited_roles: string[] }) => [
          r.role,
          r.inherited_roles,
        ])
      );
      return NextResponse.json({ hierarchy });
    }

    // -- Protected route prefixes (used by middleware — just the path keys) --
    if (type === 'routes') {
      const { data, error } = await supabase
        .from('route_permissions')
        .select('route');
      if (error) throw error;

      return NextResponse.json({
        routes: data.map((r: { route: string }) => r.route),
      });
    }

    // -- Full route permissions map (used by hasRouteAccess in lib/roles.ts) --
    if (type === 'routeperms') {
      const { data, error } = await supabase
        .from('route_permissions')
        .select('route, allowed_roles');
      if (error) throw error;

      const routePerms = Object.fromEntries(
        data.map((r: { route: string; allowed_roles: string[] }) => [
          r.route,
          r.allowed_roles,
        ])
      );
      return NextResponse.json({ routePerms });
    }

    // -- Menu permissions map --
    if (type === 'menu') {
      const { data, error } = await supabase
        .from('menu_permissions')
        .select('menu_id, allowed_roles');
      if (error) throw error;

      const menuPerms = Object.fromEntries(
        data.map((r: { menu_id: string; allowed_roles: string[] }) => [
          r.menu_id,
          r.allowed_roles,
        ])
      );
      return NextResponse.json({ menuPerms });
    }

    // -- Roles for a specific email --
    if (email) {
      const { data, error } = await supabase
        .from('user_roles')
        .select('roles')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !data) return NextResponse.json({ roles: [] });
      return NextResponse.json({ roles: data.roles ?? [] });
    }

    return NextResponse.json(
      { error: 'Provide ?type=hierarchy|routes|routeperms|menu or ?email=...' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[/api/auth/config] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}