"use client";

import React from "react";
import { useStrategyData } from "../hooks/useStrategyData";
import StrategyBuilderUI from "./StrategyBuilderUI";

export const StrategyBuilder = ({ customerSegments }) => {
  const data = useStrategyData(customerSegments);

  return (
    <div>
      {/* <pre>Customer Segments: {JSON.stringify(customerSegments, null, 2)}</pre> */}
      <StrategyBuilderUI data={data} actions={data} />
    </div>
  );
};

export default StrategyBuilder;
