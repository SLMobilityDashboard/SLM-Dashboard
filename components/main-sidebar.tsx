"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  SIDEBAR as Sidebar,
  SIDEBARContent as SidebarContent,
  SIDEBARHeader as SidebarHeader,
  SIDEBARFooter as SidebarFooter,
  SIDEBARGroup as SidebarGroup,
  SIDEBARGroupContent as SidebarGroupContent,
  SIDEBARGroupLabel as SidebarGroupLabel,
  SIDEBARMenu as SidebarMenu,
  SIDEBARMenuItem as SidebarMenuItem,
  SIDEBARMenuButton as SidebarMenuButton,
  SIDEBARSeparator as SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown, Home, MapPin, Battery, BarChart3,
  Package, Route, Layers, Navigation, Activity,
  Settings, BatteryCharging, LineChart, Hexagon,
  Building2, DollarSign, TrendingUp, BrainCog,
  Bike, ShoppingCart, ChevronRight, Users,
  Telescope, Database,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  getMenuPermissions,
  getRoutePermissions,
  hasMenuAccessSync,
  hasRouteAccessSync,
  MenuPermEntry,
  RoutePermEntry,
} from "@/lib/auth/roles";

export function MainSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRoles: string[] = session?.user?.roles || [];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    dashboard: true,
    gps:         pathname?.startsWith("/gps")                 || false,
    "360":       pathname?.startsWith("/vehicles") || pathname?.startsWith("/batteries") || pathname?.startsWith("/bss") || false,
    revenue:     pathname?.startsWith("/revenue")              || false,
    sales:       pathname?.startsWith("/sales")                || false,
    observatory: pathname?.startsWith("/warehouse-monitoring") || false,
  });

  // ── Correct types so user_effect is preserved ─────────────────────────────
  const [menuPerms,  setMenuPerms]  = useState<Record<string, MenuPermEntry>>({});
  const [routePerms, setRoutePerms] = useState<Record<string, RoutePermEntry>>({});
  const [permsLoaded, setPermsLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    Promise.all([getMenuPermissions(), getRoutePermissions()])
      .then(([mp, rp]) => {
        setMenuPerms(mp);
        setRoutePerms(rp);
      })
      .catch((err) => {
        console.error("[Sidebar] Failed to load permissions:", err);
      })
      .finally(() => {
        setPermsLoaded(true);
      });
  }, [session]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isMobileMenuOpen]);

  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const isActive = (p: string) => pathname === p;
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const openMobileMenu  = () => setIsMobileMenuOpen(true);

  // ── Permission checks ──────────────────────────────────────────────────────
  //
  // canAccessMenu(menuId, routePath?)
  //   For standalone links, pass BOTH the menu_id AND the route path.
  //   A deny on EITHER the menu entry OR the route entry will hide the link.
  //   This means admins can block a user via a route override (/adhoc) OR
  //   a menu override (adhoc) — whichever they set in the admin UI.
  //
  // canAccessRoute(route)
  //   Used for grouped sub-items (GPS, 360, Revenue, Observatory children).

  // Replace canAccessMenu in MainSidebar:
  const canAccessMenu = (menuId: string): boolean => {
    if (!permsLoaded) return false;
    return hasMenuAccessSync(menuPerms, userRoles, menuId);
  };

  const canAccessRoute = (route: string): boolean =>
    permsLoaded && hasRouteAccessSync(routePerms, userRoles, route);

  const categoryIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    gps:         { icon: <MapPin className="h-4 w-4" />,       color: "text-cyan-500"    },
    "360":       { icon: <Bike className="h-4 w-4" />,         color: "text-amber-500"   },
    revenue:     { icon: <DollarSign className="h-4 w-4" />,   color: "text-emerald-500" },
    sales:       { icon: <ShoppingCart className="h-4 w-4" />, color: "text-orange-500"  },
    fleet:       { icon: <Users className="h-4 w-4" />,        color: "text-blue-500"    },
    analytics:   { icon: <BarChart3 className="h-4 w-4" />,    color: "text-blue-500"    },
    observatory: { icon: <Telescope className="h-4 w-4" />,    color: "text-violet-500"  },
  };

  const menuCategories = [
    {
      id: "gps",
      label: "GPS Analytics",
      icon: categoryIcons.gps,
      show: true,
      items: [
        { path: "/gps",                  label: "Overview",         icon: <Layers className="h-4 w-4" />    },
        { path: "/gps/route-planning",   label: "Route Planning",   icon: <Route className="h-4 w-4" />     },
        { path: "/gps/usage-patterns",   label: "Usage Patterns",   icon: <Navigation className="h-4 w-4" />},
        { path: "/gps/area-analysis",    label: "Area Analysis",    icon: <BarChart3 className="h-4 w-4" /> },
        { path: "/gps/density-analysis", label: "Density Analysis", icon: <Hexagon className="h-4 w-4" />   },
      ],
    },
    {
      id: "360",
      label: "360 Analytics",
      icon: categoryIcons["360"],
      show: true,
      items: [
        { path: "/vehicles",      label: "Vehicle 360",       icon: <Activity className="h-4 w-4" />  },
        { path: "/batteries",     label: "Battery 360",       icon: <Battery className="h-4 w-4" />   },
        { path: "/bss",           label: "BSS 360",           icon: <Building2 className="h-4 w-4" /> },
        { path: "/home-charging", label: "Home Charging 360", icon: <Home className="h-4 w-4" />      },
      ],
    },
    {
      id: "revenue",
      label: "Revenue Management",
      icon: categoryIcons.revenue,
      show: true,
      items: [
        { path: "/revenue",                       label: "Overview",              icon: <Activity className="h-4 w-4" />     },
        { path: "/revenue/analytics",             label: "Analytics",             icon: <TrendingUp className="h-4 w-4" />   },
        { path: "/revenue/transaction-analytics", label: "Transaction Analytics", icon: <ShoppingCart className="h-4 w-4" /> },
        { path: "/revenue/customer",              label: "Customer Analytics",    icon: <Users className="h-4 w-4" />        },
      ],
    },
    {
      id: "observatory",
      label: "Observatory",
      icon: categoryIcons.observatory,
      show: true,
      items: [
        { path: "/observatory/monitoring", label: "Monitoring", icon: <Database className="h-4 w-4" /> },
        // Future: data validity, pipeline SLAs, query performance, etc.
        // just add more { path, label, icon } entries here — the group
        // rendering + permission checks below already handle any number
        // of items generically.
      ],
    },
  ];

  // Grouped categories — menu_id only (no standalone route path needed)
  const visibleCategories = menuCategories.filter(
    (c) => c.show && canAccessMenu(c.id)
  );

  const renderMenuContent = () => {
    if (!permsLoaded) {
      return (
        <div className="px-4 py-3 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      );
    }

    return (
      <>
        {/* ── Standalone links ───────────────────────────────────────────────
            Pass BOTH menu_id AND route path so either override type works.
            A route deny on "/realtime" OR a menu deny on "realtime" hides it.
        ── */}

        {canAccessMenu("realtime", "/realtime") && (
          <SidebarGroup className="px-2 py-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/realtime")}
                  className={`w-full px-3 py-2 rounded-md transition-colors ${isActive("/realtime") ? "bg-gradient-to-r from-pink-500/15 to-pink-600/10 border border-pink-500/20" : "hover:bg-slate-800"}`}>
                  <Link href="/realtime" className="flex items-center space-x-3" onClick={closeMobileMenu}>
                    <div className={`flex items-center justify-center h-6 w-6 rounded-md ${isActive("/realtime") ? "bg-pink-500/15 text-pink-400" : "bg-pink-500/10 text-pink-500"}`}>
                      <LineChart className="h-4 w-4" />
                    </div>
                    <span>Real-Time Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {canAccessMenu("adhoc", "/adhoc") && (
          <SidebarGroup className="px-2 py-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/adhoc")}
                  className={`w-full px-3 py-2 rounded-md transition-colors ${isActive("/adhoc") ? "bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-500/20" : "hover:bg-slate-800"}`}>
                  <Link href="/adhoc" className="flex items-center space-x-3" onClick={closeMobileMenu}>
                    <div className={`flex items-center justify-center h-6 w-6 rounded-md ${isActive("/adhoc") ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-500/10 text-emerald-500"}`}>
                      <BrainCog className="h-4 w-4" />
                    </div>
                    <span>Adhoc Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {canAccessMenu("predictive", "/predictive") && (
          <SidebarGroup className="px-2 py-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/predictive")}
                  className={`w-full px-3 py-2 rounded-md transition-colors ${isActive("/predictive") ? "bg-gradient-to-r from-blue-500/15 to-blue-600/10 border border-blue-500/20" : "hover:bg-slate-800"}`}>
                  <Link href="/predictive" className="flex items-center space-x-3" onClick={closeMobileMenu}>
                    <div className={`flex items-center justify-center h-6 w-6 rounded-md ${isActive("/predictive") ? "bg-blue-500/15 text-blue-400" : "bg-blue-500/10 text-blue-500"}`}>
                      <Home className="h-4 w-4" />
                    </div>
                    <span>Predictive Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {visibleCategories.length > 0 && <SidebarSeparator className="my-1 bg-slate-800" />}

        {/* ── Grouped categories ─────────────────────────────────────────── */}
        {visibleCategories.map((category) => (
          <Collapsible
            key={category.id}
            open={openGroups[category.id]}
            onOpenChange={() => toggleGroup(category.id)}
            className="group relative px-2 py-1"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center px-3 py-2 rounded-md transition-colors hover:bg-slate-800 cursor-pointer">
                  <div className="flex flex-1 items-center">
                    <div className={`flex items-center justify-center h-6 w-6 rounded-md ${category.icon.color.replace("text-", "bg-")}/10 ${category.icon.color} mr-3`}>
                      {category.icon.icon}
                    </div>
                    <span className="font-medium">{category.label}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 ${category.icon.color} transition-transform duration-200 ${openGroups[category.id] ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                <SidebarGroupContent>
                  <SidebarMenu className="pl-9 mt-1 space-y-1">
                    {category.items
                      .filter((item) => canAccessRoute(item.path))
                      .map((item) => (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton asChild isActive={isActive(item.path)}
                            className={`w-full px-3 py-2 rounded-md transition-colors ${
                              isActive(item.path)
                                ? `bg-gradient-to-r ${
                                    category.icon.color.includes("cyan")      ? "from-cyan-500/15 to-cyan-600/10 border border-cyan-500/20"
                                    : category.icon.color.includes("emerald") ? "from-emerald-500/15 to-emerald-600/10 border border-emerald-500/20"
                                    : category.icon.color.includes("violet")  ? "from-violet-500/15 to-violet-600/10 border border-violet-500/20"
                                    : "from-blue-500/15 to-blue-600/10 border border-blue-500/20"
                                  } ${category.icon.color}`
                                : "hover:bg-slate-800 text-slate-300"
                            }`}>
                            <Link href={item.path} className="flex items-center space-x-3" onClick={closeMobileMenu}>
                              {item.icon}
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </>
    );
  };

  const FooterContent = ({ isMobile }: { isMobile: boolean }) => (
    <>
      <div className={isMobile ? "px-2 py-2" : ""}>
        {isMobile ? (
          <Link href="/settings"
            className={`flex items-center space-x-3 w-full px-3 py-1 rounded-md transition-colors ${isActive("/settings") ? "bg-gradient-to-r from-slate-500/15 to-slate-600/10 border border-slate-500/20" : "hover:bg-slate-800"}`}
            onClick={closeMobileMenu}>
            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-500/10 text-slate-500">
              <Settings className="h-4 w-4" />
            </div>
            <span>Settings</span>
          </Link>
        ) : (
          <SidebarGroup className="px-2 py-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}
                  className={`w-full px-3 py-2 rounded-md transition-colors ${isActive("/settings") ? "bg-gradient-to-r from-slate-500/15 to-slate-600/10 border border-slate-500/20" : "hover:bg-slate-800"}`}>
                  <Link href="/settings" className="flex items-center space-x-3" onClick={closeMobileMenu}>
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-500/10 text-slate-500">
                      <Settings className="h-4 w-4" />
                    </div>
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </div>
      <div className={`${isMobile ? "p-3" : "p-4"} border-t border-slate-800`}>
        <div className="flex items-center space-x-3">
          <Avatar className="h-9 w-9 border border-slate-700">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
            <AvatarFallback className="bg-slate-800 text-cyan-500">
              {session?.user?.name?.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{session?.user?.name || "User"}</span>
            <span className="text-xs text-slate-400">{userRoles.join(", ") || "Loading..."}</span>
          </div>
        </div>
      </div>
    </>
  );

  const SidebarContentComponent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {isMobile ? (
        <div className="h-20 border-b flex px-5 items-center border-slate-800/60 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-x-3">
            <div className="relative flex items-center justify-center h-10 w-10">
              <Image src="/icon.png" alt="Logo" width={40} height={40} />
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md" />
            </div>
            <a href="/" onClick={closeMobileMenu}>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-500 bg-clip-text text-transparent tracking-wide">SL-MOBILITY</span>
                <span className="text-xs text-slate-400 font-medium tracking-wider mt-0.5">ANALYTICS PLATFORM</span>
              </div>
            </a>
          </div>
        </div>
      ) : (
        <SidebarHeader className="h-20 border-b flex px-5 items-center border-slate-800/60 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-x-3">
            <div className="relative flex items-center justify-center h-10 w-10">
              <Image src="/icon.png" alt="Logo" width={40} height={40} />
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md" />
            </div>
            <a href="/">
              <div className="flex flex-col leading-none">
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-500 bg-clip-text text-transparent tracking-wide">SL-MOBILITY</span>
                <span className="text-xs text-slate-400 font-medium tracking-wider mt-0.5">ANALYTICS PLATFORM</span>
              </div>
            </a>
          </div>
        </SidebarHeader>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {isMobile
          ? <div className="py-2">{renderMenuContent()}</div>
          : <SidebarContent className="py-2">{renderMenuContent()}</SidebarContent>
        }
      </div>

      <div className="shrink-0 border-t">
        {isMobile
          ? <FooterContent isMobile={true} />
          : <SidebarFooter><FooterContent isMobile={false} /></SidebarFooter>
        }
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 shrink-0">
        <Sidebar className="border-r border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 w-64 shadow-2xl h-[100dvh]">
          <SidebarContentComponent isMobile={false} />
        </Sidebar>
      </aside>

      {/* Mobile open button */}
      <button
        onClick={openMobileMenu}
        className={`lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-[100] p-3 bg-gradient-to-r from-slate-900 to-slate-800 border-r border-t border-b border-slate-700/50 rounded-r-lg hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 hover:pr-4 ${isMobileMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Open menu"
      >
        <ChevronRight className="h-5 w-5 text-cyan-400" />
      </button>

      {/* Mobile overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={closeMobileMenu}
      />

      {/* Mobile sidebar */}
      <div
        className="lg:hidden fixed top-0 bottom-0 left-0 w-64 z-[70] transition-transform duration-300 ease-in-out bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/80 shadow-2xl h-[100dvh]"
        style={{ transform: isMobileMenuOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <SidebarContentComponent isMobile={true} />
      </div>
    </>
  );
}