"use client";

import React from "react";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, ChevronLeft, ChevronRight,
  Search, RefreshCw, Loader2, AlertCircle,
  Pencil, Plus, Trash2, Filter, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AuditEntry = {
  id: string;
  performed_by: string;
  action: "POST" | "PATCH" | "DELETE";
  target_table: string;
  target_match: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  description: string | null;
  created_at: string;
};

type AuditResponse = {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const ACTION_STYLES: Record<string, string> = {
  POST:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  PATCH:  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/25",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  POST:   <Plus   className="h-3 w-3" />,
  PATCH:  <Pencil className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
};

const TABLE_LABELS: Record<string, string> = {
  user_roles:                "User Roles",
  menu_permissions:          "Menu Permissions",
  protected_routes:          "Protected Routes",
  route_permissions:         "Route Permissions",
  role_hierarchy:            "Role Hierarchy",
  user_permission_overrides: "User Overrides",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelative(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── JsonPill — renders a clickable pill that opens a popover via portal ──────
// Uses a fixed-position popover anchored via getBoundingClientRect so it
// always escapes any overflow:hidden parent.
function JsonPill({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  const [open, setOpen]     = useState(false);
  const [pos,  setPos]      = useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  if (!data || Object.keys(data).length === 0) return null;

  const preview = Object.entries(data)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v).substring(0, 20)}`)
    .join(", ");

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono
                   bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200
                   hover:border-slate-500 transition-colors"
      >
        <span className="text-slate-600">{label}:</span>
        <span className="truncate max-w-[160px]">{preview}</span>
        {Object.keys(data).length > 2 && (
          <span className="text-slate-600">+{Object.keys(data).length - 2}</span>
        )}
      </button>

      {open && pos && (
        <>
          {/* Backdrop — fixed, covers whole screen */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Popover — fixed positioned so it escapes overflow:hidden parents */}
          <div
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 min-w-[240px] max-w-sm rounded-lg border
                       border-slate-700 bg-slate-900 shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{label}</span>
              <button onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5 text-slate-500 hover:text-slate-300" />
              </button>
            </div>
            <pre className="text-xs text-slate-300 overflow-auto max-h-48 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuditLogTab({ toast }: { toast: (m: string, t?: "success" | "error") => void }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterTable, setFilterTable]   = useState<string>("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchAudit = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: "audit", page: String(p), pageSize: String(PAGE_SIZE) });
      if (search)       params.set("search", search);
      if (filterAction) params.set("action", filterAction);
      if (filterTable)  params.set("table",  filterTable);

      const res = await fetch(`/api/permissions?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data: AuditResponse = await res.json();
      setEntries(data.data ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load audit log";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [search, filterAction, filterTable, toast]);

  useEffect(() => { fetchAudit(1); }, [fetchAudit]);

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-800/20 px-5 py-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold">Audit Log</span> — append-only record of every
          permission change. Click any match/values pill to inspect the full payload.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            className="pl-8 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 appearance-none">
            <option value="">All actions</option>
            <option value="POST">Create</option>
            <option value="PATCH">Update</option>
            <option value="DELETE">Delete</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <select value={filterTable} onChange={(e) => setFilterTable(e.target.value)}
            className="pl-8 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 appearance-none">
            <option value="">All categories</option>
            {Object.entries(TABLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button onClick={() => fetchAudit(page)} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
        <span className="ml-auto text-xs text-slate-500">{total.toLocaleString()} entries</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          <span className="text-sm">Loading audit log...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => fetchAudit(page)} className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 border border-slate-700">Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-slate-800 py-16 text-center space-y-2">
          <ClipboardList className="h-8 w-8 text-slate-700 mx-auto" />
          <p className="text-slate-600 text-sm">No audit entries found</p>
        </div>
      ) : (
        // overflow-visible so fixed-position popovers aren't clipped
        <div className="rounded-xl border border-slate-800 overflow-visible">
          <div className="bg-slate-800/50 border-b border-slate-800 px-4 py-3 rounded-t-xl flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-cyan-400" /> Audit Log
            </h2>
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3.5 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start gap-3">

                  {/* Action badge */}
                  <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${ACTION_STYLES[entry.action]}`}>
                    {ACTION_ICONS[entry.action]}
                    {entry.action === "POST" ? "Created" : entry.action === "PATCH" ? "Updated" : "Deleted"}
                  </span>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Human-readable description — primary text */}
                    <p className="text-sm text-slate-200 leading-snug">
                      {entry.description
                        ?? `${entry.performed_by} performed ${entry.action} on ${TABLE_LABELS[entry.target_table] ?? entry.target_table}`}
                    </p>

                    {/* Secondary row — table label + payload pills + ip */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded border font-mono bg-slate-800/60 border-slate-700 text-slate-500">
                        {TABLE_LABELS[entry.target_table] ?? entry.target_table}
                      </span>
                      <JsonPill label="match"  data={entry.target_match} />
                      <JsonPill label="values" data={entry.new_values}   />
                      {entry.ip_address && (
                        <span className="text-xs text-slate-600 font-mono hidden lg:block">{entry.ip_address}</span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="shrink-0 text-xs text-slate-500 mt-0.5"
                    title={new Date(entry.created_at).toLocaleString()}>
                    {formatRelative(entry.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="bg-slate-800/30 border-t border-slate-800 px-4 py-3 rounded-b-xl flex items-center justify-between">
            <button onClick={() => fetchAudit(page - 1)} disabled={page <= 1 || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5)             p = i + 1;
                else if (page <= 3)              p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else                             p = page - 2 + i;
                return (
                  <button key={p} onClick={() => fetchAudit(p)} disabled={loading}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" : "text-slate-500 hover:text-slate-300 hover:bg-slate-700"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            <button onClick={() => fetchAudit(page + 1)} disabled={page >= totalPages || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}