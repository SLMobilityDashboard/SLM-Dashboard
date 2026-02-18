// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PREFIXES = ['/auth', '/api/'];
const PUBLIC_EXACT    = ['/'];

// Redirect unauthorized users here
const FORBIDDEN_REDIRECT = '/auth/sign-in';

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow public paths
  if (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // 2. Get session token — contains roles assigned at sign-in
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 3. Not logged in — redirect to sign in
  if (!token) {
    const signInUrl = new URL('/auth/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signInUrl);
  }

  const userRoles: string[] = (token.roles as string[]) ?? [];

  // 4. Fetch route permissions from internal API
  //    We use the internal secret here — this is server-side middleware, so it's available
  let routePerms: Record<string, string[]> = {};
  try {
    const res = await fetch(
      `${req.nextUrl.origin}/api/permissions/routes`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
        },
        // Cache for 60s to avoid hitting DB on every request
        // @ts-ignore — Next.js extended fetch
        next: { revalidate: 60 },
      }
    );
    if (res.ok) {
      const data = await res.json();
      routePerms = data.routePerms ?? {};
    }
  } catch (err) {
    console.error('[middleware] Failed to fetch route permissions:', err);
    // Fail open for non-sensitive paths — user is at least authenticated
  }

  // 5. Check if this path has role restrictions
  const allowedRoles = findAllowedRoles(routePerms, pathname);

  // No restriction defined for this path — allow authenticated user through
  if (!allowedRoles) return NextResponse.next();

  // 6. Check if user has at least one allowed role
  const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    console.warn(
      `[middleware] Access denied: ${token.email} (${userRoles.join(',')}) → ${pathname}`
    );
    // Redirect to a 403 page or back to home
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

/**
 * Find allowed roles for a pathname.
 * Checks exact match first, then walks up to parent routes.
 * Returns null if no restriction is defined (allow all authenticated users).
 */
function findAllowedRoles(
  routePerms: Record<string, string[]>,
  pathname: string
): string[] | null {
  // Exact match
  if (routePerms[pathname]) return routePerms[pathname];

  // Walk up: /revenue/analytics → /revenue
  const parts = pathname.split('/').filter(Boolean);
  for (let i = parts.length - 1; i > 0; i--) {
    const parent = '/' + parts.slice(0, i).join('/');
    if (routePerms[parent]) return routePerms[parent];
  }

  return null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};