"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import {
  Brain,
  Send,
  Loader2,
  Database,
  Zap,
  Clock,
  Lightbulb,
  BarChart,
  User,
  Star,
  AlertCircle,
  DollarSign,
  CheckCircle,
  ShoppingCart,
  MapPin,
  Battery,
  TrendingUp,
  Copy,
  Check,
  Edit3,
  Save,
  X,
  Users,
  Activity,
  Truck,
} from "lucide-react";
import { useGenerateSQL } from "@/hooks/useGenerateSQL";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected";
  lastConnected: Date;
  tables: any[];
  config: Record<string, string>;
}

interface QueryResult {
  columns: string[];
  data: any[][];
  executionTime: number;
  rowCount: number;
}

interface QueryError {
  message: string;
  code?: string;
  details?: string;
}

interface AIQueryBuilderProps {
  connection: DatabaseConnection;
  onQueryExecute: (query: string, result: QueryResult) => void;
}

const VERIFIED_QUERIES = [
  {
    category: "Revenue Analysis",
    icon: DollarSign,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    queries: [
      {
        text: "Show me the top 10 stations by total revenue this month",
        description:
          "Ranks stations by swap transaction revenue using FACT_PAYMENT and DIM_SWAPPING_STATION",
      },
      {
        text: "What is the monthly revenue trend for the last 6 months?",
        description: "Time series analysis of payment transactions by month",
      },
      {
        text: "Compare revenue by dealer region for this quarter",
        description: "Regional revenue analysis using DIM_DEALER location data",
      },
      {
        text: "Calculate net profit per station after operational expenses",
        description:
          "Revenue from FACT_PAYMENT minus expenses from FACT_EXPENSES by station",
      },
      {
        text: "Show payment success rate and refund percentage by payment method",
        description:
          "Transaction success metrics grouped by payment method type",
      },
    ],
  },
  {
    category: "Expense Insights",
    icon: Edit3,
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    queries: [
      {
        text: "Show total expenses by category for this month",
        description: "Expense analysis using FACT_EXPENSES data",
      },
      {
        text: "Which vendors have the highest expenses?",
        description: "Vendor analysis based on expense data",
      },
      {
        text: "Analyze expense trends over the last 6 months",
        description: "Time series analysis of expenses by month",
      },
      {
        text: "Show top expense categories and their contributions",
        description: "Category performance analysis using FACT_EXPENSES data",
      },
      {
        text: "What is the average expense per transaction?",
        description: "Expense analysis using transaction data",
      },
    ],
  },
  {
    category: "Sales Insights",
    icon: ShoppingCart,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/20",
    queries: [
      {
        text: "Show total sales by product category for this month",
        description: "Sales performance analysis using FACT_SALES data",
      },
      {
        text: "Which customers have the highest lifetime value?",
        description: "Customer segmentation based on purchase history",
      },
      {
        text: "Analyze sales conversion rates by channel",
        description: "Marketing effectiveness analysis using DIM_CHANNEL data",
      },
      {
        text: "Show top-selling products and their revenue contribution",
        description: "Product performance analysis using FACT_SALES data",
      },
      {
        text: "What is the average order value by customer segment?",
        description: "Revenue analysis using customer segmentation data",
      },
    ],
  },
  {
    category: "Dealer Insights",
    icon: User,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
    queries: [
      {
        text: "Show dealer performance metrics for this month",
        description: "Performance analysis using FACT_DEALER data",
      },
      {
        text: "Which dealers have the highest customer satisfaction ratings?",
        description: "Customer feedback analysis using DIM_CUSTOMER data",
      },
      {
        text: "Analyze dealer sales trends over the last 6 months",
        description: "Time series analysis of dealer sales data",
      },
      {
        text: "Show top-performing dealers by region",
        description: "Regional performance analysis using DIM_DEALER data",
      },
      {
        text: "What is the average deal size by dealer?",
        description: "Revenue analysis using FACT_DEAL data",
      },
    ],
  },
  {
    category: "Marketing Insights",
    icon: BarChart,
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
    queries: [
      {
        text: "Show campaign performance metrics for this month",
        description: "Marketing analysis using FACT_MARKETING data",
      },
      {
        text: "Which channels have the highest conversion rates?",
        description: "Channel performance analysis using DIM_CHANNEL data",
      },
      {
        text: "Analyze customer engagement trends over the last 6 months",
        description: "Time series analysis of customer interactions",
      },
      {
        text: "Show top-performing campaigns by ROI",
        description:
          "Campaign effectiveness analysis using FACT_MARKETING data",
      },
      {
        text: "What is the average customer acquisition cost by channel?",
        description:
          "Cost analysis using marketing spend and new customer data",
      },
    ],
  },
  {
    category: "GPS Insights",
    icon: Clock,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    queries: [
      {
        text: "Show GPS coordinates for all active stations",
        description: "Location data from DIM_SWAPPING_STATION",
      },
      {
        text: "What is the average distance between swaps?",
        description: "Distance analysis using FACT_VEHICLE_DISTANCE data",
      },
      {
        text: "Show heatmap of swap activity by location",
        description: "Geospatial analysis using swap transaction data",
      },
      {
        text: "Which routes have the highest swap frequency?",
        description: "Route optimization using GPS tracking data",
      },
      {
        text: "Analyze time spent at each station by vehicle",
        description:
          "Station utilization analysis using FACT_VEHICLE_TELEMETRY",
      },
    ],
  },
  {
    category: "Station Performance",
    icon: MapPin,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    queries: [
      {
        text: "Which stations have the highest battery swap frequency?",
        description: "Station utilization based on swap transaction count",
      },
      {
        text: "Show stations with declining performance over time",
        description:
          "Identifies stations with decreasing swap volumes or revenue trends",
      },
      {
        text: "What are the operational costs per swap by station?",
        description:
          "Cost efficiency analysis using FACT_EXPENSES divided by swap count",
      },
      {
        text: "List stations requiring maintenance based on expense patterns",
        description:
          "Stations with above-average maintenance costs from FACT_EXPENSES",
      },
      {
        text: "Show electricity consumption efficiency by station location",
        description: "Units consumed vs revenue generated analysis",
      },
    ],
  },
  {
    category: "Battery Analytics",
    icon: Battery,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    queries: [
      {
        text: "Show battery health distribution across all active batteries",
        description:
          "Battery SOH analysis from DIM_BATTERY and FACT_VEHICLE_TELEMETRY",
      },
      {
        text: "Which batteries need replacement based on cycle count and SOH?",
        description: "Maintenance planning using battery degradation metrics",
      },
      {
        text: "Compare battery performance by type and manufacturer",
        description:
          "Battery type analysis using DIM_BATTERY_TYPE and performance data",
      },
      {
        text: "Show temperature and voltage patterns for battery health monitoring",
        description: "Telemetry analysis for battery condition monitoring",
      },
      {
        text: "Calculate average battery lifespan by usage patterns",
        description:
          "Battery lifecycle analysis based on charge cycles and SOH degradation",
      },
    ],
  },
  {
    category: "Vehicle Operations",
    icon: Truck,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    queries: [
      {
        text: "Show total distance traveled by vehicle this month",
        description: "Vehicle utilization from FACT_VEHICLE_DISTANCE data",
      },
      {
        text: "Which vehicles have the highest mileage and swap frequency?",
        description:
          "Heavy usage vehicle identification using distance and payment data",
      },
      {
        text: "Analyze GPS tracking patterns for route optimization",
        description: "Location analysis using FACT-TBOX-GPS for common routes",
      },
      {
        text: "Show vehicle telemetry anomalies and error patterns",
        description:
          "Error detection from FACT_VEHICLE_TELEMETRY diagnostic data",
      },
      {
        text: "Calculate average session duration and distance per trip",
        description: "Trip analysis using session data and distance metrics",
      },
    ],
  },
  {
    category: "Customer Analytics",
    icon: Users,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    queries: [
      {
        text: "Show top 20 customers by total spending and swap frequency",
        description:
          "Customer value analysis using FACT_PAYMENT and LOOKUP_VIEW",
      },
      {
        text: "Which customers have multiple vehicles and their usage patterns?",
        description:
          "Multi-vehicle ownership analysis using FACT_VEHICLE_OWNER",
      },
      {
        text: "Calculate customer wallet usage vs card payment preferences",
        description: "Payment method analysis by customer segment",
      },
      {
        text: "Show customer geographic distribution by city and region",
        description: "Demographics analysis using DIM_CUSTOMERS location data",
      },
      {
        text: "Identify inactive customers and their last activity date",
        description:
          "Customer retention analysis based on payment and usage history",
      },
    ],
  },
  {
    category: "Operational Insights",
    icon: Activity,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/20",
    queries: [
      {
        text: "What are the peak hours for battery swaps across all stations for all 24 hours?",
        description:
          "Time-based analysis of swap transactions for demand planning",
      },
      {
        text: "Show busiest days of the week and seasonal patterns",
        description: "Temporal analysis of swap frequency and revenue patterns",
      },
      {
        text: "Calculate dealer network performance by region and partner",
        description:
          "Dealer effectiveness analysis using DIM_DEALER and transaction data",
      },
      {
        text: "Show correlation between weather/time and vehicle usage",
        description:
          "External factor analysis using telemetry and session timing",
      },
      {
        text: "Identify bottlenecks in the battery swapping process",
        description:
          "Operational efficiency analysis using session duration and error rates",
      },
    ],
  },
];

