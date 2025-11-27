"use client";

import React from "react";
import ReactECharts from "echarts-for-react";

type ColumnType = "integer" | "float" | "string" | "date";

interface ColumnMeta {
  type: ColumnType;
  synonyms: string[];
}

interface TableMeta {
  description: string;
  columns: Record<string, ColumnMeta>;
  synonyms: string[];
}

interface AccessControl {
  read: string[];
  write?: string[];
  columnConstraints?: Record<string, string[]>;
}

interface Catalog {
  tables: Record<string, TableMeta>;
  accessControl: Record<string, AccessControl>;
}

interface SankeyProps {
  catalog: Catalog;
  selectedTables: string[];
  currentUserRoles: string[];
  roles: string[];
  queryName?: string;
}

export default function SemanticSankeyDemo({
  catalog,
  selectedTables,
  currentUserRoles,
  roles,
  queryName = "exampleQuery",
}: SankeyProps) {
  const nodes = [
    // Roles on the left
    ...roles.map((role) => ({
      name: `role:${role}`,
      label: { show: true },
      itemStyle: { color: "#6a9fb5" },
      x: 0.1,
    })),

    // Tables in the middle
    ...Object.keys(catalog.tables).map((table) => {
      const accessRoles = catalog.accessControl[table]?.read || [];
      const hasAccess = currentUserRoles.some((role) =>
        accessRoles.includes(role)
      );
      const isSelected = selectedTables.includes(table);
      const color = isSelected && !hasAccess ? "#ff4d4f" : "#9dc88d";

      return {
        name: `table:${table}`,
        label: { show: true },
        itemStyle: { color },
        x: 0.5,
      };
    }),

    // Query on the right
    {
      name: `query:${queryName}`,
      label: { show: true },
      itemStyle: { color: "#f4a261" },
      x: 0.9,
    },
  ];

  const roleToTableLinks = Object.entries(catalog.accessControl).flatMap(
    ([tableName, ac]) => {
      if (!ac.read) return [];
      return ac.read.map((role) => ({
        source: `role:${role}`,
        target: `table:${tableName}`,
        value: 1,
        lineStyle: { color: "#6a9fb5", opacity: 0.6 },
      }));
    }
  );

  const queryToTableLinks = selectedTables.map((table) => {
    const accessRoles = catalog.accessControl[table]?.read || [];
    const hasAccess = currentUserRoles.some((role) =>
      accessRoles.includes(role)
    );

    return {
      source: `query:${queryName}`, // FROM query on right
      target: `table:${table}`, // TO table in middle
      value: 2,
      lineStyle: {
        color: hasAccess ? "#f4a261" : "#ff4d4f",
        opacity: 0.9,
        width: 3,
      },
    };
  });

  const option = {
    title: {
      text: `Semantic Model Sankey - Query: ${queryName} | Role${
        currentUserRoles.length > 1 ? "s" : ""
      }: ${currentUserRoles.join(", ")}`,
      left: "center",
      textStyle: { fontWeight: "bold", fontSize: 18 },
    },
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
    },
    series: [
      {
        type: "sankey",
        layout: "none", // allow manual x positioning
        emphasis: {
          focus: "adjacency",
        },
        data: nodes,
        links: [...roleToTableLinks, ...queryToTableLinks],
        label: {
          formatter: (params: any) => {
            if (params.name.startsWith("role:"))
              return params.name.replace("role:", "Role: ");
            if (params.name.startsWith("table:"))
              return params.name.replace("table:", "Table: ");
            if (params.name.startsWith("query:")) return "Query";
            return params.name;
          },
          color: "#333",
          fontWeight: "bold",
          fontSize: 12,
        },
        lineStyle: {
          color: "source",
          curveness: 0.5,
          opacity: 0.5,
        },
        nodeWidth: 22,
        nodeGap: 15,
      },
    ],
  };

  return (
    <div style={{ maxWidth: 1000, margin: "auto" }}>
      <ReactECharts option={option} style={{ height: 600, width: "100%" }} />
    </div>
  );
}
