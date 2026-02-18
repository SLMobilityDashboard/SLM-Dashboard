// lib/roles.ts
// All permission data is stored in Supabase, fetched via /api/permissions.
// Safe to call from both client and server components.

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
  FACTORY_MANAGER: 'FactoryManager',
  QA: 'QA',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// ---------------------------------------------------------------------------
// In-memory cache — avoids hammering the API on every render
// TTL: 60 seconds
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000;

const cache: {
  menuPerms?: { data: Record<string, UserRole[]>; expiresAt: number };
  routePerms?: { data: Record<string, UserRole[]>; expiresAt: number };
} = {};

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

async function fetchPermissions<T>(type: string): Promise<T | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/permissions?type=${type}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[fetchPermissions] ${type} → ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[fetchPermissions] Failed for type=${type}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data fetchers (with cache)
// ---------------------------------------------------------------------------

export async function getRoutePermissions(): Promise<Record<string, UserRole[]>> {
  const now = Date.now();
  if (cache.routePerms && cache.routePerms.expiresAt > now) {
    return cache.routePerms.data;
  }
  const data = await fetchPermissions<{ routePerms: Record<string, UserRole[]> }>('routeperms');
  const result = data?.routePerms ?? {};
  cache.routePerms = { data: result, expiresAt: now + CACHE_TTL_MS };
  return result;
}

export async function getMenuPermissions(): Promise<Record<string, UserRole[]>> {
  const now = Date.now();
  if (cache.menuPerms && cache.menuPerms.expiresAt > now) {
    return cache.menuPerms.data;
  }
  const data = await fetchPermissions<{ menuPerms: Record<string, UserRole[]> }>('menu');
  const result = data?.menuPerms ?? {};
  cache.menuPerms = { data: result, expiresAt: now + CACHE_TTL_MS };
  return result;
}

// ---------------------------------------------------------------------------
// Async helpers
// ---------------------------------------------------------------------------

export async function hasRouteAccess(
  userRoles: string[] | undefined,
  route: string
): Promise<boolean> {
  if (!userRoles?.length) return false;
  const routePerms = await getRoutePermissions();
  return _checkRouteAccess(routePerms, userRoles, route);
}

export async function hasMenuAccess(
  userRoles: string[] | undefined,
  menuId: string
): Promise<boolean> {
  if (!userRoles?.length) return false;
  const menuPerms = await getMenuPermissions();
  return _checkMenuAccess(menuPerms, userRoles, menuId);
}

export async function filterMenuByRoles(
  menuCategories: any[],
  userRoles: string[] | undefined
): Promise<any[]> {
  if (!userRoles?.length) return [];
  const menuPerms = await getMenuPermissions();
  return menuCategories.filter((category) => {
    if (category.show === false) return false;
    return _checkMenuAccess(menuPerms, userRoles, category.id);
  });
}

// ---------------------------------------------------------------------------
// Sync variants — use when you've already fetched permissions once
//
// Pattern:
//   const menuPerms  = await getMenuPermissions();
//   const routePerms = await getRoutePermissions();
//   const visible    = filterMenuByRolesSync(menuPerms, categories, userRoles);
//   const canView    = hasRouteAccessSync(routePerms, userRoles, '/revenue');
// ---------------------------------------------------------------------------

export function hasRouteAccessSync(
  routePerms: Record<string, UserRole[]>,
  userRoles: string[] | undefined,
  route: string
): boolean {
  if (!userRoles?.length) return false;
  return _checkRouteAccess(routePerms, userRoles, route);
}

export function hasMenuAccessSync(
  menuPerms: Record<string, UserRole[]>,
  userRoles: string[] | undefined,
  menuId: string
): boolean {
  if (!userRoles?.length) return false;
  return _checkMenuAccess(menuPerms, userRoles, menuId);
}

export function filterMenuByRolesSync(
  menuPerms: Record<string, UserRole[]>,
  menuCategories: any[],
  userRoles: string[] | undefined
): any[] {
  if (!userRoles?.length) return [];
  return menuCategories.filter((category) => {
    if (category.show === false) return false;
    return _checkMenuAccess(menuPerms, userRoles, category.id);
  });
}

// ---------------------------------------------------------------------------
// Private implementations
// ---------------------------------------------------------------------------

function _checkRouteAccess(
  routePerms: Record<string, UserRole[]>,
  userRoles: string[],
  route: string
): boolean {
  if (routePerms[route]) {
    return userRoles.some((r) => routePerms[route].includes(r as UserRole));
  }
  const parts = route.split('/').filter(Boolean);
  for (let i = parts.length - 1; i > 0; i--) {
    const parent = '/' + parts.slice(0, i).join('/');
    if (routePerms[parent]) {
      return userRoles.some((r) => routePerms[parent].includes(r as UserRole));
    }
  }
  return false;
}

function _checkMenuAccess(
  menuPerms: Record<string, UserRole[]>,
  userRoles: string[],
  menuId: string
): boolean {
  if (!menuPerms[menuId]) return false;
  return userRoles.some((r) => menuPerms[menuId].includes(r as UserRole));
}