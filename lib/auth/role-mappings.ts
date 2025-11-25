// lib/auth/role-mappings.ts

/**
 * Define available roles in the system
 */
export type Role = 'Admin' | 'Manager' | 'Analyst' | 'User' | 'Support' | 'Viewer';

/**
 * Email to roles mapping
 * Add or modify email-role associations here
 */
export const ROLE_MAPPINGS: Record<string, Role[]> = {
  'safnas@slmobility.com': ['Admin'],
  'hansika@slmobility.com': ['Analyst', 'User'],
  'jane@slmobility.com': ['User'],
  'support@slmobility.com': ['Support', 'User'],
  'viewer@slmobility.com': ['Viewer'],
  // Add more mappings as needed
};

/**
 * Role hierarchy - defines what permissions each role inherits
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  Admin: ['Admin', 'Manager', 'User', 'Support', 'Viewer'],
  Manager: ['Manager', 'User', 'Viewer'],
  Support: ['Support', 'User', 'Viewer'],
  User: ['User', 'Viewer'],
  Viewer: ['Viewer'],
};

/**
 * Get roles for a specific email address
 * @param email - User's email address
 * @returns Array of roles assigned to the email
 */
export function getRolesForEmail(email: string): Role[] {
  const normalizedEmail = email.toLowerCase().trim();
  return ROLE_MAPPINGS[normalizedEmail] || [];
}

/**
 * Check if user has a specific role (considering hierarchy)
 * @param userRoles - Array of user's roles
 * @param requiredRole - The role to check for
 * @returns True if user has the required role or a higher role
 */
export function hasRole(userRoles: string[], requiredRole: Role): boolean {
  return userRoles.some(role => 
    ROLE_HIERARCHY[role as Role]?.includes(requiredRole)
  );
}

/**
 * Check if user has any of the required roles
 * @param userRoles - Array of user's roles
 * @param requiredRoles - Array of roles to check for
 * @returns True if user has at least one of the required roles
 */
export function hasAnyRole(userRoles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.some(requiredRole => hasRole(userRoles, requiredRole));
}

/**
 * Check if user has all of the required roles
 * @param userRoles - Array of user's roles
 * @param requiredRoles - Array of roles to check for
 * @returns True if user has all of the required roles
 */
export function hasAllRoles(userRoles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.every(requiredRole => hasRole(userRoles, requiredRole));
}

/**
 * Get all permissions for a user based on their roles
 * @param userRoles - Array of user's roles
 * @returns Set of all unique roles/permissions the user has
 */
export function getAllPermissions(userRoles: string[]): Set<Role> {
  const permissions = new Set<Role>();
  
  userRoles.forEach(role => {
    const rolePermissions = ROLE_HIERARCHY[role as Role] || [];
    rolePermissions.forEach(permission => permissions.add(permission));
  });
  
  return permissions;
}