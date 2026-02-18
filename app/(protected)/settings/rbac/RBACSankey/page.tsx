"use client";

import { useState, useEffect, useRef } from "react";

const ROLE_COLORS = {
  Admin:          "#ef4444",
  Manager:        "#f97316",
  Analyst:        "#06b6d4",
  Viewer:         "#64748b",
  FactoryManager: "#f59e0b",
  QA:             "#8b5cf6",
};

const USER_COLOR  = "#22d3ee";
const ROUTE_COLOR = "#34d399";
const DENY_COLOR  = "#ef4444";
const GRANT_COLOR = "#10b981";

const COL_USER  = 60;
const COL_ROLE  = 360;
const COL_ROUTE = 660;
const NODE_W    = 180;
const NODE_H    = 36;
const GAP       = 12;
const SVG_W     = 920;

export default function RBACSankey() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [hovered, setHovered]   = useState(null); // nodeId string or null
  const [selected, setSelected] = useState(null); // nodeId string or null
  const svgRef = useRef(null);

  useEffect(() => {
    fetch("/api/permissions?type=admin-all", { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => {
        setData({
          users: (json.users ?? []).map((u) => ({
            id: u.id, email: u.email,
            display_name: u.display_name, roles: u.roles ?? [],
          })),
          routePerms: (json.routePerms ?? []).map((r) => ({
            route: r.route, allowed_roles: r.allowed_roles ?? [],
          })),
          overrides: (json.overrides ?? []).filter((o) => o.target_type === "route"),
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm font-mono">
      Loading RBAC data…
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-400 text-sm font-mono">
      {error}
    </div>
  );

  const { users, routePerms, overrides } = data;

  function userRouteEffect(userEmail, route) {
    const ov = overrides.find((o) => o.email === userEmail && o.target_id === route);
    return ov?.effect ?? null;
  }

  function routeOverrideMap(route) {
    return Object.fromEntries(
      overrides.filter((o) => o.target_id === route).map((o) => [o.email, o.effect])
    );
  }

  // ── Graph ────────────────────────────────────────────────────────────────
  const allRoles = [...new Set(users.flatMap((u) => u.roles))].sort();

  const urEdges = users.flatMap((u) =>
    u.roles.map((r) => ({
      from: `u:${u.id}`, to: `r:${r}`, type: "user-role", effect: null,
    }))
  );

  const rrEdges = routePerms.flatMap((rp) =>
    rp.allowed_roles.map((r) => {
      const usersWithRole = users.filter((u) => u.roles.includes(r));
      const effects = usersWithRole.map((u) => userRouteEffect(u.email, rp.route)).filter(Boolean);
      const effect  = effects.includes("deny") ? "deny" : effects.includes("grant") ? "grant" : null;
      return { from: `r:${r}`, to: `rt:${rp.route}`, type: "role-route", effect };
    })
  );

  const allEdges = [...urEdges, ...rrEdges];

  // ── Nodes ────────────────────────────────────────────────────────────────
  const userNodes = users.map((u, i) => ({
    id: `u:${u.id}`, label: u.display_name || u.email, sub: u.email,
    x: COL_USER, y: i * (NODE_H + GAP), color: USER_COLOR,
    overrideEffect: null, overrideUsers: null,
  }));

  const roleNodes = allRoles.map((r, i) => ({
    id: `r:${r}`, label: r,
    x: COL_ROLE, y: i * (NODE_H + GAP),
    color: ROLE_COLORS[r] ?? "#94a3b8",
    overrideEffect: null, overrideUsers: null,
  }));

  const routeNodes = routePerms.map((rp, i) => {
    const ovm    = routeOverrideMap(rp.route);
    const effects = Object.values(ovm);
    const overrideEffect = effects.includes("deny") ? "deny" : effects.includes("grant") ? "grant" : null;
    return {
      id: `rt:${rp.route}`, label: rp.route,
      x: COL_ROUTE, y: i * (NODE_H + GAP),
      color: ROUTE_COLOR, overrideEffect, overrideUsers: ovm,
    };
  });

  const allNodes = [...userNodes, ...roleNodes, ...routeNodes];
  const nodeMap  = Object.fromEntries(allNodes.map((n) => [n.id, n]));

  const SVG_H = Math.max(userNodes.length, roleNodes.length, routeNodes.length) * (NODE_H + GAP) + 60;

  // ── Highlight logic ───────────────────────────────────────────────────────
  // Only direct neighbours — ONE hop from the active node.
  // User   → its roles, and roles' routes
  // Role   → its users + its routes (direct only, NOT users of sibling roles)
  // Route  → its roles + those roles' users
  const activeId = selected ?? hovered;

  function getDirectConnected(nodeId) {
    if (!nodeId) return { nodes: new Set(), edges: new Set() };

    const nodes = new Set([nodeId]);
    const edges = new Set();

    // First hop
    allEdges.forEach((e, i) => {
      if (e.from === nodeId) { nodes.add(e.to);   edges.add(i); }
      if (e.to   === nodeId) { nodes.add(e.from); edges.add(i); }
    });

    // Second hop — but ONLY along the chain of the active node
    // i.e. if active is a Role, we want users who connect TO that role
    // AND routes that connect FROM that role — not all edges of those nodes.
    const firstHop = new Set(nodes);
    allEdges.forEach((e, i) => {
      // Only extend if one end is the active node's direct neighbour
      // AND the other end is in the same direction (don't cross-connect)
      const fromIsFirst = firstHop.has(e.from) && e.from !== nodeId;
      const toIsFirst   = firstHop.has(e.to)   && e.to   !== nodeId;

      if (fromIsFirst && !nodes.has(e.to)) {
        // extend downstream from first-hop neighbour
        // only if active node is upstream of that neighbour
        const activeIsUpstream = allEdges.some((x) => x.from === nodeId && x.to === e.from);
        if (activeIsUpstream) { nodes.add(e.to); edges.add(i); }
      }
      if (toIsFirst && !nodes.has(e.from)) {
        // extend upstream from first-hop neighbour
        const activeIsDownstream = allEdges.some((x) => x.to === nodeId && x.from === e.to);
        if (activeIsDownstream) { nodes.add(e.from); edges.add(i); }
      }
    });

    return { nodes, edges };
  }

  const { nodes: hlNodes, edges: hlEdges } = getDirectConnected(activeId);
  const isFiltering = activeId !== null;

  // ── Edge renderer ─────────────────────────────────────────────────────────
  function edgeOpacity(idx) {
    if (!isFiltering) return 0.18; // idle — show all dimmed
    return hlEdges.has(idx) ? 0.88 : 0.04; // hover — show connected bright, hide rest
  }

  function edgePath(e, idx) {
    const from = nodeMap[e.from];
    const to   = nodeMap[e.to];
    if (!from || !to) return null;

    const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2;
    const x2 = to.x,            y2 = to.y   + NODE_H / 2;
    const cx  = (x1 + x2) / 2;

    const isOverride  = e.effect !== null;
    const strokeColor = isOverride
      ? (e.effect === "deny" ? DENY_COLOR : GRANT_COLOR)
      : from.color;

    const opacity = edgeOpacity(idx);
    const isHL    = hlEdges.has(idx);

    return (
      <path key={idx}
        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isHL ? (isOverride ? 2.5 : 2) : isOverride ? 1.8 : 1.5}
        strokeOpacity={opacity}
        strokeDasharray={isOverride ? (e.effect === "deny" ? "5 4" : "8 3") : "none"}
        style={{ transition: "stroke-opacity 0.15s, stroke-width 0.15s" }}
      />
    );
  }

  // ── Node renderer ─────────────────────────────────────────────────────────
  function nodeOpacity(nodeId) {
    if (!isFiltering) return 1;       // idle — all nodes full
    return hlNodes.has(nodeId) ? 1 : 0.15; // hover — connected full, rest ghost
  }

  function renderNode(n) {
    const opacity    = nodeOpacity(n.id);
    const isActive   = activeId === n.id;
    const isSelected = selected === n.id;
    const hasOverride = n.overrideEffect !== null;
    const badgeColor  = n.overrideEffect === "deny" ? DENY_COLOR : GRANT_COLOR;

    return (
      <g key={n.id}
        transform={`translate(${n.x}, ${n.y})`}
        style={{ cursor: "pointer", opacity, transition: "opacity 0.15s" }}
        onMouseEnter={() => !selected && setHovered(n.id)}
        onMouseLeave={() => !selected && setHovered(null)}
        onClick={() => setSelected(isSelected ? null : n.id)}>

        {isActive && (
          <rect x={-3} y={-3} width={NODE_W + 6} height={NODE_H + 6} rx={8}
            fill={n.color} fillOpacity={0.15} />
        )}

        <rect width={NODE_W} height={NODE_H} rx={6}
          fill={isActive ? n.color + "22" : "#1e293b"}
          stroke={hasOverride && isActive ? badgeColor : n.color}
          strokeWidth={isActive ? 1.5 : hasOverride ? 1 : 0.8}
          strokeDasharray={hasOverride ? "4 3" : "none"}
          style={{ transition: "all 0.15s" }} />

        <rect width={3} height={NODE_H} rx={2} fill={n.color} />

        <text x={12} y={NODE_H / 2 - (n.sub ? 4 : 0)}
          dominantBaseline="middle" fontSize={11} fontWeight={600}
          fill={isActive ? "#f1f5f9" : "#94a3b8"}
          fontFamily="'JetBrains Mono', monospace">
          {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
        </text>

        {n.sub && (
          <text x={12} y={NODE_H / 2 + 8}
            dominantBaseline="middle" fontSize={8.5}
            fill={isActive ? n.color : "#475569"}
            fontFamily="'JetBrains Mono', monospace">
            {n.sub.length > 24 ? n.sub.slice(0, 23) + "…" : n.sub}
          </text>
        )}

        {hasOverride && (
          <g transform={`translate(${NODE_W - 10}, -6)`}>
            <circle r={6} fill={badgeColor} fillOpacity={0.15}
              stroke={badgeColor} strokeWidth={1} />
            <text textAnchor="middle" dominantBaseline="middle"
              fontSize={7} fontWeight={700} fill={badgeColor}>
              {n.overrideEffect === "deny" ? "✕" : "✓"}
            </text>
          </g>
        )}
      </g>
    );
  }

  // ── Info panel ────────────────────────────────────────────────────────────
  function InfoPanel() {
    if (!activeId) return (
      <div className="text-center text-slate-600 text-xs py-6 leading-relaxed">
        Click or hover a node<br />to explore connections
      </div>
    );
    const node = nodeMap[activeId];
    if (!node) return null;

    const connectedEdges = allEdges.filter((e) => e.from === activeId || e.to === activeId);
    const upstream   = [...new Set(connectedEdges.filter((e) => e.to   === activeId).map((e) => nodeMap[e.from]?.label))].filter(Boolean);
    const downstream = [...new Set(connectedEdges.filter((e) => e.from === activeId).map((e) => nodeMap[e.to]?.label))].filter(Boolean);
    const ovEntries  = node.overrideUsers ? Object.entries(node.overrideUsers) : [];

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: node.color }} />
          <span className="text-sm font-bold text-slate-200 font-mono">{node.label}</span>
        </div>
        {node.sub && <div className="text-xs text-slate-500 font-mono">{node.sub}</div>}

        {upstream.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1.5 uppercase tracking-wider">← From</div>
            <div className="flex flex-wrap gap-1">
              {upstream.map((l) => (
                <span key={l} className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300 font-mono">{l}</span>
              ))}
            </div>
          </div>
        )}

        {downstream.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1.5 uppercase tracking-wider">→ To</div>
            <div className="flex flex-wrap gap-1">
              {downstream.map((l) => (
                <span key={l} className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300 font-mono">{l}</span>
              ))}
            </div>
          </div>
        )}

        {ovEntries.length > 0 && (
          <div className="border-t border-slate-800 pt-3 space-y-1.5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Overrides</div>
            {ovEntries.map(([email, effect]) => (
              <div key={email} className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold border font-mono ${
                  effect === "deny"
                    ? "bg-red-500/15 text-red-400 border-red-500/25"
                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                }`}>{effect}</span>
                <span className="text-xs text-slate-500 font-mono truncate">{email.split("@")[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const totalDeny  = overrides.filter((o) => o.effect === "deny").length;
  const totalGrant = overrides.filter((o) => o.effect === "grant").length;

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      className="min-h-screen text-slate-100 p-6">

      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            RBAC Flow
            <span className="ml-2 text-xs font-normal text-slate-500 border border-slate-700 px-2 py-0.5 rounded">
              Users → Roles → Routes
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Hover to trace connections · Click to lock selection</p>
        </div>
        {overrides.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {totalDeny > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400">
                <span className="font-bold">✕</span> {totalDeny} denied
              </span>
            )}
            {totalGrant > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                <span className="font-bold">✓</span> {totalGrant} granted
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 overflow-x-auto">
          {/* Column headers */}
          <div className="flex mb-3" style={{ paddingLeft: COL_USER }}>
            {[
              { label: "USERS",  color: USER_COLOR,  width: COL_ROLE - COL_USER },
              { label: "ROLES",  color: "#94a3b8",   width: COL_ROUTE - COL_ROLE },
              { label: "ROUTES", color: ROUTE_COLOR, width: NODE_W },
            ].map(({ label, color, width }) => (
              <div key={label} style={{ color, width, minWidth: width }}
                className="text-xs font-bold tracking-[0.2em] uppercase">
                {label}
              </div>
            ))}
          </div>

          <svg ref={svgRef} width={SVG_W} height={SVG_H} className="overflow-visible">
            {/* Normal edges first, overrides on top */}
            <g>{allEdges.filter((e) => !e.effect).map((e) => edgePath(e, allEdges.indexOf(e)))}</g>
            <g>{allEdges.filter((e) =>  e.effect).map((e) => edgePath(e, allEdges.indexOf(e)))}</g>
            <g>{allNodes.map((n) => renderNode(n))}</g>
          </svg>
        </div>

        {/* Right panel */}
        <div className="w-52 shrink-0">
          <div className="sticky top-6 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspector</div>
              <InfoPanel />
              {selected && (
                <button onClick={() => setSelected(null)}
                  className="w-full text-xs text-slate-600 hover:text-slate-400 border border-slate-800 rounded py-1.5 transition-colors">
                  Clear selection
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Roles</div>
              {Object.entries(ROLE_COLORS).map(([role, color]) => (
                <div key={role} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs text-slate-400">{role}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Edge Types</div>
              <div className="flex items-center gap-2">
                <svg width={32} height={10}>
                  <line x1={0} y1={5} x2={32} y2={5} stroke="#64748b" strokeWidth={1.5} />
                </svg>
                <span className="text-xs text-slate-400">RBAC access</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width={32} height={10}>
                  <line x1={0} y1={5} x2={32} y2={5} stroke={DENY_COLOR} strokeWidth={1.8} strokeDasharray="5 4" />
                </svg>
                <span className="text-xs text-slate-400">Override deny</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width={32} height={10}>
                  <line x1={0} y1={5} x2={32} y2={5} stroke={GRANT_COLOR} strokeWidth={1.8} strokeDasharray="8 3" />
                </svg>
                <span className="text-xs text-slate-400">Override grant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}