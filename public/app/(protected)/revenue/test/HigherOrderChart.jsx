"use client";

import React, { useState } from "react";
import ReactECharts from "echarts-for-react";

// Utility to add tooltip and legend if missing
const enhanceOption = (option) => ({
  tooltip: option.tooltip ?? { trigger: "item" },
  legend: option.legend ?? { show: true, bottom: 0 },
  ...option,
});

const chartOptions = {
  sunburst: enhanceOption({
    title: { text: "Sunburst Chart" },
    series: [
      {
        type: "sunburst",
        radius: [0, "90%"],
        label: { rotate: "radial" },
        data: [
          {
            name: "World",
            value: 100,
            children: [
              {
                name: "Asia",
                value: 50,
                children: [
                  { name: "China", value: 20 },
                  { name: "India", value: 15 },
                  { name: "Japan", value: 15 },
                ],
              },
              {
                name: "Europe",
                value: 30,
                children: [
                  { name: "Germany", value: 10 },
                  { name: "France", value: 10 },
                  { name: "UK", value: 10 },
                ],
              },
              {
                name: "Americas",
                value: 20,
                children: [
                  { name: "USA", value: 12 },
                  { name: "Brazil", value: 8 },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),

  treemap: enhanceOption({
    title: { text: "Treemap Chart" },
    series: [
      {
        type: "treemap",
        leafDepth: 2,
        roam: true,
        data: [
          {
            name: "Fruits",
            value: 100,
            children: [
              { name: "Apple", value: 40 },
              { name: "Banana", value: 30 },
              { name: "Cherry", value: 30 },
            ],
          },
          {
            name: "Vegetables",
            value: 80,
            children: [
              { name: "Tomato", value: 30 },
              { name: "Potato", value: 25 },
              { name: "Carrot", value: 25 },
            ],
          },
        ],
        label: {
          show: true,
          formatter: "{b}\n{c}",
          fontSize: 14,
        },
      },
    ],
  }),

  sankey: enhanceOption({
    title: { text: "Sankey Diagram" },
    series: [
      {
        type: "sankey",
        layout: "none",
        emphasis: {
          focus: "adjacency",
        },
        data: [
          { name: "Website" },
          { name: "Landing Page" },
          { name: "Sign Up" },
          { name: "Purchase" },
          { name: "Support" },
        ],
        links: [
          { source: "Website", target: "Landing Page", value: 300 },
          { source: "Landing Page", target: "Sign Up", value: 200 },
          { source: "Sign Up", target: "Purchase", value: 150 },
          { source: "Sign Up", target: "Support", value: 50 },
        ],
        label: {
          show: true,
          color: "#000",
          fontWeight: "bold",
        },
      },
    ],
  }),

  circlePacking: enhanceOption({
    title: { text: "Circle Packing" },
    tooltip: {},
    series: [
      {
        type: "circlePacking",
        data: {
          name: "Animals",
          value: 100,
          children: [
            {
              name: "Mammals",
              value: 60,
              children: [
                { name: "Dogs", value: 30 },
                { name: "Cats", value: 20 },
                { name: "Elephants", value: 10 },
              ],
            },
            {
              name: "Birds",
              value: 40,
              children: [
                { name: "Eagles", value: 15 },
                { name: "Parrots", value: 25 },
              ],
            },
          ],
        },
        radius: ["20%", "90%"],
        label: {
          show: true,
          formatter: "{b}",
          fontSize: 14,
          color: "#333",
        },
        roam: true,
      },
    ],
  }),

  chord: enhanceOption({
    title: { text: "Chord Diagram" },
    tooltip: { trigger: "item", formatter: "{b0} → {b1}: {c}" },
    legend: { show: true, bottom: 0 },
    series: [
      {
        type: "chord",
        sort: "ascending",
        sortSub: "descending",
        data: [
          { name: "Alpha" },
          { name: "Beta" },
          { name: "Gamma" },
          { name: "Delta" },
        ],
        matrix: [
          [0, 11975, 5871, 8916],
          [1951, 0, 10048, 2060],
          [8010, 16145, 0, 8045],
          [1013, 990, 940, 0],
        ],
        itemStyle: {
          borderWidth: 1,
          borderColor: "#fff",
        },
        emphasis: {
          lineStyle: {
            width: 4,
          },
        },
        label: { show: true },
      },
    ],
  }),

  radar: enhanceOption({
    title: { text: "Radar Chart" },
    radar: {
      indicator: [
        { name: "Speed", max: 100 },
        { name: "Reliability", max: 100 },
        { name: "Comfort", max: 100 },
        { name: "Safety", max: 100 },
        { name: "Efficiency", max: 100 },
      ],
      radius: "65%",
      shape: "circle",
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: [90, 85, 75, 80, 90],
            name: "Car A",
            areaStyle: { color: "rgba(255, 0, 0, 0.3)" },
          },
          {
            value: [70, 95, 80, 85, 75],
            name: "Car B",
            areaStyle: { color: "rgba(0, 0, 255, 0.3)" },
          },
        ],
        lineStyle: { width: 2 },
        symbolSize: 6,
      },
    ],
  }),
};

const chartNames = Object.keys(chartOptions);

export default function MultiChartViewer() {
  const [selectedChart, setSelectedChart] = useState(chartNames[0]);

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Multi-Chart Viewer
      </h1>

      <div style={{ marginBottom: 30, textAlign: "center" }}>
        <label
          htmlFor="chart-select"
          style={{ marginRight: 10, fontWeight: "bold" }}
        >
          Select Chart:
        </label>
        <select
          id="chart-select"
          value={selectedChart}
          onChange={(e) => setSelectedChart(e.target.value)}
          style={{
            fontSize: 16,
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #ccc",
            minWidth: 180,
          }}
        >
          {chartNames.map((name) => (
            <option key={name} value={name}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <ReactECharts
        option={chartOptions[selectedChart]}
        style={{ height: 520, width: "100%" }}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}
