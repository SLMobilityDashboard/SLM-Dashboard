import React from "react";
import { RefreshCw } from "lucide-react";

const LoadingState: React.FC = () => (
  <div className="min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-slate-300">Loading BSS data...</span>
        </div>
      </div>
    </div>
  </div>
);

export default LoadingState;