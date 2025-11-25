// ============================================
// 4. Protected Route Component
// components/ProtectedRoute.tsx
// ============================================

"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { hasRouteAccess } from "@/lib/auth/roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    // If not authenticated, redirect to sign in
    if (status === "unauthenticated") {
      router.push(
        `/auth/sign-in?callbackUrl=${encodeURIComponent(pathname || "/")}`
      );
      return;
    }

    // If authenticated, check route access
    if (status === "authenticated") {
      const userRoles = session?.user?.roles || [];

      if (!hasRouteAccess(userRoles, pathname || "/")) {
        // User doesn't have access, redirect to unauthorized page
        router.push("/unauthorized");
      }
    }
  }, [status, session, pathname, router]);

  // Show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (status === "unauthenticated") {
    return null;
  }

  // Check if user has access
  const userRoles = session?.user?.roles || [];
  if (!hasRouteAccess(userRoles, pathname || "/")) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
