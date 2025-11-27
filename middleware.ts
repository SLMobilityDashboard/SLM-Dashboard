import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Additional middleware logic if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated
        const isAuthenticated = !!token;
        
        // Check if trying to access protected routes
        const isProtectedRoute = req.nextUrl.pathname.startsWith('/(protected)') ||
                                req.nextUrl.pathname.startsWith('/analytics') ||
                                req.nextUrl.pathname.startsWith('/battery') ||
                                req.nextUrl.pathname.startsWith('/charging') ||
                                req.nextUrl.pathname.startsWith('/complaints') ||
                                req.nextUrl.pathname.startsWith('/fleet') ||
                                req.nextUrl.pathname.startsWith('/gps') ||
                                req.nextUrl.pathname.startsWith('/motor') ||
                                req.nextUrl.pathname.startsWith('/predictive') ||
                                req.nextUrl.pathname.startsWith('/realtime') ||
                                req.nextUrl.pathname.startsWith('/revenue') ||
                                req.nextUrl.pathname.startsWith('/sales') ||
                                req.nextUrl.pathname.startsWith('/vehicles');
        
        // Allow access to auth pages and API routes
        if (req.nextUrl.pathname.startsWith('/auth') || 
            req.nextUrl.pathname.startsWith('/api/auth') ||
            req.nextUrl.pathname === '/') {
          return true;
        }
        
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};