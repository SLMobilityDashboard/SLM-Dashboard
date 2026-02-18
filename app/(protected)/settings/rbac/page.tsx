"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, Users, Route, LayoutGrid, GitBranch,
  Plus, Trash2, Save, RefreshCw, X, Check,
  AlertCircle, Loader2, Search, ToggleLeft, ToggleRight,
  Edit2, UserPlus, ChevronRight, ShieldAlert, ShieldCheck,
  EyeOff, Eye,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
  created_at: string;
  updated_at: string;
};

type MenuPermission = {
  menu_id: string;
  display_name: string | null;
  allowed_roles: string[];
  is_enabled: boolean;
  sort_order: number;
  icon: string | null;
};

type ProtectedRoute = {
  id: string;
  path_prefix: string;
  description: string | null;
  subcategory_id: string | null;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
};

type RoutePermission = {
  route: string;
  allowed_roles: string[];
};

type RoleHierarchy = {
  role: string;
  inherited_roles: string[];
};

type Override = {
  id: string;
  email: string;
  target_type: "route" | "menu";
  target_id: string;
  effect: "grant" | "deny";
  granted_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_ROLES = ["Admin", "Manager", "Analyst", "Viewer", "FactoryManager", "QA"];

const ROLE_COLORS: Record<string, string> = {
  Admin:          "bg-red-500/20 text-red-300 border-red-500/30",
  Manager:        "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Analyst:        "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Viewer:         "bg-slate-500/20 text-slate-300 border-slate-500/30",
  FactoryManager: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  QA:             "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  async fetchAll() {
    const res = await fetch("/api/permissions?type=admin-all");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<{
      users: UserRole[];
      menuPerms: MenuPermission[];
      protectedRoutes: ProtectedRoute[];
      routePerms: RoutePermission[];
      hierarchy: RoleHierarchy[];
      overrides: Override[];
    }>;
  },

  async patch(table: string, match: Record<string, unknown>, values: Record<string, unknown>) {
    const res = await fetch("/api/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, match, values }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Patch failed");
    return data;
  },

  async post(table: string, values: Record<string, unknown>, upsert = false) {
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, values, upsert }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Insert failed");
    return data as { data: unknown };
  },

  async remove(table: string, match: Record<string, unknown>) {
    const res = await fetch("/api/permissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, match }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Delete failed");
    return data;
  },
};

