// lib/auth/role-mappings.ts

/**
 * Define available roles in the system.
 * Currently active: Admin, FactoryManager, QA
 * Future roles: Manager, Analyst, Viewer
 */
export type Role = 'Admin' | 'Manager' | 'Analyst' | 'Viewer' | 'FactoryManager' | 'QA';

// ---------------------------------------------------------------------------
// Internal API helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

function internalHeaders(): HeadersInit {
  return {
    'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
  };
}

// ---------------------------------------------------------------------------
// Data-fetching functions (all async, all via internal API)
// ---------------------------------------------------------------------------

/**
 * Fetch the full role hierarchy from Supabase via the internal config API.
 * Cached for 60s — hierarchy changes are rare but should propagate quickly.
 *
 * Returns a map of role → roles it grants, e.g.:
 *   { Admin: ['Admin', 'Manager', ...], QA: ['QA', 'Manager', ...], ... }
 */
export async function getRoleHierarchy(): Promise<Record<string, Role[]>> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/auth/config?type=hierarchy`, {
      headers: internalHeaders(),
      next: { revalidate: 60 },
    });

    if (!res.ok) return {};

    const data = await res.json();
    return (data.hierarchy as Record<string, Role[]>) ?? {};
  } catch (err) {
    console.error('[getRoleHierarchy] Failed to fetch hierarchy:', err);
    return {};
  }
}

/**
 * Fetch roles for a specific email from the internal config API.
 * Not cached — role changes should take effect immediately.
 */
export async function getRolesForEmail(email: string): Promise<Role[]> {
  try {
    const url = `${getBaseUrl()}/api/auth/config?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      headers: internalHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.roles as Role[]) ?? [];
  } catch (err) {
    console.error('[getRolesForEmail] Failed to fetch roles:', err);
    return [];
  }
}

/**
 * Fetch all protected route prefixes from the internal config API.
 * Cached for 60s — routes change infrequently.
 */
export async function getProtectedRoutes(): Promise<string[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/auth/config?type=routes`, {
      headers: internalHeaders(),
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.routes as string[]) ?? [];
  } catch (err) {
    console.error('[getProtectedRoutes] Failed to fetch routes:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Role-checking helpers (async — fetch hierarchy once then check)
// ---------------------------------------------------------------------------

/**
 * Check if user has a specific role (considering hierarchy).
 */
export async function hasRole(
  userRoles: string[],
  requiredRole: Role
): Promise<boolean> {
  const hierarchy = await getRoleHierarchy();
  return userRoles.some((role) => hierarchy[role]?.includes(requiredRole));
}

/**
 * Check if user has any of the required roles.
 */
export async function hasAnyRole(
  userRoles: string[],
  requiredRoles: Role[]
): Promise<boolean> {
  const hierarchy = await getRoleHierarchy();
  return userRoles.some((role) =>
    requiredRoles.some((required) => hierarchy[role]?.includes(required))
  );
}

/**
 * Check if user has all of the required roles.
 */
export async function hasAllRoles(
  userRoles: string[],
  requiredRoles: Role[]
): Promise<boolean> {
  const hierarchy = await getRoleHierarchy();
  return requiredRoles.every((required) =>
    userRoles.some((role) => hierarchy[role]?.includes(required))
  );
}

/**
 * Get all permissions for a user based on their roles.
 */
export async function getAllPermissions(userRoles: string[]): Promise<Set<Role>> {
  const hierarchy = await getRoleHierarchy();
  const permissions = new Set<Role>();
  userRoles.forEach((role) => {
    (hierarchy[role] ?? []).forEach((p) => permissions.add(p));
  });
  return permissions;
}

// ---------------------------------------------------------------------------
// Sync variants — use these when you've already fetched the hierarchy once
// (avoids redundant API calls inside a single request handler)
// ---------------------------------------------------------------------------

export function hasRoleSync(
  hierarchy: Record<string, Role[]>,
  userRoles: string[],
  requiredRole: Role
): boolean {
  return userRoles.some((role) => hierarchy[role]?.includes(requiredRole));
}

export function hasAnyRoleSync(
  hierarchy: Record<string, Role[]>,
  userRoles: string[],
  requiredRoles: Role[]
): boolean {
  return userRoles.some((role) =>
    requiredRoles.some((required) => hierarchy[role]?.includes(required))
  );
}

export function getAllPermissionsSync(
  hierarchy: Record<string, Role[]>,
  userRoles: string[]
): Set<Role> {
  const permissions = new Set<Role>();
  userRoles.forEach((role) => {
    (hierarchy[role] ?? []).forEach((p) => permissions.add(p));
  });
  return permissions;
}