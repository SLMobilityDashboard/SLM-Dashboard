// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasRouteAccess } from "@/lib/auth/roles";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Get user roles from token
    const userRoles = token?.roles as string[] | undefined;

    // Public routes that don't need role checking
    const publicRoutes = ['/auth', '/api/auth', '/'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Check if user has access to the route based on their roles
    if (!hasRouteAccess(userRoles, pathname)) {
      // Redirect to unauthorized page or dashboard
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated
        const isAuthenticated = !!token;
        
        const pathname = req.nextUrl.pathname;
        
        // Allow access to auth pages and API routes
        if (pathname.startsWith('/auth') || 
            pathname.startsWith('/api/auth') ||
            pathname === '/') {
          return true;
        }
        
        // List of protected route prefixes
        const protectedPrefixes = [
          '/analytics', '/battery', '/charging', '/complaints',
          '/fleet', '/gps', '/motor', '/predictive', '/realtime',
          '/revenue', '/sales', '/vehicles', '/adhoc'
        ];
        
        const isProtectedRoute = protectedPrefixes.some(prefix => 
          pathname.startsWith(prefix)
        );
        
        // Require authentication for protected routes
        if (isProtectedRoute) {
          return isAuthenticated;
        }
        
        return true;
      },
    },
    pages: {
      signIn: '/auth/sign-in',
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};