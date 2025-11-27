"use client";

import { motion } from "framer-motion";

export default function InsightsViewer({ insights }) {
  const groupByType = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) acc[insight.type] = [];
    acc[insight.type].push(insight);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupByType).map(([type, typeInsights]) => (
        <motion.div
          key={type}
          className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-200 capitalize">
              {type} Insights
            </h3>
            <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-1 rounded-full">
              {typeInsights.length}{" "}
              {typeInsights.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeInsights.map((insight, i) => (
              <motion.div
                key={i}
                className={`p-4 rounded-lg border ${
                  insight.severity === "high"
                    ? "border-red-500/30 bg-gradient-to-br from-slate-800 to-slate-900/70"
                    : insight.severity === "medium"
                    ? "border-yellow-500/30 bg-gradient-to-br from-slate-800 to-slate-900/70"
                    : "border-cyan-500/30 bg-gradient-to-br from-slate-800 to-slate-900/70"
                }`}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      insight.severity === "high"
                        ? "bg-red-500/10 text-red-400"
                        : insight.severity === "medium"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-cyan-500/10 text-cyan-400"
                    }`}
                  >
                    {insight.severity === "high" ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    ) : insight.severity === "medium" ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-slate-100">
                      {insight.message}
                    </p>
                    {insight.recommendation && (
                      <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">
                          Recommendation
                        </p>
                        <p className="text-sm text-slate-200">
                          {insight.recommendation}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400 bg-slate-800/70 px-2 py-1 rounded-full">
                        {insight.vehicleId}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${
                          insight.severity === "high"
                            ? "text-red-400 bg-red-900/30"
                            : insight.severity === "medium"
                            ? "text-yellow-400 bg-yellow-900/30"
                            : "text-cyan-400 bg-cyan-900/30"
                        }`}
                      >
                        {insight.severity}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
