import { usePathname } from "next/navigation";
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
  ChevronDown,
  Home,
  MapPin,
  Battery,
  Zap,
  BarChart3,
  AlertTriangle,
  Package,
  Route,
  FileBarChart,
  Layers,
  Navigation,
  Gauge,
  Activity,
  Calendar,
  Users,
  Settings,
  ShoppingCartIcon,
  BatteryCharging,
  Cpu,
  LineChart,
  PieChart,
  Hexagon,
  Wrench,
  Building2,
  Calculator,
  UserCheck,
  DollarSign,
  TrendingUp,
  BrainCog,
  Bike,
  Target,
  ShoppingCart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { act, useState } from "react";
import path from "path";
import Image from "next/image";

export function MainSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    dashboard: true,
    gps: pathname?.startsWith("/gps") || false,
    battery: pathname?.startsWith("/battery") || false,
    motor: pathname?.startsWith("/motor") || false,
    analytics: pathname?.startsWith("/analytics") || false,
    fleet: pathname?.startsWith("/fleet") || false,
    charging: pathname?.startsWith("/charging") || false,
    revenue: pathname?.startsWith("/revenue") || false,
  });

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const isActive = (path: string) => pathname === path;

  // Define category icons with their colors for consistency
  const categoryIcons = {
    fleet: { icon: <Users className="h-4 w-4" />, color: "text-blue-500" },
    gps: { icon: <MapPin className="h-4 w-4" />, color: "text-cyan-500" },
    battery: { icon: <Battery className="h-4 w-4" />, color: "text-green-500" },
    motor: { icon: <Bike className="h-4 w-4" />, color: "text-amber-500" },
    charging: {
      icon: <BatteryCharging className="h-4 w-4" />,
      color: "text-purple-500",
    },
    revenue: {
      icon: <DollarSign className="h-4 w-4" />,
      color: "text-emerald-500",
    },
    analytics: {
      icon: <BarChart3 className="h-4 w-4" />,
      color: "text-blue-500",
    },
    sales: {
      icon: <ShoppingCart className="h-4 w-4" />,
      color: "text-orange-500",
    },
  };

  // Define menu categories and their items for consistency
  const menuCategories = [
    {
      id: "fleet",
      label: "Fleet Management",
      icon: categoryIcons.fleet,
      items: [
        {
          path: "/fleet",
          label: "Overview",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/fleet/vehicles",
          label: "Vehicles",
          icon: <Hexagon className="h-4 w-4" />,
        },
        {
          path: "/fleet/maintenance",
          label: "Maintenance",
          icon: <Wrench className="h-4 w-4" />,
        },
        {
          path: "/fleet/schedule",
          label: "Schedule",
          icon: <Calendar className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "gps",
      label: "GPS Analytics",
      icon: categoryIcons.gps,
      show: true,
      items: [
        {
          path: "/gps",
          label: "Overview",
          icon: <Layers className="h-4 w-4" />,
        },
        {
          path: "/gps/route-planning",
          label: "Route Planning",
          icon: <Route className="h-4 w-4" />,
        },
        // {
        //   path: "/gps/station-allocation",
        //   label: "Station Allocation",
        //   icon: <Layers className="h-4 w-4" />,
        // },
        // {
        //   path: "/gps/closest-stations",
        //   label: "Closest Stations",
        //   icon: <BarChart3 className="h-4 w-4" />,
        // },

        {
          path: "/gps/usage-patterns",
          label: "Usage Patterns",
          icon: <Navigation className="h-4 w-4" />,
        },
        {
          path: "/gps/area-analysis",
          label: "Area Analysis",
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          path: "/gps/density-analysis",
          label: "Density Analysis",
          icon: <Hexagon className="h-4 w-4" />,
        },
        // {
        //   path: "/gps/batch-analysis",
        //   label: "GPS Batch Analysis",
        //   icon: <FileBarChart className="h-4 w-4" />,
        // },
      ],
    },
    {
      id: "battery",
      label: "Battery Analytics",
      icon: categoryIcons.battery,
      items: [
        {
          path: "/battery",
          label: "Overview",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/battery/health",
          label: "Health Monitoring",
          icon: <Gauge className="h-4 w-4" />,
        },
        {
          path: "/battery/performance",
          label: "Performance",
          icon: <LineChart className="h-4 w-4" />,
        },
        {
          path: "/battery/prediction",
          label: "Prediction",
          icon: <PieChart className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "Vehicles",
      label: "360 Analytics",
      icon: categoryIcons.motor,
      show: true,
      items: [
        {
          path: "/vehicles",
          label: "Vehicle Overview",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/batteries",
          label: "Battery Overview",
          icon: <Battery className="h-4 w-4" />,
        },
        {
          path: "/stations",
          label: "BSS Overview",
          icon: <Zap className="h-4 w-4" />,
        },

        // {
        // {
        //   path: "/vehicles/proximity",
        //   label: "Proximity",
        //   icon: <Cpu className="h-4 w-4" />,
        // },
        // {
        //   path: "/vehicles/360",
        //   label: "Vehicle 360 view",
        //   icon: <Gauge className="h-4 w-4" />,
        // },
        // {
        //   path: "/vehicles/maintenance",
        //   label: "Maintenance",
        //   icon: <Wrench className="h-4 w-4" />,
        // },
        // {
        //   path: "/vehicles/charging",
        //   label: "Home Charging",
        //   icon: <Zap className="h-4 w-4" />,
        // },
      ],
    },
    {
      id: "sales",
      label: "Sales Management",
      icon: categoryIcons.sales,
      show: true,
      items: [
        {
          path: "/sales",
          label: "Overview",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/sales/regional",
          label: "Regional Analysis",
          icon: <MapPin className="h-4 w-4" />,
        },
        {
          path: "/sales/financial",
          label: "Financial Analysis",
          icon: <Calculator className="h-4 w-4" />,
        },
        {
          path: "/sales/dealers",
          label: "Dealer Performance",
          icon: <Building2 className="h-4 w-4" />,
        },

        {
          path: "/sales/customers",
          label: "Customer Insights",
          icon: <UserCheck className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "fleet",
      label: "Fleet Management",
      icon: categoryIcons.fleet,
      items: [
        {
          path: "/fleet",
          label: "Overview",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/fleet/vehicles",
          label: "Vehicles",
          icon: <Hexagon className="h-4 w-4" />,
        },
        {
          path: "/fleet/maintenance",
          label: "Maintenance",
          icon: <Wrench className="h-4 w-4" />,
        },
        {
          path: "/fleet/schedule",
          label: "Schedule",
          icon: <Calendar className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "charging",
      label: "Swapping Stations",
      icon: categoryIcons.charging,
      // show: true,
      items: [
        {
          path: "/charging",
          label: "Overview",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/charging/stations",
          label: "Station Map",
          icon: <MapPin className="h-4 w-4" />,
        },
        {
          path: "/charging/usage",
          label: "Usage Analytics",
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          path: "/charging/Cabinets",
          label: "Cabinet",
          icon: <Calendar className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "revenue",
      label: "Revenue Management",
      show: true,
      icon: {
        icon: <DollarSign className="h-4 w-4" />,
        color: "text-emerald-500",
      },
      items: [
        {
          path: "/revenue",
          label: "Overview",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/revenue/analytics",
          label: "Analytics",
          icon: <TrendingUp className="h-4 w-4" />,
        },
        {
          path: "/revenue/behavior",
          label: "Customer Behavior",
          icon: <Users className="h-4 w-4" />,
        },
        {
          path: "/revenue/package",
          label: "Packages",
          icon: <Package className="h-4 w-4" />,
        },

        // {
        //   path: "/revenue/forecasting",
        //   label: "Forecasting",
        //   icon: <Target className="h-4 w-4" />,
        // },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: categoryIcons.analytics,
      items: [
        {
          path: "/analytics",
          label: "Dashboard",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          path: "/analytics/reports",
          label: "Reports",
          icon: <LineChart className="h-4 w-4" />,
        },
        {
          path: "/analytics/predictions",
          label: "Predictions",
          icon: <PieChart className="h-4 w-4" />,
        },
        {
          path: "/analytics/alerts",
          label: "Alerts",
          icon: <AlertTriangle className="h-4 w-4" />,
        },
      ],
    },
  ];

  // Filter categories to show only those with show: true
  const visibleCategories = menuCategories.filter(
    (category) => category.show === true
  );

  return (
    <Sidebar className="border-r border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 w-64 shadow-2xl">
      <SidebarHeader className="h-20 border-b flex px-5 justify-between border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-x-3 mt-2">
          {/* Icon with glow */}
          <div className="relative flex items-center justify-center h-10 w-10">
            <Image src="/icon.png" alt="Logo" width={40} height={40} />
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md"></div>
          </div>

          {/* Text block */}
          <a href="/" className="inline-block">
            <div className="flex flex-col self-center leading-none cursor-pointer">
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-500 bg-clip-text text-transparent tracking-wide">
                SL-MOBILITY
              </span>
              <span className="text-xs text-slate-400 font-medium tracking-wider mt-0.5">
                ANALYTICS PLATFORM
              </span>
            </div>
          </a>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {/* Dashboard */}

        {/* Real-Time Analytics Section */}
        <SidebarGroup className="px-2 py-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/realtime")}
                className={`w-full px-3 py-2 rounded-md transition-colors ${
                  isActive("/realtime")
                    ? "bg-gradient-to-r from-pink-500/15 to-pink-600/10 border border-pink-500/20"
                    : "hover:bg-slate-800"
                }`}
              >
                <Link href="/realtime" className="flex items-center space-x-3">
                  <div
                    className={`flex items-center justify-center h-6 w-6 rounded-md ${
                      isActive("/realtime")
                        ? "bg-pink-500/15 text-pink-400"
                        : "bg-pink-500/10 text-pink-500"
                    }`}
                  >
                    <LineChart className="h-4 w-4" />
                  </div>
                  <span>Real-Time Analytics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Adhoc Section */}
        <SidebarGroup className="px-2 py-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/adhoc")}
                className={`w-full px-3 py-2 rounded-md transition-colors ${
                  isActive("/adhoc")
                    ? "bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-500/20"
                    : "hover:bg-slate-800"
                }`}
              >
                <Link href="/adhoc" className="flex items-center space-x-3">
                  <div
                    className={`flex items-center justify-center h-6 w-6 rounded-md ${
                      isActive("/adhoc")
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-emerald-500/10 text-emerald-500"
                    }`}
                  >
                    <BrainCog className="h-4 w-4" />
                  </div>
                  <span>Adhoc Analytics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/predictive")}
                className={`w-full px-3 py-2 rounded-md transition-colors ${
                  isActive("/predictive")
                    ? "bg-gradient-to-r from-blue-500/15 to-blue-600/10 border border-blue-500/20"
                    : "hover:bg-slate-800"
                }`}
              >
                <Link
                  href="/predictive"
                  className="flex items-center space-x-3"
                >
                  <div
                    className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors ${
                      isActive("/")
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    <Home className="h-4 w-4" />
                  </div>
                  <span>Predictive Analytics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {visibleCategories.length > 0 && (
          <SidebarSeparator className="my-1 bg-slate-800" />
        )}

        {/* Menu Categories - Only show categories with show: true */}
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
                    <div
                      className={`flex items-center justify-center h-6 w-6 rounded-md ${category.icon.color.replace(
                        "text-",
                        "bg-"
                      )}/10 ${category.icon.color} mr-3`}
                    >
                      {category.icon.icon}
                    </div>
                    <span className="font-medium">{category.label}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 ${
                      category.icon.color
                    } transition-transform duration-200 ease-in-out ${
                      openGroups[category.id] ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                <SidebarGroupContent>
                  <SidebarMenu className="pl-9 mt-1 space-y-1">
                    {category.items.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.path)}
                          className={`w-full px-3 py-2 rounded-md transition-colors ${
                            isActive(item.path)
                              ? `bg-gradient-to-r ${
                                  category.icon.color.includes("cyan")
                                    ? "from-cyan-500/15 to-cyan-600/10 border border-cyan-500/20"
                                    : category.icon.color.includes("emerald")
                                    ? "from-emerald-500/15 to-emerald-600/10 border border-emerald-500/20"
                                    : "from-blue-500/15 to-blue-600/10 border border-blue-500/20"
                                } ${category.icon.color}`
                              : "hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          <Link
                            href={item.path}
                            className="flex items-center space-x-3"
                          >
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

        <SidebarSeparator className="my-2 bg-slate-800" />

        {/* Settings */}
        <SidebarGroup className="px-2 py-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/settings")}
                className={`w-full px-3 py-2 rounded-md transition-colors ${
                  isActive("/settings")
                    ? "bg-gradient-to-r from-slate-500/15 to-slate-600/10 border border-slate-500/20"
                    : "hover:bg-slate-800"
                }`}
              >
                <Link href="/settings" className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-500/10 text-slate-500">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3">
          <Avatar className="h-9 w-9 border border-slate-700">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
            <AvatarFallback className="bg-slate-800 text-cyan-500">
              SK
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Safnas Kaldeen</span>
            <span className="text-xs text-slate-400">Data Analyst</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// Add these styles to your globals.css or a component-specific CSS file
/*
@keyframes slideDown {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
  to {
    height: 0;
    opacity: 0;
  }
}

.animate-slideDown {
  animation: slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-slideUp {
  animation: slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar styles */
// .scrollbar-thin {
//   scrollbar-width: thin;
// }

// .scrollbar-thumb-slate-700\/50::-webkit-scrollbar-thumb {
//   background-color: rgba(51, 65, 85, 0.5);
//   border-radius: 0.375rem;
// }

// .scrollbar-track-transparent::-webkit-scrollbar-track {
//   background-color: transparent;
// }

// .scrollbar-thin::-webkit-scrollbar {
//   width: 6px;
// }
// */
