// lib/roles.ts
// This file defines all roles and permissions for your application

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
  FACTORY_MANAGER: 'FactoryManager',
  QA: 'QA',
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]

/**
 * Current Access Rules:
 * - Admin: Full access to everything (super user)
 * - QA: Full access to everything (quality assurance oversight)
 * - FactoryManager: Access to everything EXCEPT revenue
 * 
 * Future roles (Manager, Analyst, Viewer) are defined but not yet assigned
 */

// Define which roles can access which menu categories
export const MENU_PERMISSIONS: Record<string, UserRole[]> = {
  realtime: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  fleet: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  gps: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  battery: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  vehicles: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  sales: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  charging: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  revenue: [ROLES.ADMIN, ROLES.QA, ROLES.MANAGER], // FactoryManager excluded
  analytics: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  factory: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER], // Factory-specific
  production: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER], // Factory-specific
  quality: [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER], // QA and Factory oversight
}

// Define which roles can access which routes
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Dashboard routes
  '/realtime': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  '/adhoc': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/predictive': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  
  // Fleet Management
  '/fleet': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  '/fleet/vehicles': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  '/fleet/maintenance': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  '/fleet/schedule': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  
  // GPS Analytics
  '/gps': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/route-planning': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/usage-patterns': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/area-analysis': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/density-analysis': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  
  // Battery Analytics
  '/battery': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/battery/health': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/battery/performance': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/battery/prediction': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  
  // Vehicles
  '/vehicles': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  
  // Sales Management
  '/sales': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  '/sales/regional': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  '/sales/financial': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  '/sales/dealers': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  '/sales/customers': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER],
  
  // Charging Stations
  '/charging': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/charging/stations': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/charging/usage': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/charging/cabinets': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  
  // Revenue Management - FactoryManager EXCLUDED
  '/revenue': [ROLES.ADMIN, ROLES.QA, ROLES.MANAGER],
  '/revenue/analytics': [ROLES.ADMIN, ROLES.QA, ROLES.MANAGER],
  '/revenue/patterns': [ROLES.ADMIN, ROLES.QA, ROLES.MANAGER],
  '/revenue/package': [ROLES.ADMIN, ROLES.QA, ROLES.MANAGER],
  
  // Analytics
  '/analytics': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  '/analytics/reports': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  '/analytics/predictions': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  '/analytics/alerts': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST],
  
  // Factory Management - Factory-specific routes
  '/factory': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/factory/production': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/factory/assembly': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/factory/inventory': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  
  // Production Management
  '/production': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/production/schedule': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/production/status': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/production/line': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  
  // Quality Assurance
  '/qa': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/qa/inspections': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/qa/reports': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/qa/defects': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/quality': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/quality/control': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  '/quality/standards': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER],
  
  // Settings
  '/settings': [ROLES.ADMIN, ROLES.QA, ROLES.FACTORY_MANAGER, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
}

// Helper function to check if user has access to a route
export function hasRouteAccess(userRoles: string[] | undefined, route: string): boolean {
  if (!userRoles || userRoles.length === 0) return false
  
  // Check exact route match first
  if (ROUTE_PERMISSIONS[route]) {
    return userRoles.some(role => ROUTE_PERMISSIONS[route].includes(role as UserRole))
  }
  
  // Check parent routes (e.g., /gps for /gps/some-page)
  const routeParts = route.split('/').filter(Boolean)
  for (let i = routeParts.length; i > 0; i--) {
    const parentRoute = '/' + routeParts.slice(0, i).join('/')
    if (ROUTE_PERMISSIONS[parentRoute]) {
      return userRoles.some(role => ROUTE_PERMISSIONS[parentRoute].includes(role as UserRole))
    }
  }
  
  return false
}

// Helper function to check if user can see a menu category
export function hasMenuAccess(userRoles: string[] | undefined, menuId: string): boolean {
  if (!userRoles || userRoles.length === 0) return false
  
  if (!MENU_PERMISSIONS[menuId]) return true // If not defined, allow by default
  
  return userRoles.some(role => MENU_PERMISSIONS[menuId].includes(role as UserRole))
}

// Helper function to filter menu categories based on user roles
export function filterMenuByRoles(menuCategories: any[], userRoles: string[] | undefined) {
  return menuCategories.filter(category => {
    // If category has show: false, don't show it regardless of role
    if (category.show === false) return false
    
    // Check if user has access based on roles
    return hasMenuAccess(userRoles, category.id)
  })
}