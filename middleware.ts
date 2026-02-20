// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ── Explicitly public — everything else is blocked by default ─────────────────
const PUBLIC_EXACT: string[] = ['/'];

const PUBLIC_PREFIXES = [
  '/auth',
  '/api/auth',
  '/debug',
  '/api/debug',
  '/api/prewarm-job',
  '/api/redis-clear',
  // ✅ /api/permissions removed — access mirrors /settings/rbac
];

const FORBIDDEN_REDIRECT = '/unauthorized';

// ── Maps API routes to their equivalent page route for RBAC lookup ────────────
const API_ROUTE_PAGE_MAP: Record<string, string> = {
  '/api/permissions': '/settings/rbac',
  // add more here if needed in future e.g:
  // '/api/users': '/settings/users',
};

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Always public ─────────────────────────────────────────────────────────
  if (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // ── 2. Internal middleware→API secret ────────────────────────────────────────
  const internalSecret = req.headers.get('x-internal-secret');
  if (
    internalSecret &&
    internalSecret === process.env.INTERNAL_API_SECRET &&
    pathname === '/api/permissions' &&
    req.nextUrl.searchParams.get('type') === 'routeperms'
  ) {
    return NextResponse.next();
  }

  // ── 3. Everything else requires a valid session ──────────────────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const signInUrl = new URL('/auth/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // ── 4. Authenticated API routes — skip RBAC unless mapped to a page route ───
  if (pathname.startsWith('/api/') && !API_ROUTE_PAGE_MAP[pathname]) {
    return NextResponse.next();
  }

  // ── 5. RBAC check — for pages AND mapped API routes ──────────────────────────
  const userRoles: string[] = (token.roles as string[]) ?? [];
  const userEmail: string   = (token.email as string)   ?? '';

  let routePerms: Array<{ route: string; allowed_roles: string[]; user_effect: 'grant' | 'deny' | null }> = [];
  try {
    const url = new URL('/api/permissions', req.nextUrl.origin);
    url.searchParams.set('type', 'routeperms');
    if (userEmail) url.searchParams.set('email', userEmail);

    const res = await fetch(url.toString(), {
      headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '' },
    });

    if (res.ok) {
      const data = await res.json();
      routePerms = data.routePerms ?? [];
    }
  } catch (err) {
    console.error('[middleware] Failed to fetch route permissions:', err);
  }

  const permsMap = Object.fromEntries(routePerms.map((r) => [r.route, r]));

  // ── If API route is mapped to a page route, look up the PAGE route entry ────
  const lookupPath = API_ROUTE_PAGE_MAP[pathname] ?? pathname;
  const entry      = findEntry(permsMap, lookupPath);

  // No restriction defined → allow authenticated users through
  if (!entry) return NextResponse.next();

  // User-level override — deny
  if (entry.user_effect === 'deny') {
    console.warn(`[middleware] Override DENY: ${userEmail} → ${pathname} (mapped from ${lookupPath})`);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL(FORBIDDEN_REDIRECT, req.url));
  }

  // User-level override — grant
  if (entry.user_effect === 'grant') {
    console.log(`[middleware] Override GRANT: ${userEmail} → ${pathname} (mapped from ${lookupPath})`);
    return NextResponse.next();
  }

  // Standard RBAC — empty allowed_roles means all authenticated users allowed
  if (entry.allowed_roles.length === 0) return NextResponse.next();

  const hasAccess = userRoles.some((role) => entry.allowed_roles.includes(role));
  if (!hasAccess) {
    console.warn(`[middleware] Access denied: ${userEmail} (${userRoles.join(', ')}) → ${pathname} (mapped from ${lookupPath})`);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL(FORBIDDEN_REDIRECT, req.url));
  }

  return NextResponse.next();
}

function findEntry(
  permsMap: Record<string, { route: string; allowed_roles: string[]; user_effect: 'grant' | 'deny' | null }>,
  pathname: string
) {
  if (permsMap[pathname]) return permsMap[pathname];

  const parts = pathname.split('/').filter(Boolean);
  for (let i = parts.length - 1; i > 0; i--) {
    const parent = '/' + parts.slice(0, i).join('/');
    if (permsMap[parent]) return permsMap[parent];
  }

  return null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};