// ─── Toast hook ───────────────────────────────────────────────────────────────
type Toast = { id: number; message: string; type: "success" | "error" };

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function RoleBadge({ role, onRemove }: { role: string; onRemove?: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border font-medium ${ROLE_COLORS[role] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {role}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-white ml-0.5">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function RolePicker({ selectedRoles, onChange }: { selectedRoles: string[]; onChange: (roles: string[]) => void }) {
  const toggle = (role: string) =>
    onChange(selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_ROLES.map((role) => {
        const selected = selectedRoles.includes(role);
        return (
          <button key={role} onClick={() => toggle(role)}
            className={`px-2.5 py-1 rounded text-xs border font-medium transition-all ${
              selected
                ? ROLE_COLORS[role] ?? "bg-slate-600 text-slate-200 border-slate-500"
                : "bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"
            }`}>
            {selected && <Check className="inline h-3 w-3 mr-1" />}
            {role}
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-800 overflow-hidden ${className}`}>{children}</div>;
}

function CardHeader({ label, icon, count }: { label: string; icon: React.ReactNode; count?: number }) {
  return (
    <div className="bg-slate-800/50 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">{icon}{label}</h2>
      {count !== undefined && <span className="text-xs text-slate-500">{count} entries</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function RBACAdminPage() {
  const [activeTab, setActiveTab] = useState<"users" | "menu" | "routes" | "hierarchy" | "overrides">("users");
  const { toasts, toast } = useToast();
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [users, setUsers]                     = useState<UserRole[]>([]);
  const [menuPerms, setMenuPerms]             = useState<MenuPermission[]>([]);
  const [protectedRoutes, setProtectedRoutes] = useState<ProtectedRoute[]>([]);
  const [routePerms, setRoutePerms]           = useState<RoutePermission[]>([]);
  const [roleHierarchy, setRoleHierarchy]     = useState<RoleHierarchy[]>([]);
  const [overrides, setOverrides]             = useState<Override[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const d = await api.fetchAll();
      setUsers(d.users ?? []);
      setMenuPerms(d.menuPerms ?? []);
      setProtectedRoutes(d.protectedRoutes ?? []);
      setRoutePerms(d.routePerms ?? []);
      setRoleHierarchy(d.hierarchy ?? []);
      setOverrides(d.overrides ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFetchError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tabs = [
    { id: "users"     as const, label: "Users",          icon: <Users className="h-4 w-4" /> },
    { id: "menu"      as const, label: "Menu Visibility", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "routes"    as const, label: "Route Access",    icon: <Route className="h-4 w-4" /> },
    { id: "hierarchy" as const, label: "Role Hierarchy",  icon: <GitBranch className="h-4 w-4" /> },
    { id: "overrides" as const, label: "User Overrides",  icon: <ShieldAlert className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen text-slate-100 font-mono">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm shadow-2xl pointer-events-auto ${
            t.type === "success"
              ? "bg-emerald-900/95 border-emerald-500/40 text-emerald-200"
              : "bg-red-900/95 border-red-500/40 text-red-200"
          }`}>
            {t.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100">RBAC Control Center</h1>
              <p className="text-xs text-slate-500">Manage users, roles, menu visibility &amp; route access</p>
            </div>
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-6 flex">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}>
              {tab.icon}
              {tab.label}
              {/* Badge showing override count */}
              {tab.id === "overrides" && overrides.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30">
                  {overrides.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
            <span className="text-sm">Loading from Supabase...</span>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-300">{fetchError}</p>
            <button onClick={fetchAll} className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 border border-slate-700">Retry</button>
          </div>
        ) : (
          <>
            {activeTab === "users"     && <UsersTab     users={users} setUsers={setUsers} toast={toast} />}
            {activeTab === "menu"      && <MenuTab      menuPerms={menuPerms} setMenuPerms={setMenuPerms} toast={toast} />}
            {activeTab === "routes"    && <RoutesTab    protectedRoutes={protectedRoutes} setProtectedRoutes={setProtectedRoutes} routePerms={routePerms} setRoutePerms={setRoutePerms} toast={toast} />}
            {activeTab === "hierarchy" && <HierarchyTab hierarchy={roleHierarchy} setHierarchy={setRoleHierarchy} toast={toast} />}
            {activeTab === "overrides" && (
              <OverridesTab
                overrides={overrides}
                setOverrides={setOverrides}
                users={users}
                menuPerms={menuPerms}
                protectedRoutes={protectedRoutes}
                toast={toast}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — USERS
// ═══════════════════════════════════════════════════════════════════════════════
function UsersTab({ users, setUsers, toast }: {
  users: UserRole[];
  setUsers: React.Dispatch<React.SetStateAction<UserRole[]>>;
  toast: (m: string, t?: "success" | "error") => void;
}) {
  const [search, setSearch]           = useState("");
  const [saving, setSaving]           = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newUser, setNewUser]         = useState({ email: "", display_name: "", roles: [] as string[] });
  const [creating, setCreating]       = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const saveUser = async (user: UserRole) => {
    setSaving(user.id);
    try {
      await api.patch("user_roles", { id: user.id }, { roles: user.roles, display_name: user.display_name });
      setUsers((p) => p.map((u) => (u.id === user.id ? user : u)));
      setEditingUser(null);
      toast(`Updated ${user.email}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally { setSaving(null); }
  };

  const createUser = async () => {
    if (!newUser.email) return;
    setCreating(true);
    try {
      const { data } = await api.post("user_roles", {
        email:        newUser.email.toLowerCase().trim(),
        display_name: newUser.display_name || null,
        roles:        newUser.roles,
      });
      setUsers((p) => [data as UserRole, ...p]);
      setNewUser({ email: "", display_name: "", roles: [] });
      setShowNewForm(false);
      toast(`Created ${(data as UserRole).email}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Create failed", "error");
    } finally { setCreating(false); }
  };

  const deleteUser = async (user: UserRole) => {
    if (!confirm(`Delete ${user.email}?\nThis cannot be undone.`)) return;
    setDeleting(user.id);
    try {
      await api.remove("user_roles", { id: user.id });
      setUsers((p) => p.filter((u) => u.id !== user.id));
      toast(`Deleted ${user.email}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <button onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-xs text-cyan-300 font-medium transition-colors">
          <UserPlus className="h-4 w-4" /> New User
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {ALL_ROLES.map((role) => (
          <div key={role} className={`rounded-lg px-3 py-2.5 border ${ROLE_COLORS[role]}`}>
            <div className="text-xl font-bold">{users.filter((u) => u.roles.includes(role)).length}</div>
            <div className="text-xs opacity-70 mt-0.5 truncate">{role}</div>
          </div>
        ))}
      </div>

      {showNewForm && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2"><UserPlus className="h-4 w-4" />Create New User</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email *</label>
              <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@company.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Display Name</label>
              <input value={newUser.display_name} onChange={(e) => setNewUser((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Full Name"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Assign Roles</label>
            <RolePicker selectedRoles={newUser.roles} onChange={(roles) => setNewUser((p) => ({ ...p, roles }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={createUser} disabled={creating || !newUser.email}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-xs text-cyan-200 font-medium transition-colors disabled:opacity-40">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Create User
            </button>
            <button onClick={() => { setShowNewForm(false); setNewUser({ email: "", display_name: "", roles: [] }); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      <SectionCard>
        <CardHeader label="User Accounts" icon={<Users className="h-4 w-4 text-cyan-400" />} count={filtered.length} />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-800/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 w-64">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Roles</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 w-28">Updated</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="py-16 text-center text-slate-600 text-sm">
                {users.length === 0 ? "No users returned from API" : "No users match your search"}
              </td></tr>
            ) : filtered.map((user) => {
              const isEditing = editingUser?.id === user.id;
              const current   = isEditing ? editingUser! : user;
              return (
                <tr key={user.id} className={`transition-colors ${isEditing ? "bg-slate-800/50" : "hover:bg-slate-800/20"}`}>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input value={current.display_name ?? ""}
                        onChange={(e) => setEditingUser({ ...current, display_name: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 mb-1"
                        placeholder="Display name" />
                    ) : (
                      <div className="font-medium text-slate-200 text-xs truncate">
                        {user.display_name || <span className="text-slate-600 italic">No name</span>}
                      </div>
                    )}
                    <div className="text-slate-500 text-xs truncate">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <RolePicker selectedRoles={current.roles} onChange={(roles) => setEditingUser({ ...current, roles })} />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length
                          ? user.roles.map((r) => <RoleBadge key={r} role={r} />)
                          : <span className="text-slate-600 text-xs italic">No roles</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(user.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveUser(editingUser!)} disabled={saving === user.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 transition-colors disabled:opacity-40">
                            {saving === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                          </button>
                          <button onClick={() => setEditingUser(null)} className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-400">
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingUser({ ...user })} className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteUser(user)} disabled={deleting === user.id}
                            className="p-1.5 hover:bg-red-500/10 rounded text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40">
                            {deleting === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — MENU VISIBILITY
// ═══════════════════════════════════════════════════════════════════════════════
function MenuTab({ menuPerms, setMenuPerms, toast }: {
  menuPerms: MenuPermission[];
  setMenuPerms: React.Dispatch<React.SetStateAction<MenuPermission[]>>;
  toast: (m: string, t?: "success" | "error") => void;
}) {
  const [saving, setSaving]   = useState<string | null>(null);
  const [editing, setEditing] = useState<MenuPermission | null>(null);

  const toggleEnabled = async (item: MenuPermission) => {
    if (editing?.menu_id === item.menu_id) return;
    const next = { ...item, is_enabled: !item.is_enabled };
    setSaving(item.menu_id);
    try {
      await api.patch("menu_permissions", { menu_id: item.menu_id }, { is_enabled: next.is_enabled });
      setMenuPerms((p) => p.map((m) => (m.menu_id === item.menu_id ? next : m)));
      toast(`"${item.display_name || item.menu_id}" ${next.is_enabled ? "enabled" : "disabled"}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Toggle failed", "error");
    } finally { setSaving(null); }
  };

  const saveRoles = async (item: MenuPermission) => {
    setSaving(item.menu_id);
    try {
      await api.patch("menu_permissions", { menu_id: item.menu_id }, { allowed_roles: item.allowed_roles });
      setMenuPerms((p) => p.map((m) => (m.menu_id === item.menu_id ? item : m)));
      setEditing(null);
      toast(`Updated "${item.display_name || item.menu_id}" roles`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800/60 bg-slate-800/20 px-5 py-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold">Menu Visibility</span> — toggle sections on/off for all users,
          or restrict them to specific roles. An empty role list means all authenticated users can see it.
        </p>
      </div>
      <SectionCard>
        <CardHeader label="Sidebar Menu Sections" icon={<LayoutGrid className="h-4 w-4 text-cyan-400" />} count={menuPerms.length} />
        <div className="divide-y divide-slate-800/60">
          {menuPerms.length === 0 ? (
            <div className="py-16 text-center text-slate-600 text-sm">No menu_permissions rows found</div>
          ) : menuPerms.map((item) => {
            const isEdit  = editing?.menu_id === item.menu_id;
            const current = isEdit ? editing! : item;
            return (
              <div key={item.menu_id} className={`px-5 py-4 transition-colors ${isEdit ? "bg-slate-800/40" : "hover:bg-slate-800/20"}`}>
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleEnabled(item)} disabled={saving === item.menu_id} className="mt-0.5 shrink-0">
                    {saving === item.menu_id
                      ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                      : current.is_enabled ? <ToggleRight className="h-6 w-6 text-cyan-400" /> : <ToggleLeft className="h-6 w-6 text-slate-600" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                      <span className={`font-semibold text-sm ${current.is_enabled ? "text-slate-200" : "text-slate-500"}`}>
                        {item.display_name || item.menu_id}
                      </span>
                      <code className="text-xs text-slate-600 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded">{item.menu_id}</code>
                      {!current.is_enabled && <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700/80 text-slate-400 border border-slate-600/50">disabled</span>}
                    </div>
                    {isEdit ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400">Roles that can see this section:</p>
                        <RolePicker selectedRoles={current.allowed_roles} onChange={(roles) => setEditing({ ...current, allowed_roles: roles })} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveRoles(editing!)} disabled={saving === item.menu_id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 transition-colors">
                            {saving === item.menu_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                          </button>
                          <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-400">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {item.allowed_roles.length === 0
                          ? <span className="text-xs text-slate-500 italic">All roles (no restriction)</span>
                          : item.allowed_roles.map((r) => <RoleBadge key={r} role={r} />)}
                      </div>
                    )}
                  </div>
                  {!isEdit && (
                    <button onClick={() => setEditing({ ...item })} className="shrink-0 p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — ROUTE ACCESS
// ═══════════════════════════════════════════════════════════════════════════════
function RoutesTab({ protectedRoutes, setProtectedRoutes, routePerms, setRoutePerms, toast }: {
  protectedRoutes: ProtectedRoute[];
  setProtectedRoutes: React.Dispatch<React.SetStateAction<ProtectedRoute[]>>;
  routePerms: RoutePermission[];
  setRoutePerms: React.Dispatch<React.SetStateAction<RoutePermission[]>>;
  toast: (m: string, t?: "success" | "error") => void;
}) {
  const [saving, setSaving]             = useState<string | null>(null);
  const [editing, setEditing]           = useState<string | null>(null);
  const [editRoles, setEditRoles]       = useState<string[]>([]);
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [newRoute, setNewRoute]         = useState({ path_prefix: "", description: "", subcategory_id: "" });
  const [creating, setCreating]         = useState(false);

  const getRoutePerm = (path: string) => routePerms.find((r) => r.route === path);

  const toggleEnabled = async (route: ProtectedRoute) => {
    if (editing === route.path_prefix) return;
    setSaving(route.id);
    try {
      await api.patch("protected_routes", { id: route.id }, { is_enabled: !route.is_enabled });
      setProtectedRoutes((p) => p.map((r) => r.id === route.id ? { ...r, is_enabled: !r.is_enabled } : r));
      toast(`${route.path_prefix} ${!route.is_enabled ? "enabled" : "disabled"}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Toggle failed", "error");
    } finally { setSaving(null); }
  };

  const startEdit = (route: ProtectedRoute) => {
    setEditing(route.path_prefix);
    setEditRoles(getRoutePerm(route.path_prefix)?.allowed_roles ?? []);
  };

  const saveRoutePerm = async (path: string) => {
    setSaving(path);
    try {
      const existing = getRoutePerm(path);
      if (existing) {
        await api.patch("route_permissions", { route: path }, { allowed_roles: editRoles });
      } else {
        await api.post("route_permissions", { route: path, allowed_roles: editRoles });
      }
      setRoutePerms((p) => [...p.filter((r) => r.route !== path), { route: path, allowed_roles: editRoles }]);
      setEditing(null);
      toast(`Saved permissions for ${path}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally { setSaving(null); }
  };

  const createRoute = async () => {
    if (!newRoute.path_prefix) return;
    const already = protectedRoutes.find((r) => r.path_prefix === newRoute.path_prefix);
    if (already) { toast(`"${newRoute.path_prefix}" already exists`, "error"); return; }
    setCreating(true);
    try {
      const { data } = await api.post("protected_routes", {
        path_prefix:    newRoute.path_prefix,
        description:    newRoute.description || null,
        subcategory_id: newRoute.subcategory_id || null,
      });
      setProtectedRoutes((p) => [...p, data as ProtectedRoute]);
      setNewRoute({ path_prefix: "", description: "", subcategory_id: "" });
      setShowNewRoute(false);
      toast(`Route ${(data as ProtectedRoute).path_prefix} created`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Create failed", "error");
    } finally { setCreating(false); }
  };

  const deleteRoute = async (route: ProtectedRoute) => {
    if (!confirm(`Delete "${route.path_prefix}"?\nRoute permissions will also be removed (FK cascade).`)) return;
    setSaving(route.id);
    try {
      await api.remove("protected_routes", { id: route.id });
      setProtectedRoutes((p) => p.filter((r) => r.id !== route.id));
      setRoutePerms((p) => p.filter((r) => r.route !== route.path_prefix));
      toast(`Deleted ${route.path_prefix}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally { setSaving(null); }
  };

  const grouped = protectedRoutes.reduce<Record<string, ProtectedRoute[]>>((acc, r) => {
    const key = r.subcategory_id ?? "__standalone__";
    (acc[key] ??= []).push(r);
    return acc;
  }, {});
  const groupOrder = Object.keys(grouped).sort((a, b) =>
    a === "__standalone__" ? 1 : b === "__standalone__" ? -1 : a.localeCompare(b)
  );
  const isDuplicate = protectedRoutes.some((r) => r.path_prefix === newRoute.path_prefix);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl border border-slate-800/60 bg-slate-800/20 px-5 py-3 flex-1">
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-cyan-400 font-semibold">Route Access</span> — toggle routes on/off in middleware,
            and control which roles can access each path.
          </p>
        </div>
        <button onClick={() => setShowNewRoute(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-xs text-cyan-300 font-medium transition-colors">
          <Plus className="h-4 w-4" /> Add Route
        </button>
      </div>

      {showNewRoute && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-cyan-300">Add Protected Route</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Path Prefix *</label>
              <input value={newRoute.path_prefix} onChange={(e) => setNewRoute((p) => ({ ...p, path_prefix: e.target.value }))}
                placeholder="/my-route"
                className={`w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none ${isDuplicate ? "border-red-500/50" : "border-slate-700 focus:border-cyan-500/50"}`} />
              {isDuplicate && <p className="text-xs text-red-400 mt-1">Already exists — edit it in the list below</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Description</label>
              <input value={newRoute.description} onChange={(e) => setNewRoute((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Subcategory ID</label>
              <input value={newRoute.subcategory_id} onChange={(e) => setNewRoute((p) => ({ ...p, subcategory_id: e.target.value }))}
                placeholder="e.g. gps, 360"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createRoute} disabled={creating || !newRoute.path_prefix || isDuplicate}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-xs text-cyan-200 font-medium transition-colors disabled:opacity-40">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Create
            </button>
            <button onClick={() => { setShowNewRoute(false); setNewRoute({ path_prefix: "", description: "", subcategory_id: "" }); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      {protectedRoutes.length === 0 ? (
        <div className="rounded-xl border border-slate-800 py-16 text-center text-slate-600 text-sm">No protected_routes rows found</div>
      ) : groupOrder.map((groupId) => (
        <SectionCard key={groupId}>
          <CardHeader label={groupId === "__standalone__" ? "Standalone Routes" : `Group: ${groupId}`} icon={<Route className="h-4 w-4 text-cyan-400" />} count={grouped[groupId].length} />
          <div className="divide-y divide-slate-800/60">
            {grouped[groupId].map((route) => {
              const perm   = getRoutePerm(route.path_prefix);
              const isEdit = editing === route.path_prefix;
              return (
                <div key={route.id} className={`px-5 py-3.5 transition-colors ${isEdit ? "bg-slate-800/40" : "hover:bg-slate-800/20"}`}>
                  <div className="flex items-start gap-4">
                    <button onClick={() => toggleEnabled(route)} disabled={saving === route.id} className="mt-0.5 shrink-0">
                      {saving === route.id ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                        : route.is_enabled ? <ToggleRight className="h-6 w-6 text-cyan-400" /> : <ToggleLeft className="h-6 w-6 text-slate-600" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <code className={`text-xs font-mono px-2 py-0.5 rounded border ${route.is_enabled ? "bg-slate-700/60 text-cyan-300 border-slate-600" : "bg-slate-800/60 text-slate-600 border-slate-700"}`}>{route.path_prefix}</code>
                        {route.description && <span className="text-xs text-slate-500">{route.description}</span>}
                        {!route.is_enabled && <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700/80 text-slate-400 border border-slate-600/50">disabled</span>}
                      </div>
                      {isEdit ? (
                        <div className="space-y-2 mt-2">
                          <p className="text-xs text-slate-400">Allowed roles:</p>
                          <RolePicker selectedRoles={editRoles} onChange={setEditRoles} />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => saveRoutePerm(route.path_prefix)} disabled={saving === route.path_prefix}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 transition-colors">
                              {saving === route.path_prefix ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                            </button>
                            <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-400">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {perm?.allowed_roles?.length
                            ? perm.allowed_roles.map((r) => <RoleBadge key={r} role={r} />)
                            : <span className="text-xs text-slate-600 italic">No permission row — add roles to protect</span>}
                        </div>
                      )}
                    </div>
                    {!isEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(route)} className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteRoute(route)} disabled={saving === route.id}
                          className="p-1.5 hover:bg-red-500/10 rounded text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40">
                          {saving === route.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — ROLE HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════════
function HierarchyTab({ hierarchy, setHierarchy, toast }: {
  hierarchy: RoleHierarchy[];
  setHierarchy: React.Dispatch<React.SetStateAction<RoleHierarchy[]>>;
  toast: (m: string, t?: "success" | "error") => void;
}) {
  const [saving, setSaving]   = useState<string | null>(null);
  const [editing, setEditing] = useState<RoleHierarchy | null>(null);

  const save = async (item: RoleHierarchy) => {
    setSaving(item.role);
    try {
      await api.post("role_hierarchy", { role: item.role, inherited_roles: item.inherited_roles }, true);
      setHierarchy((p) => {
        const exists = p.some((h) => h.role === item.role);
        return exists ? p.map((h) => (h.role === item.role ? item : h)) : [...p, item];
      });
      setEditing(null);
      toast(`Updated ${item.role} hierarchy`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally { setSaving(null); }
  };

  const allEntries = ALL_ROLES.map(
    (role) => hierarchy.find((h) => h.role === role) ?? { role, inherited_roles: [] }
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800/60 bg-slate-800/20 px-5 py-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-amber-400 font-semibold">Role Hierarchy</span> — when a user has a role, they automatically
          inherit all roles listed under it. Expanded at login and stored in the session.
        </p>
      </div>
      <SectionCard>
        <CardHeader label="Role Inheritance" icon={<GitBranch className="h-4 w-4 text-cyan-400" />} />
        <div className="divide-y divide-slate-800/60">
          {allEntries.map((item) => {
            const isEdit  = editing?.role === item.role;
            const current = isEdit ? editing! : item;
            const others  = ALL_ROLES.filter((r) => r !== item.role);
            return (
              <div key={item.role} className={`px-5 py-4 transition-colors ${isEdit ? "bg-slate-800/40" : "hover:bg-slate-800/20"}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2.5">
                      <RoleBadge role={item.role} />
                      <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                      <span className="text-xs text-slate-500">inherits</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    {isEdit ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400">Roles that <strong className="text-slate-300">{item.role}</strong> should inherit:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {others.map((role) => {
                            const selected = current.inherited_roles.includes(role);
                            return (
                              <button key={role}
                                onClick={() => {
                                  const next = selected ? current.inherited_roles.filter((r) => r !== role) : [...current.inherited_roles, role];
                                  setEditing({ ...current, inherited_roles: next });
                                }}
                                className={`px-2.5 py-1 rounded text-xs border font-medium transition-all ${selected ? ROLE_COLORS[role] ?? "bg-slate-600 text-slate-200 border-slate-500" : "bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"}`}>
                                {selected && <Check className="inline h-3 w-3 mr-1" />}{role}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => save(editing!)} disabled={saving === item.role}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 transition-colors">
                            {saving === item.role ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                          </button>
                          <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-400">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {item.inherited_roles.length
                          ? item.inherited_roles.map((r) => <RoleBadge key={r} role={r} />)
                          : <span className="text-xs text-slate-600 italic">No inherited roles</span>}
                      </div>
                    )}
                  </div>
                  {!isEdit && (
                    <button onClick={() => setEditing({ ...item })} className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors shrink-0">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — USER OVERRIDES
// ═══════════════════════════════════════════════════════════════════════════════
function OverridesTab({ overrides, setOverrides, users, menuPerms, protectedRoutes, toast }: {
  overrides: Override[];
  setOverrides: React.Dispatch<React.SetStateAction<Override[]>>;
  users: UserRole[];
  menuPerms: MenuPermission[];
  protectedRoutes: ProtectedRoute[];
  toast: (m: string, t?: "success" | "error") => void;
}) {
  const [search, setSearch]     = useState("");
  const [saving, setSaving]     = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newOv, setNewOv]       = useState({
    email:       "",
    target_type: "route" as "route" | "menu",
    target_id:   "",
    effect:      "deny"  as "grant" | "deny",
  });
  const [creating, setCreating] = useState(false);

  // Group overrides by email
  const grouped = overrides.reduce<Record<string, Override[]>>((acc, o) => {
    (acc[o.email] ??= []).push(o);
    return acc;
  }, {});

  const filteredEmails = Object.keys(grouped).filter((e) =>
    e.toLowerCase().includes(search.toLowerCase())
  );

  // Dropdown options for target_id based on selected type
  const targetOptions = newOv.target_type === "menu"
    ? menuPerms.map((m) => ({ value: m.menu_id,      label: m.display_name || m.menu_id }))
    : protectedRoutes.map((r) => ({ value: r.path_prefix, label: r.path_prefix }));

  const createOverride = async () => {
    if (!newOv.email || !newOv.target_id) return;
    setCreating(true);
    try {
      const { data } = await api.post("user_permission_overrides", {
        email:       newOv.email,
        target_type: newOv.target_type,
        target_id:   newOv.target_id,
        effect:      newOv.effect,
      }, true); // upsert — updates if same email+target_type+target_id already exists
      const created = data as Override;
      setOverrides((p) => {
        const exists = p.find((o) => o.id === created.id);
        return exists ? p.map((o) => o.id === created.id ? created : o) : [...p, created];
      });
      setNewOv({ email: "", target_type: "route", target_id: "", effect: "deny" });
      setShowForm(false);
      toast(`Override set for ${created.email}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Create failed", "error");
    } finally { setCreating(false); }
  };

  // Click the effect badge to flip grant ↔ deny
  const flipEffect = async (ov: Override) => {
    setSaving(ov.id);
    const next = ov.effect === "grant" ? "deny" : "grant";
    try {
      await api.patch("user_permission_overrides", { id: ov.id }, { effect: next });
      setOverrides((p) => p.map((o) => o.id === ov.id ? { ...o, effect: next } : o));
      toast(`Changed to ${next}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally { setSaving(null); }
  };

  const removeOverride = async (ov: Override) => {
    setDeleting(ov.id);
    try {
      await api.remove("user_permission_overrides", { id: ov.id });
      setOverrides((p) => p.filter((o) => o.id !== ov.id));
      toast(`Removed override for ${ov.target_id}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-5 py-3.5">
        <p className="text-xs text-amber-200/70 leading-relaxed">
          <span className="text-amber-400 font-semibold">User Overrides</span> — per-user exceptions on top of RBAC.
          Priority: <span className="text-red-400 font-medium">User DENY</span> beats everything →{" "}
          <span className="text-emerald-400 font-medium">User GRANT</span> overrides role denial →{" "}
          <span className="text-slate-300 font-medium">RBAC role</span> is the fallback baseline.
          To fully block a user from a section, add both a <code className="bg-slate-800/80 px-1 rounded">menu</code> deny
          (hides sidebar) and a <code className="bg-slate-800/80 px-1 rounded">route</code> deny (blocks direct URL access).
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <button onClick={() => setShowForm(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-300 font-medium transition-colors">
          <Plus className="h-4 w-4" /> Add Override
        </button>
      </div>

      {/* New override form */}
      {showForm && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Add User Override
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Email — datalist for autocomplete from existing users */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">User Email *</label>
              <input
                list="override-user-emails"
                value={newOv.email}
                onChange={(e) => setNewOv((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@company.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <datalist id="override-user-emails">
                {users.map((u) => <option key={u.email} value={u.email}>{u.display_name}</option>)}
              </datalist>
            </div>

            {/* Effect toggle */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Effect *</label>
              <div className="flex gap-2">
                {(["deny", "grant"] as const).map((effect) => (
                  <button key={effect} onClick={() => setNewOv((p) => ({ ...p, effect }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      newOv.effect === effect
                        ? effect === "deny"
                          ? "bg-red-500/20 border-red-500/40 text-red-300"
                          : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
                    }`}>
                    {effect === "deny" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {effect === "deny" ? "Deny" : "Grant"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target type toggle */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Target Type *</label>
              <div className="flex gap-2">
                {(["route", "menu"] as const).map((type) => (
                  <button key={type} onClick={() => setNewOv((p) => ({ ...p, target_type: type, target_id: "" }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      newOv.target_type === type
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
                    }`}>
                    {type === "route" ? "Route (URL block)" : "Menu (Sidebar hide)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Target ID dropdown */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {newOv.target_type === "route" ? "Route Path *" : "Menu Section *"}
              </label>
              <select
                value={newOv.target_id}
                onChange={(e) => setNewOv((p) => ({ ...p, target_id: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Select {newOv.target_type === "route" ? "a route" : "a menu section"}...</option>
                {targetOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live preview of what the override will do */}
          {newOv.email && newOv.target_id && (
            <div className={`rounded-lg px-4 py-2.5 border text-xs flex items-center gap-2 ${
              newOv.effect === "deny"
                ? "bg-red-950/30 border-red-500/20 text-red-300"
                : "bg-emerald-950/30 border-emerald-500/20 text-emerald-300"
            }`}>
              {newOv.effect === "deny"
                ? <EyeOff className="h-3.5 w-3.5 shrink-0" />
                : <ShieldCheck className="h-3.5 w-3.5 shrink-0" />}
              <span>
                <strong>{newOv.email}</strong> will be{" "}
                <strong>{newOv.effect === "deny" ? "blocked from" : "granted access to"}</strong>{" "}
                {newOv.target_type}{" "}
                <code className="bg-slate-800/60 px-1 rounded">{newOv.target_id}</code>{" "}
                regardless of their role.
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={createOverride} disabled={creating || !newOv.email || !newOv.target_id}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs text-amber-200 font-medium transition-colors disabled:opacity-40">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Set Override
            </button>
            <button onClick={() => { setShowForm(false); setNewOv({ email: "", target_type: "route", target_id: "", effect: "deny" }); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      {/* Override list grouped by user */}
      {overrides.length === 0 ? (
        <div className="rounded-xl border border-slate-800 py-16 text-center space-y-2">
          <ShieldCheck className="h-8 w-8 text-slate-700 mx-auto" />
          <p className="text-slate-600 text-sm">No user overrides set</p>
          <p className="text-slate-700 text-xs">All access is controlled purely by RBAC roles</p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="rounded-xl border border-slate-800 py-10 text-center text-slate-600 text-sm">No users match your search</div>
      ) : (
        <div className="space-y-3">
          {filteredEmails.map((email) => {
            const userOverrides = grouped[email];
            const user          = users.find((u) => u.email === email);
            const denyCount     = userOverrides.filter((o) => o.effect === "deny").length;
            const grantCount    = userOverrides.filter((o) => o.effect === "grant").length;

            return (
              <SectionCard key={email}>
                {/* User header row */}
                <div className="bg-slate-800/40 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {email.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {user?.display_name || email}
                      </div>
                      {user?.display_name && <div className="text-xs text-slate-500">{email}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1 ml-1">
                      {user?.roles.map((r) => <RoleBadge key={r} role={r} />)}
                    </div>
                  </div>
                  {/* Summary counts */}
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    {denyCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                        {denyCount} denied
                      </span>
                    )}
                    {grantCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        {grantCount} granted
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual override rows */}
                <div className="divide-y divide-slate-800/60">
                  {userOverrides.map((ov) => (
                    <div key={ov.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      {/* Clickable effect badge — click to flip grant↔deny */}
                      <button
                        onClick={() => flipEffect(ov)}
                        disabled={saving === ov.id}
                        title="Click to toggle grant / deny"
                        className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          ov.effect === "deny"
                            ? "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/25"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25"
                        }`}>
                        {saving === ov.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : ov.effect === "deny"
                            ? <EyeOff className="h-3 w-3" />
                            : <ShieldCheck className="h-3 w-3" />
                        }
                        {ov.effect}
                      </button>

                      {/* Target type pill */}
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs border font-mono ${
                        ov.target_type === "route"
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                      }`}>
                        {ov.target_type}
                      </span>

                      {/* Target ID */}
                      <code className="flex-1 text-xs text-slate-300 font-mono bg-slate-800/60 px-2 py-1 rounded border border-slate-700/60 truncate">
                        {ov.target_id}
                      </code>

                      {/* Date added */}
                      <span className="text-xs text-slate-600 shrink-0">
                        {new Date(ov.granted_at).toLocaleDateString()}
                      </span>

                      {/* Remove button */}
                      <button
                        onClick={() => removeOverride(ov)}
                        disabled={deleting === ov.id}
                        className="shrink-0 p-1.5 hover:bg-red-500/10 rounded text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40">
                        {deleting === ov.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}