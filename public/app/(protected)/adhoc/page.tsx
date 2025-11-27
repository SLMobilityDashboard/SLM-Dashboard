"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DatabaseConnector } from "@/components/adhoc/database-connector";
import AIQueryBuilder from "@/components/adhoc/ai-query-builder";
import ChartRenderer from "@/components/adhoc/ChartRenderer";
import { AnalysisHistory } from "@/components/adhoc/analysis-history";
import {
  Database,
  Brain,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingUp,
  Clock,
  LockOpen,
} from "lucide-react";

import SankeyPage from "@/components/adhoc/AccessViz";

// Replace or import your actual Access component here
const Access = () => (
  <div className="p-8 text-center text-white">
    <h3 className="text-xl font-semibold mb-2">Access Control Panel</h3>
    <p>Manage your access settings here.</p>
  </div>
);

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
  data: any[];
  executionTime: number;
  rowCount: number;
}

interface AnalysisResult {
  id: string;
  query: string;
  result: QueryResult;
  timestamp: Date;
  chartType?: string;
}

export default function AdhocAnalysisPage() {
  const [activeTab, setActiveTab] = useState("connections");
  const [selectedConnection, setSelectedConnection] =
    useState<DatabaseConnection | null>(null);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch("/api/connections");
        const connections: DatabaseConnection[] = await response.json();

        // Define your default Snowflake connection
        const defaultConnection: DatabaseConnection = {
          id: "default_snowflake",
          name: "SLM Warehouse",
          type: "snowflake",
          status: "connected",
          lastConnected: new Date(),
          tables: [],
          config: {
            account:
              process.env.NEXT_PUBLIC_SNOWFLAKE_ACCOUNT ||
              "default-account.snowflakecomputing.com",
            warehouse: "SNOWFLAKE_LEARNING_WH",
            database: "ADHOC",
            schema: "PUBLIC",
            role: "SYSADMIN",
            // add other config if needed
          },
        };

        // Check if default connection already exists in the fetched connections
        const hasDefault = connections.some(
          (conn) => conn.id === defaultConnection.id
        );

        // If default not present, add it
        const allConnections = hasDefault
          ? connections
          : [defaultConnection, ...connections];

        // Set selected connection to default
        setSelectedConnection(defaultConnection);

        // Optionally, you can auto-advance to "ai-query" tab if default is connected
        if (defaultConnection.status === "connected") {
          setActiveTab("ai-query");
        }
      } catch (error) {
        console.error("Error loading connections:", error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadInitialData();
  }, []);

  const handleConnectionSelect = (connection: DatabaseConnection) => {
    setSelectedConnection(connection);
    // Don't auto-advance tabs, let user navigate manually
  };

  const handleQueryExecute = (query: string, result: QueryResult) => {
    setCurrentQuery(query);
    setCurrentResult(result);
    setActiveTab("visualization");

    const newAnalysis: AnalysisResult = {
      id: `analysis_${Date.now()}`,
      query,
      result,
      timestamp: new Date(),
    };

    setAnalysisHistory((prev) => [newAnalysis, ...prev]);
  };

  const handleHistorySelect = (analysis: any) => {
    setCurrentQuery(analysis.query);

    // Convert history format to QueryResult format
    const mockResult: QueryResult = {
      columns: ["AREA", "TOTAL_REVENUE", "SWAP_COUNT", "TREND"],
      data: [
        ["Downtown", 10625.0, 1250, "↗ +15%"],
        ["University District", 7565.0, 890, "↗ +8%"],
        ["Business District", 9350.0, 1100, "↘ -3%"],
      ],
      executionTime: 1.0,
      rowCount: 3,
    };

    setCurrentResult(mockResult);
    setActiveTab("visualization");
  };

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case "connections":
        return selectedConnection ? "completed" : "active";
      case "ai-query":
        return selectedConnection
          ? currentResult
            ? "completed"
            : "active"
          : "disabled";
      case "visualization":
        return currentResult ? "active" : "disabled";
      case "history":
        return "history"; // ✅ Make sure this matches the case in getStatusIcon
      case "access":
        // Enable Access tab only if a query result exists
        return "access";
      default:
        return "disabled";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "active":
        return <Zap className="h-4 w-4 text-cyan-400" />;
      case "disabled":
        return <AlertCircle className="h-4 w-4 text-slate-500" />;
      case "access":
        return <LockOpen className="h-4 w-4 text-yellow-400" />;
      case "history":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  const tabStatus = getTabStatus(activeTab);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Ad-hoc Data Analysis
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Connect to your data sources, ask questions in natural language, and
            get instant insights with AI-powered analytics
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-cyan-400" />
                <div>
                  <p className="text-sm text-slate-400">Connections</p>
                  <p className="text-xl font-bold text-white">
                    {selectedConnection ? "1" : "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-sm text-slate-400">AI Queries</p>
                  <p className="text-xl font-bold text-white">
                    {analysisHistory.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-sm text-slate-400">Visualizations</p>
                  <p className="text-xl font-bold text-white">
                    {currentResult ? "1" : "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedConnection?.status === "connected"
                        ? "text-green-400 border-green-400/30"
                        : "text-slate-400 border-slate-400/30"
                    }
                  >
                    {selectedConnection?.status === "connected"
                      ? "Ready"
                      : "Setup Required"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Analysis Workspace</CardTitle>
            <CardDescription className="text-slate-400">
              Follow the workflow: Connect → Query → Visualize → Analyze
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-700">
                <TabsTrigger
                  value="connections"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(getTabStatus("connections"))}
                    <span>Connect</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="ai-query"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                  disabled={getTabStatus("ai-query") === "disabled"}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(getTabStatus("ai-query"))}
                    <span>Query</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="visualization"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                  disabled={getTabStatus("visualization") === "disabled"}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(getTabStatus("visualization"))}
                    <span>Visualize</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(getTabStatus("history"))}
                    <span>History</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="access"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                  // disabled={getTabStatus("access") === "disabled"}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(getTabStatus("access"))}
                    <span>Access</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="connections" className="mt-0">
                  <DatabaseConnector
                    onConnectionSelect={handleConnectionSelect}
                    selectedConnection={selectedConnection}
                  />
                </TabsContent>

                <TabsContent value="ai-query" className="mt-0">
                  {selectedConnection ? (
                    <AIQueryBuilder
                      connection={selectedConnection}
                      onQueryExecute={handleQueryExecute}
                    />
                  ) : (
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                        <h3 className="text-lg font-medium text-white mb-2">
                          No Connection Selected
                        </h3>
                        <p className="text-slate-400 mb-4">
                          Please select a database connection first to start
                          querying data
                        </p>
                        <Button
                          onClick={() => setActiveTab("connections")}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          Go to Connections
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="visualization" className="mt-0">
                  {currentResult ? (
                    <ChartRenderer
                      data={currentResult.data}
                      columns={currentResult.columns}
                      query={currentQuery}
                      // Prompt={
                      //   "Show top 5 areas by revenue and swap count, include a trend column with up or down arrows and percentage change"
                      // }
                    />
                  ) : (
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-8 text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                        <h3 className="text-lg font-medium text-white mb-2">
                          No Data to Visualize
                        </h3>
                        <p className="text-slate-400 mb-4">
                          Execute a query first to generate visualizations and
                          insights
                        </p>
                        <Button
                          onClick={() => setActiveTab("ai-query")}
                          disabled={!selectedConnection}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          Run a Query
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <AnalysisHistory
                    onHistorySelect={handleHistorySelect}
                    selectedConnection={selectedConnection}
                    onQueryRerun={handleQueryExecute}
                  />
                </TabsContent>

                <TabsContent value="access" className="mt-0">
                  <SankeyPage />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
