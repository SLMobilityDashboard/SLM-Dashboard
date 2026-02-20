// lib/roles.ts
// All permission data is stored in Supabase, fetched via /api/permissions.
// Safe to call from both client and server components.
//
// Override priority (highest → lowest):
//   1. user_effect === 'deny'  → always block / hide
//   2. user_effect === 'grant' → always allow / show
//   3. RBAC allowed_roles check
//   4. empty allowed_roles     → allow all authenticated users (menu)
//                                / allow all authenticated users (route, no entry)

export const ROLES = {
  ADMIN:           'Admin',
  MANAGER:         'Manager',
  ANALYST:         'Analyst',
  VIEWER:          'Viewer',
  FACTORY_MANAGER: 'FactoryManager',
  QA:              'QA',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// ── Richer types returned by the updated API ──────────────────────────────────

export type MenuPermEntry = {
  menu_id:       string;
  allowed_roles: string[];
  is_enabled:    boolean;
  user_effect:   'grant' | 'deny' | null;
};

export type RoutePermEntry = {
  route:         string;
  allowed_roles: string[];
  user_effect:   'grant' | 'deny' | null;
};

type MenuPermMap  = Record<string, MenuPermEntry>;
type RoutePermMap = Record<string, RoutePermEntry>;

// ── In-memory cache — 60 s TTL ───────────────────────────────────────────────

const CACHE_TTL_MS = 60_000;

const cache: {
  menuPerms?:  { data: MenuPermMap;  expiresAt: number };
  routePerms?: { data: RoutePermMap; expiresAt: number };
} = {};

// ── Fetch helper ──────────────────────────────────────────────────────────────

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

// ── Data fetchers (cached) ────────────────────────────────────────────────────

export async function getRoutePermissions(): Promise<RoutePermMap> {
  const now = Date.now();
  if (cache.routePerms && cache.routePerms.expiresAt > now) return cache.routePerms.data;

  const data = await fetchPermissions<{ routePerms: RoutePermEntry[] | Record<string, string[]> }>('routeperms');
  const raw  = data?.routePerms ?? [];

  let result: RoutePermMap;
  if (Array.isArray(raw)) {
    // New format — array with user_effect
    result = Object.fromEntries(raw.map((r) => [r.route, r]));
  } else {
    // Old flat format — wrap into RoutePermEntry with null user_effect
    result = Object.fromEntries(
      Object.entries(raw).map(([route, allowed_roles]) => [
        route,
        { route, allowed_roles, user_effect: null } as RoutePermEntry,
      ])
    );
  }

  cache.routePerms = { data: result, expiresAt: now + CACHE_TTL_MS };
  return result;
}

export async function getMenuPermissions(): Promise<MenuPermMap> {
  const now = Date.now();
  if (cache.menuPerms && cache.menuPerms.expiresAt > now) return cache.menuPerms.data;

  const data = await fetchPermissions<{ menuPerms: MenuPermEntry[] | Record<string, string[]> }>('menu');
  const raw  = data?.menuPerms ?? [];

  let result: MenuPermMap;
  if (Array.isArray(raw)) {
    // New format — array with is_enabled + user_effect
    result = Object.fromEntries(raw.map((m) => [m.menu_id, m]));
  } else {
    // Old flat format
    result = Object.fromEntries(
      Object.entries(raw).map(([menu_id, allowed_roles]) => [
        menu_id,
        { menu_id, allowed_roles, is_enabled: true, user_effect: null } as MenuPermEntry,
      ])
    );
  }

  cache.menuPerms = { data: result, expiresAt: now + CACHE_TTL_MS };
  return result;
}

// ── Sync helpers — called by the sidebar after fetching once ──────────────────

/**
 * Check menu visibility for the current user.
 *
 * Priority:
 *   deny override  → false  (hidden regardless of role)
 *   !is_enabled    → false  (globally off)
 *   grant override → true   (shown regardless of role)
 *   allowed_roles  → RBAC check
 *   empty roles    → true   (no restriction)
 */
export function hasMenuAccessSync(
  menuPerms: MenuPermMap,
  userRoles: string[] | undefined,
  menuId: string
): boolean {
  if (!userRoles?.length) return false;

  const entry = menuPerms[menuId];
  if (!entry) return true; // unknown menu → no restriction, fail open

  if (entry.user_effect === 'deny')  return false;
  if (!entry.is_enabled)             return false;
  if (entry.user_effect === 'grant') return true;

  if (entry.allowed_roles.length === 0) return true;
  return userRoles.some((r) => entry.allowed_roles.includes(r));
}

/**
 * Check route / sub-item visibility for the current user.
 *
 * Priority:
 *   deny override  → false
 *   grant override → true
 *   allowed_roles  → RBAC check
 *   no entry / empty roles → true (no restriction)
 */
export function hasRouteAccessSync(
  routePerms: RoutePermMap,
  userRoles: string[] | undefined,
  route: string
): boolean {
  if (!userRoles?.length) return false;

  const entry = routePerms[route];
  if (!entry) return true;

  if (entry.user_effect === 'deny')  return false;
  if (entry.user_effect === 'grant') return true;

  if (entry.allowed_roles.length === 0) return true;
  return userRoles.some((r) => entry.allowed_roles.includes(r));
}

// ── Async helpers ─────────────────────────────────────────────────────────────

export async function hasRouteAccess(userRoles: string[] | undefined, route: string): Promise<boolean> {
  if (!userRoles?.length) return false;
  return hasRouteAccessSync(await getRoutePermissions(), userRoles, route);
}

export async function hasMenuAccess(userRoles: string[] | undefined, menuId: string): Promise<boolean> {
  if (!userRoles?.length) return false;
  return hasMenuAccessSync(await getMenuPermissions(), userRoles, menuId);
}

export async function filterMenuByRoles(menuCategories: any[], userRoles: string[] | undefined): Promise<any[]> {
  if (!userRoles?.length) return [];
  return filterMenuByRolesSync(await getMenuPermissions(), menuCategories, userRoles);
}

export function filterMenuByRolesSync(
  menuPerms: MenuPermMap,
  menuCategories: any[],
  userRoles: string[] | undefined
): any[] {
  if (!userRoles?.length) return [];
  return menuCategories.filter((c) => c.show !== false && hasMenuAccessSync(menuPerms, userRoles, c.id));
}