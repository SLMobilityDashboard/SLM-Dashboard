// lib/auth.ts
import { getServerSession as nextAuthGetServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";

/**
 * Wrapper around getServerSession that works reliably in App Router
 * Use this instead of importing getServerSession directly
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    const session = await nextAuthGetServerSession(authOptions);
    
    if (session) {
      console.log("[Auth Helper] Session found for:", session.user?.email);
    } else {
      console.log("[Auth Helper] No session found");
    }
    
    return session;
  } catch (error) {
    console.error("[Auth Helper] Error getting session:", error);
    return null;
  }
}

/**
 * Get current user from session or throw error
 */
export async function requireAuth(): Promise<Session> {
  const session = await getServerSession();
  
  if (!session || !session.user || !session.user.email) {
    throw new Error("Unauthorized - Please sign in");
  }
  
  return session;
}

/**
 * Get current user's email from session
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.email || null;
}

/**
 * Get current user's roles from session
 */
export async function getCurrentUserRoles(): Promise<string[]> {
  const session = await getServerSession();
  return session?.user?.roles || [];
}

/**
 * Check if current user has a specific role
 */
export async function hasRole(role: string): Promise<boolean> {
  const roles = await getCurrentUserRoles();
  return roles.includes(role);
}

/**
 * Check if current user has any of the specified roles
 */
export async function hasAnyRole(requiredRoles: string[]): Promise<boolean> {
  const userRoles = await getCurrentUserRoles();
  return requiredRoles.some(role => userRoles.includes(role));
}