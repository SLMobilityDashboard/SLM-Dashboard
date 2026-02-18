// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PREFIXES    = ['/auth', '/api/'];
const PUBLIC_EXACT       = ['/'];
const FORBIDDEN_REDIRECT = '/unauthorized';

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const signInUrl = new URL('/auth/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signInUrl);
  }

  const userRoles: string[] = (token.roles as string[]) ?? [];
  const userEmail: string   = (token.email as string)   ?? '';

  // Fetch route perms from the EXISTING endpoint, passing email for overrides
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

  // Build a map for O(1) lookup
  const permsMap = Object.fromEntries(
    routePerms.map((r) => [r.route, r])
  );

  const entry = findEntry(permsMap, pathname);

  // No restriction defined → allow
  if (!entry) return NextResponse.next();

  // Route override — checked independently of menu overrides
  if (entry.user_effect === 'deny') {
    console.warn(`[middleware] Override DENY: ${userEmail} → ${pathname}`);
    return NextResponse.redirect(new URL(FORBIDDEN_REDIRECT, req.url));
  }

  if (entry.user_effect === 'grant') {
    return NextResponse.next();
  }

  // Standard RBAC
  if (entry.allowed_roles.length === 0) return NextResponse.next();

  const hasAccess = userRoles.some((role) => entry.allowed_roles.includes(role));
  if (!hasAccess) {
    console.warn(`[middleware] Access denied: ${userEmail} (${userRoles.join(',')}) → ${pathname}`);
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