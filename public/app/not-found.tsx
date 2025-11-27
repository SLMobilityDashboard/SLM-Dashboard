"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Home, Search, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";

export default function NotFound() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center gap-12 flex-1 px-4 py-8">
        {/* Animated Robot Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <picture className="relative w-48 h-48 md:w-64 md:h-64 block">
            <Image
              src="/assets/bot_greenprint.gif"
              alt="Lost Robot Assistant"
              width={256}
              height={256}
              quality={90}
              priority
              className="size-full object-contain filter drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </picture>
        </div>

        {/* Content Section */}
        <div className="flex flex-col items-center justify-center gap-6 max-w-2xl text-center">
          {/* Error Code */}
          <div className="flex items-center gap-4">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-16" />
            <span className="text-6xl md:text-8xl font-black bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              404
            </span>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-16" />
          </div>

          {/* Main Heading */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Oops! Page Not Found
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Our robot assistant couldn't locate this page. It might have been
              moved, deleted, or never existed in the first place.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <Home size={18} />
              Back to Home
            </Link>

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors duration-200"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-12 p-6 bg-muted/50 rounded-xl border border-border/50 backdrop-blur-sm">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Search size={18} />
              Need help finding something?
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Check the URL for typos</p>
              <p>• Use the navigation menu to browse</p>
              <p>• Try searching from the homepage</p>
              <p>• Contact support if you believe this is an error</p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-primary/30 rounded-full animate-ping" />
        <div className="absolute bottom-32 right-16 w-3 h-3 bg-secondary/40 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-20 w-1 h-1 bg-accent/50 rounded-full animate-bounce" />
      </div>
    </DashboardLayout>
  );
}
