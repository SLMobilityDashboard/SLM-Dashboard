// app/api/permissions/routes/route.ts
// Internal-only endpoint for middleware to fetch route→roles map.
// Protected by x-internal-secret — not for client use.

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get('x-internal-secret') === process.env.INTERNAL_API_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
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
  } catch (err) {
    console.error('[/api/permissions/routes] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}