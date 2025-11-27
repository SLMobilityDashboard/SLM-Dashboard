import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Settings,
  Plus,
  Eye,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Save,
  Trash2,
  Edit,
  ChevronRight,
} from "lucide-react";

// Custom Analysis Builder Component
const CustomAnalysisBuilder = ({
  onSave,
  onCancel,
  existingAnalysis = null,
}) => {
  const [analysisName, setAnalysisName] = useState(
    existingAnalysis?.name || ""
  );
  const [selectedTable, setSelectedTable] = useState(
    existingAnalysis?.table || ""
  );
  const [selectedColumns, setSelectedColumns] = useState(
    existingAnalysis?.columns || []
  );
  const [conditions, setConditions] = useState(
    existingAnalysis?.conditions || []
  );
  const [insightConfig, setInsightConfig] = useState(
    existingAnalysis?.insightConfig || {
      type: "efficiency",
      severity: "medium",
      messageTemplate: "",
      recommendation: "",
    }
  );
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Available tables and their columns
  const availableTables = {
    vehicle_usage: {
      name: "Vehicle Usage",
      columns: [
        { name: "VEHICLE_ID", type: "string", label: "Vehicle ID" },
        {
          name: "OPERATIONAL_TIME",
          type: "number",
          label: "Operational Time (hours)",
        },
        { name: "IDLE_TIME", type: "number", label: "Idle Time (hours)" },
        { name: "DATE", type: "date", label: "Date" },
      ],
    },
    route_metrics: {
      name: "Route Metrics",
      columns: [
        { name: "ROUTE_ID", type: "string", label: "Route ID" },
        { name: "VEHICLE_ID", type: "string", label: "Vehicle ID" },
        { name: "DISTANCE", type: "number", label: "Distance (km)" },
        { name: "DURATION", type: "number", label: "Duration (minutes)" },
        { name: "DATE", type: "date", label: "Date" },
      ],
    },
    battery_health: {
      name: "Battery Health",
      columns: [
        { name: "VEHICLE_ID", type: "string", label: "Vehicle ID" },
        {
          name: "HEALTH_PERCENTAGE",
          type: "number",
          label: "Health Percentage",
        },
        { name: "LAST_CHARGE", type: "date", label: "Last Charge Date" },
        { name: "DATE", type: "date", label: "Date" },
      ],
    },
    alert_logs: {
      name: "Alert Logs",
      columns: [
        { name: "ALERT_ID", type: "string", label: "Alert ID" },
        { name: "VEHICLE_ID", type: "string", label: "Vehicle ID" },
        { name: "SEVERITY", type: "string", label: "Severity" },
        { name: "MESSAGE", type: "string", label: "Message" },
        { name: "DATE", type: "date", label: "Date" },
      ],
    },
  };

  const operators = {
    number: [
      { value: ">", label: "Greater than" },
      { value: "<", label: "Less than" },
      { value: ">=", label: "Greater than or equal" },
      { value: "<=", label: "Less than or equal" },
      { value: "=", label: "Equal to" },
      { value: "!=", label: "Not equal to" },
    ],
    string: [
      { value: "=", label: "Equal to" },
      { value: "!=", label: "Not equal to" },
      { value: "contains", label: "Contains" },
      { value: "startswith", label: "Starts with" },
      { value: "endswith", label: "Ends with" },
    ],
    date: [
      { value: ">", label: "After" },
      { value: "<", label: "Before" },
      { value: ">=", label: "On or after" },
      { value: "<=", label: "On or before" },
      { value: "=", label: "On date" },
    ],
  };

  const insightTypes = [
    { value: "efficiency", label: "Efficiency", color: "bg-blue-500" },
    { value: "maintenance", label: "Maintenance", color: "bg-orange-500" },
    { value: "safety", label: "Safety", color: "bg-red-500" },
    { value: "battery", label: "Battery", color: "bg-green-500" },
    { value: "routing", label: "Routing", color: "bg-purple-500" },
    { value: "planning", label: "Planning", color: "bg-cyan-500" },
    { value: "charging", label: "Charging", color: "bg-yellow-500" },
  ];

  const severityLevels = [
    { value: "low", label: "Low", color: "text-green-400" },
    { value: "medium", label: "Medium", color: "text-yellow-400" },
    { value: "high", label: "High", color: "text-red-400" },
  ];

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: Date.now(),
        column: "",
        operator: "",
        value: "",
        logicalOperator: conditions.length > 0 ? "AND" : null,
      },
    ]);
  };

  const removeCondition = (id) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id, field, value) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleColumnToggle = (columnName) => {
    setSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((c) => c !== columnName)
        : [...prev, columnName]
    );
  };

  const generatePreview = () => {
    const mockData = [];
    for (let i = 0; i < 5; i++) {
      const row = {};
      selectedColumns.forEach((col) => {
        const column = availableTables[selectedTable]?.columns.find(
          (c) => c.name === col
        );
        if (column) {
          switch (column.type) {
            case "string":
              row[col] = col === "VEHICLE_ID" ? `VH${1000 + i}` : `Sample ${i}`;
              break;
            case "number":
              row[col] = Math.floor(Math.random() * 100);
              break;
            case "date":
              row[col] = new Date(
                Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0];
              break;
          }
        }
      });
      mockData.push(row);
    }
    setPreviewData(mockData);
    setShowPreview(true);
  };

  const buildSQLQuery = () => {
    if (!selectedTable || selectedColumns.length === 0) return "";

    const columns = selectedColumns.join(", ");
    let query = `SELECT ${columns} FROM ${selectedTable.toUpperCase()}`;

    if (conditions.length > 0) {
      const whereClause = conditions
        .map((condition) => {
          const { column, operator, value, logicalOperator } = condition;
          let conditionStr = "";

          if (operator === "contains") {
            conditionStr = `${column} LIKE '%${value}%'`;
          } else if (operator === "startswith") {
            conditionStr = `${column} LIKE '${value}%'`;
          } else if (operator === "endswith") {
            conditionStr = `${column} LIKE '%${value}'`;
          } else {
            conditionStr = `${column} ${operator} '${value}'`;
          }

          return logicalOperator
            ? `${logicalOperator} ${conditionStr}`
            : conditionStr;
        })
        .join(" ");

      query += ` WHERE ${whereClause}`;
    }

    return query;
  };

  const handleSave = () => {
    const analysisDefinition = {
      id: existingAnalysis?.id || `custom-${Date.now()}`,
      name: analysisName,
      table: selectedTable,
      columns: selectedColumns,
      conditions,
      insightConfig,
      query: buildSQLQuery(),
      createdAt: existingAnalysis?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(analysisDefinition);
  };

  const isValid =
    analysisName &&
    selectedTable &&
    selectedColumns.length > 0 &&
    conditions.every((c) => c.column && c.operator && c.value) &&
    insightConfig.messageTemplate &&
    insightConfig.recommendation;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Fixed Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">
            {existingAnalysis
              ? "Edit Custom Analysis"
              : "Create Custom Analysis"}
          </h2>
          <p className="text-slate-400 text-sm">
            Define custom insights by setting conditions on your data
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
              isValid
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Analysis
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-slate-800/30">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-none">
            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-medium text-slate-200 mb-4">
                  Basic Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Analysis Name
                    </label>
                    <input
                      type="text"
                      value={analysisName}
                      onChange={(e) => setAnalysisName(e.target.value)}
                      placeholder="e.g., High Idle Time Detection"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Data Source
                    </label>
                    <select
                      value={selectedTable}
                      onChange={(e) => {
                        setSelectedTable(e.target.value);
                        setSelectedColumns([]);
                        setConditions([]);
                      }}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Select a table...</option>
                      {Object.entries(availableTables).map(([key, table]) => (
                        <option key={key} value={key}>
                          {table.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Column Selection */}
              {selectedTable && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-medium text-slate-200 mb-4">
                    Select Columns
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {availableTables[selectedTable].columns.map((column) => (
                      <label
                        key={column.name}
                        className="flex items-center p-3 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(column.name)}
                          onChange={() => handleColumnToggle(column.name)}
                          className="w-4 h-4 text-cyan-500 bg-slate-900 border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
                        />
                        <div className="ml-3 flex-1">
                          <span className="text-slate-200 font-medium">
                            {column.label}
                          </span>
                          <span className="ml-2 text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                            {column.type}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions */}
              {selectedTable && selectedColumns.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-slate-200">
                      Conditions
                    </h3>
                    <button
                      onClick={addCondition}
                      className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Condition
                    </button>
                  </div>

                  <div className="space-y-3">
                    {conditions.map((condition, index) => {
                      const column = availableTables[
                        selectedTable
                      ].columns.find((c) => c.name === condition.column);

                      return (
                        <div
                          key={condition.id}
                          className="bg-slate-900/50 p-4 rounded-lg border border-slate-600"
                        >
                          {index > 0 && (
                            <div className="mb-3">
                              <select
                                value={condition.logicalOperator}
                                onChange={(e) =>
                                  updateCondition(
                                    condition.id,
                                    "logicalOperator",
                                    e.target.value
                                  )
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm"
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <select
                                value={condition.column}
                                onChange={(e) =>
                                  updateCondition(
                                    condition.id,
                                    "column",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm"
                              >
                                <option value="">Select column...</option>
                                {selectedColumns.map((col) => {
                                  const colInfo = availableTables[
                                    selectedTable
                                  ].columns.find((c) => c.name === col);
                                  return (
                                    <option key={col} value={col}>
                                      {colInfo?.label}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div className="col-span-3">
                              <select
                                value={condition.operator}
                                onChange={(e) =>
                                  updateCondition(
                                    condition.id,
                                    "operator",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm"
                                disabled={!condition.column}
                              >
                                <option value="">Operator...</option>
                                {column &&
                                  operators[column.type]?.map((op) => (
                                    <option key={op.value} value={op.value}>
                                      {op.label}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="col-span-4">
                              <input
                                type={
                                  column?.type === "number"
                                    ? "number"
                                    : column?.type === "date"
                                    ? "date"
                                    : "text"
                                }
                                value={condition.value}
                                onChange={(e) =>
                                  updateCondition(
                                    condition.id,
                                    "value",
                                    e.target.value
                                  )
                                }
                                placeholder="Value..."
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm placeholder-slate-500"
                              />
                            </div>

                            <div className="col-span-1">
                              <button
                                onClick={() => removeCondition(condition.id)}
                                className="text-red-400 hover:text-red-300 transition-colors p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Preview & Insight Config Panel */}
            <div className="space-y-6">
              {/* Insight Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-medium text-slate-200 mb-4">
                  Insight Configuration
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Insight Type
                      </label>
                      <select
                        value={insightConfig.type}
                        onChange={(e) =>
                          setInsightConfig({
                            ...insightConfig,
                            type: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
                      >
                        {insightTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Severity
                      </label>
                      <select
                        value={insightConfig.severity}
                        onChange={(e) =>
                          setInsightConfig({
                            ...insightConfig,
                            severity: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
                      >
                        {severityLevels.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Message Template
                      <span className="text-xs text-slate-500 ml-1">
                        Use {"{column_name}"} to reference data
                      </span>
                    </label>
                    <textarea
                      value={insightConfig.messageTemplate}
                      onChange={(e) =>
                        setInsightConfig({
                          ...insightConfig,
                          messageTemplate: e.target.value,
                        })
                      }
                      placeholder="e.g., Vehicle {VEHICLE_ID} has high idle time ({IDLE_TIME}h vs {OPERATIONAL_TIME}h operational)"
                      rows={3}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Recommendation
                    </label>
                    <textarea
                      value={insightConfig.recommendation}
                      onChange={(e) =>
                        setInsightConfig({
                          ...insightConfig,
                          recommendation: e.target.value,
                        })
                      }
                      placeholder="e.g., Review scheduling to improve utilization"
                      rows={2}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* SQL Preview */}
              {selectedTable && selectedColumns.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-medium text-slate-200 mb-4">
                    Generated Query
                  </h3>
                  <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-600">
                    <code className="text-sm text-cyan-300 whitespace-pre-wrap break-all">
                      {buildSQLQuery()}
                    </code>
                  </div>

                  <button
                    onClick={generatePreview}
                    className="mt-4 flex items-center text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Results
                  </button>
                </div>
              )}

              {/* Data Preview */}
              {showPreview && previewData && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-slate-200">
                      Data Preview
                    </h3>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="text-slate-400 hover:text-slate-300 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600">
                          {selectedColumns.map((col) => (
                            <th
                              key={col}
                              className="text-left p-2 text-slate-300 font-medium"
                            >
                              {
                                availableTables[selectedTable].columns.find(
                                  (c) => c.name === col
                                )?.label
                              }
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-700/50"
                          >
                            {selectedColumns.map((col) => (
                              <td key={col} className="p-2 text-slate-200">
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAnalysisBuilder;
