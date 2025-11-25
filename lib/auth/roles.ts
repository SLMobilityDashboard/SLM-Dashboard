// lib/roles.ts
// This file defines all roles and permissions for your application

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]

// Define which roles can access which menu categories
export const MENU_PERMISSIONS: Record<string, UserRole[]> = {
  realtime: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  fleet: [ROLES.ADMIN, ROLES.MANAGER],
  gps: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  battery: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  vehicles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  sales: [ROLES.ADMIN, ROLES.MANAGER],
  charging: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  revenue: [ROLES.ADMIN, ROLES.MANAGER],
  analytics: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
}

// Define which roles can access which routes
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Dashboard routes
  '/realtime': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  '/adhoc': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/predictive': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  
  // Fleet Management
  '/fleet': [ROLES.ADMIN, ROLES.MANAGER],
  '/fleet/vehicles': [ROLES.ADMIN, ROLES.MANAGER],
  '/fleet/maintenance': [ROLES.ADMIN, ROLES.MANAGER],
  '/fleet/schedule': [ROLES.ADMIN, ROLES.MANAGER],
  
  // GPS Analytics
  '/gps': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/route-planning': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/usage-patterns': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/area-analysis': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/gps/density-analysis': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  
  // Battery Analytics
  '/battery': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/battery/health': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/battery/performance': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/battery/prediction': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  
  // Vehicles
  '/vehicles': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  
  // Sales Management
  '/sales': [ROLES.ADMIN, ROLES.MANAGER],
  '/sales/regional': [ROLES.ADMIN, ROLES.MANAGER],
  '/sales/financial': [ROLES.ADMIN, ROLES.MANAGER],
  '/sales/dealers': [ROLES.ADMIN, ROLES.MANAGER],
  '/sales/customers': [ROLES.ADMIN, ROLES.MANAGER],
  
  // Charging Stations
  '/charging': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/charging/stations': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/charging/usage': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/charging/cabinets': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  
  // Revenue Management
  '/revenue': [ROLES.ADMIN, ROLES.MANAGER],
  '/revenue/analytics': [ROLES.ADMIN, ROLES.MANAGER],
  '/revenue/patterns': [ROLES.ADMIN, ROLES.MANAGER],
  '/revenue/package': [ROLES.ADMIN, ROLES.MANAGER],
  
  // Analytics
  '/analytics': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  '/analytics/reports': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
  '/analytics/predictions': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  '/analytics/alerts': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST],
  
  // Settings
  '/settings': [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST, ROLES.VIEWER],
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