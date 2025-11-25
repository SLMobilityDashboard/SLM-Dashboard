// ============================================
// 5. Unauthorized Page
// app/unauthorized/page.tsx
// ============================================

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShieldX, Home, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <div className="text-center space-y-6 p-8 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <ShieldX className="h-24 w-24 text-red-500" />
            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"></div>
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 text-lg">
            You don't have permission to access this page.
          </p>
        </div>

        {/* User Info */}
        {session?.user && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-sm text-slate-400">Signed in as</p>
            <p className="text-white font-medium">{session.user.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Role: {session.user.roles?.join(", ") || "No role assigned"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/realtime"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Contact Admin */}
        <p className="text-sm text-slate-500">
          Need access? Contact your administrator to request permission.
        </p>
      </div>
    </div>
  );
}
