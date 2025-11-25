"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MainSidebar } from "@/components/main-sidebar";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-900 text-slate-100 relative overflow-hidden">
        {/* Background particle effect */}
        <div className="absolute inset-0 w-full h-full opacity-30 -z-10">
          <canvas id="particle-canvas" className="w-full h-full" />
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping"></div>
                <div className="absolute inset-2 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-4 border-4 border-r-purple-500 border-t-transparent border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
                <div className="absolute inset-6 border-4 border-b-blue-500 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin-slower"></div>
                <div className="absolute inset-8 border-4 border-l-green-500 border-t-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
              </div>
              <div className="mt-4 text-cyan-500 font-mono text-sm tracking-wider">
                SYSTEM INITIALIZING
              </div>
            </div>
          </div>
        )}

        <div className="flex h-screen">
          <SidebarProvider>
            {/* Sidebar - Handles both desktop and mobile internally */}
            <MainSidebar />

            {/* Main content - Full width on mobile, adjusts on desktop */}
            <div className="flex-1 flex flex-col w-full lg:w-auto">
              <Header />
              <main className="flex-1 overflow-auto py-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                <div className="container mx-auto px-4">{children}</div>
              </main>
            </div>
          </SidebarProvider>
        </div>
      </div>
    </ThemeProvider>
  );
}
