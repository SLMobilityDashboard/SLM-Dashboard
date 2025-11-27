// components/SunburstChart.tsx

"use client";

import React from "react";
import ReactECharts from "echarts-for-react";

const SunburstChart = () => {
  const data = [
    {
      name: "Moratuwa",
      value: 16.4,
      children: [
        {
          name: "Moratuwa Station",
          children: [
            { name: "CARD_P", value: 6 },
            { name: "PACKA", value: 5.5 },
            { name: "WALLET", value: 4.9 },
          ],
        },
      ],
    },
    {
      name: "Boralesgamuwa",
      value: 10.21,
      children: [
        {
          name: "Boralesgamuwa Station",
          children: [
            { name: "CARD_P", value: 4 },
            { name: "PACKA", value: 3.2 },
            { name: "WALLET", value: 3.01 },
          ],
        },
      ],
    },
    {
      name: "Panadura",
      value: 8.87,
      children: [
        {
          name: "Panadura Station",
          children: [
            { name: "CARD_P", value: 3.5 },
            { name: "PACKA", value: 2.9 },
            { name: "WALLET", value: 2.47 },
          ],
        },
      ],
    },
    {
      name: "Borella",
      value: 8.71,
      children: [
        {
          name: "Borella Station",
          children: [
            { name: "CARD_P", value: 3.3 },
            { name: "PACKA", value: 2.8 },
            { name: "WALLET", value: 2.61 },
          ],
        },
      ],
    },
    {
      name: "Seeduwa",
      value: 8.11,
      children: [
        {
          name: "Seeduwa Station",
          children: [
            { name: "CARD_P", value: 3 },
            { name: "PACKA", value: 2.6 },
            { name: "WALLET", value: 2.51 },
          ],
        },
      ],
    },
    {
      name: "Miriswatta",
      value: 7.94,
      children: [
        {
          name: "Miriswatta Station",
          children: [
            { name: "CARD_P", value: 3 },
            { name: "PACKA", value: 2.5 },
            { name: "WALLET", value: 2.44 },
          ],
        },
      ],
    },
    {
      name: "Maggona",
      value: 6.21,
      children: [
        {
          name: "Maggona Station",
          children: [
            { name: "CARD_P", value: 2.2 },
            { name: "PACKA", value: 2.1 },
            { name: "WALLET", value: 1.91 },
          ],
        },
      ],
    },
    {
      name: "Katunayake Station",
      value: 5.27,
      children: [
        {
          name: "Katunayake Station",
          children: [
            { name: "CARD_P", value: 2 },
            { name: "PACKA", value: 1.8 },
            { name: "WALLET", value: 1.47 },
          ],
        },
      ],
    },
    {
      name: "Kolonnawa",
      value: 4.56,
      children: [
        {
          name: "Kolonnawa Station",
          children: [
            { name: "CARD_P", value: 1.6 },
            { name: "PACKA", value: 1.5 },
            { name: "WALLET", value: 1.46 },
          ],
        },
      ],
    },
    {
      name: "HOME_CHARGING",
      value: 4.56,
      children: [
        {
          name: "Home",
          children: [
            { name: "CARD_P", value: 1.6 },
            { name: "PACKA", value: 1.5 },
            { name: "WALLET", value: 1.46 },
          ],
        },
      ],
    },
    {
      name: "Other",
      value: 5.87,
      children: [
        {
          name: "Various",
          children: [
            { name: "CARD_P", value: 2 },
            { name: "PACKA", value: 2 },
            { name: "WALLET", value: 1.87 },
          ],
        },
      ],
    },
  ];

  const option = {
    title: {
      text: "Sum of Total Revenue",
      subtext: "Grouped by Location, Station, and Payment Method",
      left: "center",
      top: "5%",
    },
    tooltip: {
      trigger: "item",
      formatter: (info: any) => {
        return `${info.name}: ${info.value}%`;
      },
    },
    series: [
      {
        type: "sunburst",
        radius: [0, "95%"],
        sort: null,
        emphasis: {
          focus: "ancestor",
        },
        label: {
          rotate: "radial",
          overflow: "truncate",
          minAngle: 5,
          formatter: (info: any) => {
            const name = info.name || "";
            return name.length > 12 ? name.substring(0, 12) + "…" : name;
          },
        },
        levels: [
          {},
          {
            r0: "15%",
            r: "35%",
            itemStyle: {
              borderWidth: 2,
            },
            label: {
              rotate: "tangential",
            },
          },
          {
            r0: "35%",
            r: "70%",
            label: {
              align: "right",
            },
          },
          {
            r0: "70%",
            r: "95%",
          },
        ],
        data,
      },
    ],
  };

  return (
    <div className="w-full h-[500px]">
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

export default SunburstChart;
