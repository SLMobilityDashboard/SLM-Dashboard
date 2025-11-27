"use client";

import React from "react";
import ReactECharts from "echarts-for-react";

const tableColumnsMap = {
  DimCustomer: ["CustID", "CustName", "CustRegion"],
  DimProduct: ["ProdID", "ProdName", "Category"],
  FactSales: ["SaleID", "CustID_FK", "ProdID_FK", "SaleAmount", "SaleDate"],
  FactInventory: ["InvID", "ProdID_FK", "Quantity", "InventoryDate"],
};

const warehouseSankeyOption = {
  title: {
    text: "Data Warehouse Model with Columns in Tooltips",
    left: "center",
    textStyle: { fontSize: 20, fontWeight: "bold" },
  },
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      // Show columns if node is a table
      if (tableColumnsMap[params.name]) {
        const columns = tableColumnsMap[params.name].join("<br/>");
        return `<b>${params.name}</b><br/><u>Columns:</u><br/>${columns}`;
      }
      // Default tooltip for other nodes
      return params.name;
    },
  },
  legend: {
    data: [
      "Source Systems",
      "Staging Areas",
      "ETL / Transform",
      "Data Warehouse Tables",
      "Data Marts",
      "BI Tools",
    ],
    bottom: 10,
  },
  series: [
    {
      type: "sankey",
      layout: "none",
      emphasis: { focus: "adjacency" },
      data: [
        // Source Systems
        { name: "CRM", itemStyle: { color: "#5470C6" } },
        { name: "ERP", itemStyle: { color: "#91CC75" } },
        { name: "Web Analytics", itemStyle: { color: "#FAC858" } },
        { name: "POS", itemStyle: { color: "#EE6666" } },

        // Staging Areas
        { name: "Raw Data", itemStyle: { color: "#73C0DE" } },
        { name: "Cleansing", itemStyle: { color: "#3BA272" } },
        { name: "Validation", itemStyle: { color: "#FAC858" } },

        // ETL / Transform
        { name: "Customer ETL", itemStyle: { color: "#91CC75" } },
        { name: "Sales ETL", itemStyle: { color: "#5470C6" } },
        { name: "Product ETL", itemStyle: { color: "#EE6666" } },

        // Data Warehouse Tables (single nodes)
        { name: "DimCustomer", itemStyle: { color: "#73C0DE" } },
        { name: "DimProduct", itemStyle: { color: "#3BA272" } },
        { name: "FactSales", itemStyle: { color: "#FAC858" } },
        { name: "FactInventory", itemStyle: { color: "#EE6666" } },

        // Data Marts
        { name: "Sales Mart", itemStyle: { color: "#5470C6" } },
        { name: "Inventory Mart", itemStyle: { color: "#91CC75" } },
        { name: "Marketing Mart", itemStyle: { color: "#FAC858" } },

        // BI Tools
        { name: "BI Tools", itemStyle: { color: "#91CC75" } },
      ],
      links: [
        // Sources → Staging
        { source: "CRM", target: "Raw Data", value: 100 },
        { source: "ERP", target: "Raw Data", value: 120 },
        { source: "Web Analytics", target: "Raw Data", value: 80 },
        { source: "POS", target: "Raw Data", value: 90 },

        // Staging flows
        { source: "Raw Data", target: "Cleansing", value: 350 },
        { source: "Cleansing", target: "Validation", value: 340 },

        // Validation → ETL
        { source: "Validation", target: "Customer ETL", value: 110 },
        { source: "Validation", target: "Sales ETL", value: 140 },
        { source: "Validation", target: "Product ETL", value: 90 },

        // ETL → Data Warehouse Tables
        { source: "Customer ETL", target: "DimCustomer", value: 110 },
        { source: "Sales ETL", target: "FactSales", value: 140 },
        { source: "Product ETL", target: "DimProduct", value: 90 },
        { source: "Product ETL", target: "FactInventory", value: 70 },

        // DW Tables → Data Marts
        { source: "DimCustomer", target: "Marketing Mart", value: 110 },
        { source: "FactSales", target: "Sales Mart", value: 140 },
        { source: "FactInventory", target: "Inventory Mart", value: 70 },
        { source: "DimProduct", target: "Inventory Mart", value: 50 },

        // Data Marts → BI Tools
        { source: "Sales Mart", target: "BI Tools", value: 130 },
        { source: "Inventory Mart", target: "BI Tools", value: 90 },
        { source: "Marketing Mart", target: "BI Tools", value: 100 },
      ],
      label: {
        color: "#000",
        fontWeight: "bold",
      },
      lineStyle: {
        color: "gradient",
        curveness: 0.5,
        opacity: 0.7,
      },
      itemStyle: {
        borderWidth: 1,
        borderColor: "#aaa",
      },
      nodeWidth: 20,
      nodeGap: 18,
    },
  ],
};

export default function WarehouseSankeyWithTooltipColumns() {
  return (
    <div style={{ maxWidth: 1100, margin: "auto", padding: 20 }}>
      <ReactECharts
        option={warehouseSankeyOption}
        style={{ height: 700, width: "100%" }}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}