export default function AIQueryBuilder({
  connection,
  onQueryExecute,
}: AIQueryBuilderProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<QueryError | null>(null);

  // New states for copy and edit functionality
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingSQL, setIsEditingSQL] = useState(false);
  const [editedSQL, setEditedSQL] = useState("");

  // Get session data
  const { data: session } = useSession();

  const {
    sql: generatedSQL,
    loading: isGenerating,
    error,
    explanation,
    generate,
    setSql,
  } = useGenerateSQL();

  const getCategoryFromPrompt = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    for (const category of VERIFIED_QUERIES) {
      for (const q of category.queries) {
        if (q.text.toLowerCase() === lowerPrompt) {
          return category.category;
        }
      }
    }
    return "General Analysis";
  };

  const saveQueryToMongo = async (
    prompt: string,
    sql: string,
    explanation?: string,
    result?: QueryResult,
    error?: QueryError
  ) => {
    try {
      const document = {
        id: `query_${Date.now()}`,
        connectionId: connection.id,
        title: prompt,
        subtitle: getCategoryFromPrompt(prompt),
        timeAgo: "Just now",
        rowsReturned: result?.rowCount ?? 0,
        executionTime: result?.executionTime
          ? `${result.executionTime.toFixed(2)}s`
          : "N/A",
        sql,
        explanation,
        error: error ? error.message : null,
        timestamp: new Date().toISOString(),
      };

      if (!document.error) {
        await fetch("/api/query-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(document),
        });
      }
    } catch (err) {
      console.error("Failed to save query to history:", err);
    }
  };

  // Copy SQL to clipboard
  const handleCopySQL = async () => {
    if (!generatedSQL) return;

    try {
      await navigator.clipboard.writeText(generatedSQL);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy SQL:", err);
    }
  };

  // Start editing SQL
  const handleEditSQL = () => {
    setEditedSQL(generatedSQL || "");
    setIsEditingSQL(true);
  };

  // Save edited SQL
  const handleSaveSQL = () => {
    if (setSql) {
      setSql(editedSQL);
    }
    setIsEditingSQL(false);
  };

  // Cancel editing SQL
  const handleCancelEdit = () => {
    setEditedSQL("");
    setIsEditingSQL(false);
  };

  const handleExecuteQuery = async () => {
    const sqlToExecute = isEditingSQL ? editedSQL : generatedSQL;
    if (!sqlToExecute) return;

    setIsExecuting(true);
    setQueryResult(null);
    setQueryError(null);

    try {
      const res = await fetch("/api/RunSQLQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: sqlToExecute,
          connectionId: "snowflake_1751620346752",
          username: session?.user?.name || undefined, // Pass username, make it optional
        }),
      });

      const data = await res.json();

      if (
        data.success &&
        data.result &&
        Array.isArray(data.result.columns) &&
        Array.isArray(data.result.rows)
      ) {
        // Transform rows from array of objects to array of arrays
        const { columns, rows, executionTime, rowCount } = data.result;

        const dataRows = rows.map((row: Record<string, any>) =>
          columns.map((col: string) => row[col])
        );

        const resultData: QueryResult = {
          columns,
          data: dataRows,
          executionTime,
          rowCount,
        };

        console.log("Query executed successfully:", data);

        await saveQueryToMongo(query, sqlToExecute, explanation, resultData);

        setQueryResult(resultData);
        onQueryExecute(sqlToExecute, resultData);
      } else {
        // Handle API error response
        const errorInfo: QueryError = {
          message: data.error || "Unknown error occurred",
          code: data.code || "UNKNOWN_ERROR",
          details: data.details || "No additional details available",
        };

        console.error("Query execution failed:", data);

        await saveQueryToMongo(
          query,
          sqlToExecute,
          explanation,
          undefined,
          errorInfo
        );

        setQueryError(errorInfo);
      }
    } catch (e) {
      // Handle network or other errors
      const errorInfo: QueryError = {
        message: e instanceof Error ? e.message : "Network or connection error",
        code: "CONNECTION_ERROR",
        details: e instanceof Error ? e.stack : String(e),
      };

      console.error("Query execution error:", e);

      await saveQueryToMongo(
        query,
        sqlToExecute,
        explanation,
        undefined,
        errorInfo
      );

      setQueryError(errorInfo);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSampleQuery = (sampleQuery: any) => {
    setQuery(sampleQuery.text);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Connection Status Bar - Updated with User Info */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    connection.status === "connected"
                      ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                      : "bg-red-400 shadow-sm shadow-red-400/50"
                  } animate-pulse`}
                />
                <span className="text-sm font-medium text-slate-200">
                  Connected to{" "}
                  <span className="text-white font-semibold">
                    {connection.name}
                  </span>
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-slate-300 border-slate-500/50 bg-slate-700/30"
              >
                {connection.type}
              </Badge>
            </div>

            {/* User Info Section */}
            <div className="flex items-center gap-4">
              {session?.user && (
                <div className="flex items-center gap-3">
                  {/* User Avatar and Name */}
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    {/* <Avatar className="h-6 w-6 border border-slate-600">
                      <AvatarImage
                        src="/placeholder.svg?height=24&width=24"
                        alt="User"
                      />
                      <AvatarFallback className="bg-slate-700 text-cyan-400 text-xs">
                        {session?.user?.name?.substring(0, 2).toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar> */}
                    <span className="font-medium">
                      {session.user.name || session.user.email}
                    </span>
                  </div>

                  {/* Separator */}
                  <div className="h-4 w-px bg-slate-600"></div>

                  {/* Connection Time */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Last connected:{" "}
                      {connection.lastConnected
                        ? new Date(connection.lastConnected).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Query Input */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-cyan-400" />
            AI Query Builder
            {session?.user && (
              <Badge
                variant="outline"
                className="ml-2 text-xs bg-slate-700/30 border-slate-600 text-slate-300"
              >
                <User className="h-3 w-3 mr-1" />
                {session.user.name || session.user.email}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <Textarea
              placeholder="Ask me anything about your BSS data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  generate(query);
                }
              }}
              className="bg-slate-900/60 border-slate-600/50 text-white min-h-[100px] resize-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all duration-200"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Press Ctrl+Enter or click to generate SQL
              </p>
              <Button
                onClick={() => generate(query)}
                disabled={!query.trim() || isGenerating}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg transition-all duration-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate SQL
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Section */}
          {(generatedSQL || explanation || error) && (
            <div className="space-y-4">
              <Separator className="bg-slate-700/50" />

              {/* Generated SQL */}
              {generatedSQL && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white flex items-center gap-2">
                      <Database className="h-4 w-4 text-emerald-400" />
                      Generated SQL
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    </h4>
                    <div className="flex items-center gap-2">
                      {/* Edit/Save/Cancel Buttons */}
                      {isEditingSQL ? (
                        <>
                          <Button
                            onClick={handleSaveSQL}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                            className="border-slate-600/50 text-slate-300"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={handleEditSQL}
                          size="sm"
                          variant="outline"
                          className="border-slate-600/50 bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 hover:text-white transition-all duration-200"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}

                      {/* Copy Button */}
                      <Button
                        onClick={handleCopySQL}
                        size="sm"
                        variant="outline"
                        className="border-slate-600/50 bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 hover:text-white transition-all duration-200"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-4 w-4 mr-2 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>

                      {/* Execute Button */}
                      <Button
                        onClick={handleExecuteQuery}
                        disabled={isExecuting}
                        size="sm"
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md transition-all duration-200"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Run Query
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-600/50 rounded-lg p-4 backdrop-blur-sm">
                    {isEditingSQL ? (
                      <Textarea
                        value={editedSQL}
                        onChange={(e) => setEditedSQL(e.target.value)}
                        className="bg-transparent border-none text-emerald-300 font-mono text-sm resize-none focus:ring-0 focus:outline-none p-0 w-full"
                        style={{
                          minHeight: "120px",
                          height: "auto",
                        }}
                        rows={Math.max(6, editedSQL.split("\n").length)}
                        placeholder="Edit your SQL query..."
                      />
                    ) : (
                      <pre
                        className="text-sm text-emerald-300 font-mono whitespace-pre-wrap overflow-x-auto cursor-pointer hover:bg-slate-800/50 rounded p-2 transition-colors duration-200"
                        onDoubleClick={handleEditSQL}
                        title="Double-click to edit"
                      >
                        {generatedSQL}
                      </pre>
                    )}
                  </div>

                  {!isEditingSQL && (
                    <p className="text-xs text-slate-400 italic">
                      💡 Double-click on the SQL query above to edit it
                    </p>
                  )}
                </div>
              )}

              {/* SQL Generation Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium text-red-200 mb-1">
                        SQL Generation Error
                      </h5>
                      <p className="text-sm text-red-100/90 whitespace-pre-wrap leading-relaxed">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Query Execution Error */}
              {queryError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="w-full">
                      <h5 className="text-sm font-medium text-red-200 mb-2">
                        Query Execution Error
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-red-300 font-medium">
                            Message:
                          </span>
                          <p className="text-sm text-red-100/90 mt-1">
                            {queryError.message}
                          </p>
                        </div>
                        {queryError.code && (
                          <div>
                            <span className="text-xs text-red-300 font-medium">
                              Error Code:
                            </span>
                            <p className="text-sm text-red-100/90 font-mono mt-1">
                              {queryError.code}
                            </p>
                          </div>
                        )}
                        {queryError.details && (
                          <div>
                            <span className="text-xs text-red-300 font-medium">
                              Details:
                            </span>
                            <pre className="text-xs text-red-100/80 mt-1 bg-red-900/20 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                              {queryError.details}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-red-500/30">
                        <p className="text-xs text-red-200/80">
                          💡 You can edit the SQL query above and try running it
                          again
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation */}
              {explanation && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium text-amber-200 mb-1">
                        Explanation
                      </h5>
                      <p className="text-sm text-amber-100/90 whitespace-pre-wrap leading-relaxed">
                        {explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* QUERY RESULT TABLE */}
              {queryResult && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Query Results
                  </h4>
                  <div className="overflow-auto max-h-72 bg-slate-900/70 border border-slate-600/50 rounded-lg p-4 text-white">
                    <table className="w-full table-auto border-collapse border border-slate-700">
                      <thead>
                        <tr>
                          {queryResult.columns.map((col) => (
                            <th
                              key={col}
                              className="border border-slate-700 px-2 py-1 text-left"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.data.map((row, idx) => (
                          <tr
                            key={idx}
                            className={idx % 2 === 0 ? "bg-slate-800" : ""}
                          >
                            {row.map((cell, cidx) => (
                              <td
                                key={cidx}
                                className="border border-slate-700 px-2 py-1"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs text-slate-400">
                      Rows: {queryResult.rowCount} — Execution time:{" "}
                      {queryResult.executionTime.toFixed(2)}s
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verified Queries */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-amber-400" />
            Verified Queries
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-4">
            {VERIFIED_QUERIES.map((cat) => (
              <Button
                key={cat.category}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat.category ? null : cat.category
                  )
                }
                className={`transition-all duration-200 ${
                  selectedCategory === cat.category
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border-cyan-500"
                    : "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/60 hover:border-slate-500/60"
                }`}
                variant="outline"
                size="sm"
              >
                <cat.icon className={`h-4 w-4 ${cat.color}`} />
                {cat.category}
              </Button>
            ))}
            {selectedCategory && (
              <Button
                onClick={() => setSelectedCategory(null)}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200"
              >
                Clear filter
              </Button>
            )}
          </div>

          {/* Query List */}
          <ScrollArea className="h-[320px]">
            <div className="space-y-4 pr-4">
              {VERIFIED_QUERIES.filter(
                (cat) => !selectedCategory || cat.category === selectedCategory
              ).map((cat) => (
                <div key={cat.category} className="space-y-3">
                  {!selectedCategory && (
                    <h4
                      className={`text-sm font-medium ${cat.color} flex items-center gap-2`}
                    >
                      <cat.icon className="h-4 w-4" />
                      {cat.category}
                    </h4>
                  )}
                  <div className="grid gap-2">
                    {cat.queries.map((q, i) => (
                      <div
                        key={i}
                        className={`${cat.bgColor} border rounded-lg p-4 cursor-pointer hover:bg-opacity-80 transition-all duration-200 hover:shadow-md hover:scale-[1.01]`}
                        onClick={() => handleSampleQuery(q)}
                      >
                        <p className="text-sm font-medium text-white mb-1 leading-relaxed">
                          {q.text}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {q.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
