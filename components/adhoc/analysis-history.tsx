"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";
import {
  History,
  Search,
  Filter,
  Play,
  Trash2,
  Clock,
  BarChart3,
  TrendingUp,
  Database,
  Zap,
  Brain,
  Calendar,
  ChevronRight,
  Loader2,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Edit3,
  User,
  MapPin,
  Battery,
  Truck,
  Users,
  Activity,
} from "lucide-react";

interface AnalysisHistoryProps {
  onHistorySelect: (analysis: any) => void;
  onQueryRerun: (sql: string, analysis: any) => Promise<void>;
  selectedConnection: any;
}

interface QueryResult {
  columns: string[];
  data: any[];
  executionTime: number;
  rowCount: number;
}

const categories = [
  "All Categories",
  "General Analysis",
  "Revenue Analysis",
  "Expense Insights",
  "Sales Insights",
  "Dealer Insights",
  "Marketing Insights",
  "GPS Insights",
  "Station Performance",
  "Battery Analytics",
  "Vehicle Operations",
  "Customer Analytics",
  "Operational Insights",
];

const timeFilters = [
  { label: "All Time", value: "all" },
  { label: "Last Hour", value: "1h" },
  { label: "Last 24 Hours", value: "24h" },
  { label: "Last Week", value: "7d" },
  { label: "Last Month", value: "30d" },
];

// Loading skeleton components
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-16 space-y-6">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
      <div
        className="absolute inset-0 w-16 h-16 border-4 border-transparent border-l-cyan-400 rounded-full animate-spin"
        style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
      />
    </div>

    <div className="text-center space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Database className="h-5 w-5 text-cyan-400 animate-pulse" />
        <h3 className="text-lg font-medium text-white">
          Loading Query History
        </h3>
      </div>
      <div className="text-m text-slate-400 space-y-1">
        <p className="m-10 animate-pulse">Fetching your analysis history...</p>
        <div className="flex items-center justify-center gap-1">
          <div
            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  </div>
);

// Toast notification component
const Toast = ({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) => (
  <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
    <div
      className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border ${
        type === "success"
          ? "bg-green-900/90 border-green-700 text-green-100"
          : "bg-red-900/90 border-red-700 text-red-100"
      } backdrop-blur-sm`}
    >
      {type === "success" ? (
        <CheckCircle className="h-5 w-5 text-green-400" />
      ) : (
        <XCircle className="h-5 w-5 text-red-400" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-6 w-6 p-0 hover:bg-transparent"
      >
        <XCircle className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

// Helper function to convert data to ChartRenderer format
const convertToChartFormat = (data: any[], columns: string[]): any[] => {
  // If data is already in array format (like your expected format), return as is
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return data;
  }

  // If data is array of objects, convert to array of arrays
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data.map((row) => columns.map((col) => row[col]));
  }

  // If no data, return empty array
  return [];
};

export function AnalysisHistory({
  onHistorySelect,
  onQueryRerun,
  selectedConnection,
}: AnalysisHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("all");
  const [mongoHistory, setMongoHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track IDs currently being deleted and rerun
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [rerunningIds, setRerunningIds] = useState<string[]>([]);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Toast notification state
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Animation states
  const [deletingAnimations, setDeletingAnimations] = useState<string[]>([]);

  // Get session data
  const { data: session } = useSession();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch data from Mongo API endpoint
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          "/api/query-history?connectionId=default_snowflake"
        );

        if (!res.ok) throw new Error("Failed to fetch query history");

        const response = await res.json(); // <-- Object with data, success, executionTime

        // Access array inside response.data
        const processed = response.data.map((item: any) => ({
          ...item,
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
        }));

        setMongoHistory(processed);
      } catch (err: any) {
        setError(err.message || "Unknown error");
        showToast("error", "Failed to load query history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const combinedHistory = useMemo(() => {
    // Return in reverse order, newest first
    return [...mongoHistory].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [mongoHistory]);

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const getCategoryIcon = (subtitle: string) => {
    switch (subtitle) {
      case "General Analysis":
        return <Brain className="h-4 w-4 text-cyan-400" />;
      case "Revenue Analysis":
        return <DollarSign className="h-4 w-4 text-emerald-400" />;
      case "Expense Insights":
        return <Edit3 className="h-4 w-4 text-red-400" />;
      case "Sales Insights":
        return <ShoppingCart className="h-4 w-4 text-orange-400" />;
      case "Dealer Insights":
        return <User className="h-4 w-4 text-indigo-400" />;
      case "Marketing Insights":
        return <BarChart3 className="h-4 w-4 text-green-400" />;
      case "GPS Insights":
        return <Clock className="h-4 w-4 text-purple-400" />;
      case "Station Performance":
        return <MapPin className="h-4 w-4 text-blue-400" />;
      case "Battery Analytics":
        return <Battery className="h-4 w-4 text-amber-400" />;
      case "Vehicle Operations":
        return <Truck className="h-4 w-4 text-purple-400" />;
      case "Customer Analytics":
        return <Users className="h-4 w-4 text-cyan-400" />;
      case "Operational Insights":
        return <Activity className="h-4 w-4 text-rose-400" />;
      // Legacy cases (keeping for backward compatibility)
      case "Battery Health":
        return <Zap className="h-4 w-4 text-yellow-400" />;
      case "Usage Patterns":
        return <BarChart3 className="h-4 w-4 text-purple-400" />;
      case "E-Commerce Insights":
        return <ShoppingCart className="h-4 w-4 text-pink-400" />;
      default:
        return <History className="h-4 w-4 text-slate-400" />;
    }
  };

  const filteredHistory = useMemo(() => {
    let filtered = combinedHistory;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.query?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter((item) => item.subtitle === selectedCategory);
    }

    if (selectedTimeFilter !== "all") {
      const now = new Date();
      const filterTime = {
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      }[selectedTimeFilter];

      if (filterTime) {
        filtered = filtered.filter(
          (item) =>
            now.getTime() - new Date(item.timestamp).getTime() <= filterTime
        );
      }
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [combinedHistory, searchTerm, selectedCategory, selectedTimeFilter]);

  // Updated rerun handler that calls the API and formats data correctly
  const handleQueryRerun = async (analysis: any) => {
    if (!selectedConnection) {
      showToast("error", "Please select a database connection first");
      return;
    }

    if (!analysis.sql) {
      showToast("error", "No SQL query found for this analysis");
      return;
    }

    try {
      setRerunningIds((ids) => [...ids, analysis.id]);

      // Call the RunSQLQuery API with username
      const response = await fetch("/api/RunSQLQuery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql: analysis.sql,
          connectionId: "snowflake_1751620346752",
          username: session?.user?.name || session?.user?.email || "unknown", // Pass username
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Query execution failed");
      }

      const data = await response.json();
      console.log("Raw API response:", data);

      const { columns, rows, executionTime, rowCount } = data.result;

      // Convert to the format expected by ChartRenderer
      const formattedData = convertToChartFormat(rows, columns);

      // Call the parent component's rerun handler with the formatted results
      const queryResult: QueryResult = {
        columns,
        data: formattedData, // Now in array of arrays format
        executionTime,
        rowCount,
      };

      await onQueryRerun(analysis.sql, queryResult);
      showToast("success", "Query executed successfully");
    } catch (error: any) {
      console.error("Error rerunning query:", error);
      showToast("error", `Error rerunning query: ${error.message}`);
    } finally {
      setRerunningIds((ids) => ids.filter((id) => id !== analysis.id));
    }
  };

  // Updated history select handler to format data correctly
  const handleHistorySelect = (analysis: any) => {
    // If we have stored result data, format it correctly
    if (analysis.result && analysis.result.data) {
      const formattedData = convertToChartFormat(
        analysis.result.data,
        analysis.result.columns || []
      );

      const formattedAnalysis = {
        ...analysis,
        result: {
          ...analysis.result,
          data: formattedData,
        },
      };

      onHistorySelect(formattedAnalysis);
    } else {
      // Fallback - create mock data in the expected format if no stored data
      const mockResult: QueryResult = {
        columns: ["ID", "NAME", "VALUE", "SCORE"],
        data: [
          [42, `${analysis.title} Result`, 15, 5],
          [11, `${analysis.subtitle} Data`, 4, 2],
          [13, "Sample Product", 30, 2],
        ],
        executionTime: analysis.executionTime || 1.0,
        rowCount: 3,
      };

      const mockAnalysis = {
        ...analysis,
        result: mockResult,
      };

      onHistorySelect(mockAnalysis);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (analysis: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(analysis);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setDeletingIds((ids) => [...ids, itemToDelete.id]);
      setDeletingAnimations((ids) => [...ids, itemToDelete.id]);
      setDeleteDialogOpen(false);

      console.log("Deleting history item with ID:", itemToDelete.id);
      const res = await fetch(`/api/query-history/${itemToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      // Wait for animation before removing from state
      setTimeout(() => {
        setMongoHistory((prev) =>
          prev.filter((item) => item.id !== itemToDelete.id)
        );
        setDeletingAnimations((ids) =>
          ids.filter((id) => id !== itemToDelete.id)
        );
        showToast("success", "Query deleted successfully");
      }, 300);
    } catch (err: any) {
      setDeletingAnimations((ids) =>
        ids.filter((id) => id !== itemToDelete.id)
      );
      showToast("error", `Error deleting item: ${err.message}`);
    } finally {
      setDeletingIds((ids) =>
        ids.filter((deleteId) => deleteId !== itemToDelete.id)
      );
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-white">
                  Delete Query History
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete this analysis?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {itemToDelete && (
            <div className="my-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                {getCategoryIcon(itemToDelete.subtitle)}
                <span className="text-white font-medium">
                  {itemToDelete.title}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-xs border-slate-600 text-slate-300"
              >
                {itemToDelete.subtitle}
              </Badge>
              <p className="text-xs text-slate-400 mt-2">
                This action cannot be undone. The query and its results will be
                permanently removed.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="h-5 w-5" />
            Analysis History
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
          <CardDescription className="text-slate-400">
            View and rerun your previous queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  disabled={loading}
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                disabled={loading}
              >
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {categories.map((subtitle) => (
                    <SelectItem
                      key={subtitle}
                      value={subtitle}
                      className="text-white hover:bg-slate-700"
                    >
                      {subtitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedTimeFilter}
                onValueChange={setSelectedTimeFilter}
                disabled={loading}
              >
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {timeFilters.map((filter) => (
                    <SelectItem
                      key={filter.value}
                      value={filter.value}
                      className="text-white hover:bg-slate-700"
                    >
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-slate-400 flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? "Loading..."
                : error
                ? `Error: ${error}`
                : `${filteredHistory.length} ${
                    filteredHistory.length === 1 ? "query" : "queries"
                  } found`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      {loading ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <LoadingSpinner />
          </CardContent>
        </Card>
      ) : error ? (
        <div className="text-center text-red-500 py-10">{error}</div>
      ) : filteredHistory.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <History className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium text-white mb-2">
              No queries found
            </h3>
            <p className="text-slate-400">
              {searchTerm ||
              selectedCategory !== "All Categories" ||
              selectedTimeFilter !== "all"
                ? "Try adjusting your filters to see more results"
                : "Start by running some queries to build your analysis history"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((analysis) => (
            <Card
              key={analysis.id}
              className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer ${
                deletingAnimations.includes(analysis.id)
                  ? "animate-out slide-out-to-right-2 fade-out-50 duration-300"
                  : "animate-in fade-in-50 slide-in-from-left-2 duration-300"
              }`}
              // onClick={() => handleHistorySelect(analysis)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      {getCategoryIcon(analysis.subtitle)}
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">
                          {analysis.title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <Badge
                            variant="outline"
                            className="text-xs border-slate-600 text-slate-300"
                          >
                            {analysis.subtitle}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(analysis.timestamp)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {parseInt(analysis.rowCount) || 0} rows
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {parseFloat(analysis.executionTime) || 0}s
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">
                        Generated SQL:
                      </p>
                      <code className="text-xs text-cyan-400 font-mono">
                        {analysis.sql?.length > 100
                          ? `${analysis.sql.substring(0, 100)}...`
                          : analysis.sql}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQueryRerun(analysis);
                      }}
                      disabled={
                        rerunningIds.includes(analysis.id) ||
                        !selectedConnection ||
                        deletingAnimations.includes(analysis.id)
                      }
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-700"
                    >
                      {rerunningIds.includes(analysis.id) ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {rerunningIds.includes(analysis.id)
                        ? "Running..."
                        : "Rerun"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                      onClick={(e) => handleDeleteClick(analysis, e)}
                      disabled={
                        deletingIds.includes(analysis.id) ||
                        deletingAnimations.includes(analysis.id)
                      }
                    >
                      {deletingIds.includes(analysis.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Summary Stats Footer */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Total Queries */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Database className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-white">
                {filteredHistory.length.toLocaleString()}
              </p>
              <p className="text-sm text-slate-400 font-medium">
                Total Queries
              </p>
            </div>

            {/* Unique Categories */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-purple-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-white">
                {
                  filteredHistory
                    .map((h) => h.subtitle)
                    .filter((v, i, a) => a.indexOf(v) === i).length
                }
              </p>
              <p className="text-sm text-slate-400 font-medium">Categories</p>
            </div>

            {/* Average Execution Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-white">
                {filteredHistory.length > 0
                  ? (
                      filteredHistory.reduce(
                        (sum, item) =>
                          sum + (parseFloat(item.executionTime) || 0),
                        0
                      ) / filteredHistory.length
                    ).toFixed(2)
                  : "0.00"}
                <span className="text-lg text-slate-400">s</span>
              </p>
              <p className="text-sm text-slate-400 font-medium">
                Avg Execution
              </p>
            </div>

            {/* Total Rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-white">
                {filteredHistory
                  .reduce(
                    (sum, item) => sum + (parseInt(item.rowsReturned) || 0),
                    0
                  )
                  .toLocaleString()}
              </p>
              <p className="text-sm text-slate-400 font-medium">Total Rows</p>
            </div>
          </div>

          {/* Additional Stats Row */}
          {filteredHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                {/* Total Execution Time */}
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">
                    {filteredHistory
                      .reduce(
                        (sum, item) =>
                          sum + (parseFloat(item.executionTime) || 0),
                        0
                      )
                      .toFixed(2)}
                    s
                  </p>
                  <p className="text-xs text-slate-400">Total Execution Time</p>
                </div>

                {/* Most Recent Query */}
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">
                    {formatTimeAgo(new Date(filteredHistory[0]?.timestamp))}
                  </p>
                  <p className="text-xs text-slate-400">Most Recent</p>
                </div>

                {/* Most Common Category */}
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <p className="text-lg font-semibold text-white truncate">
                    {(() => {
                      const counts = filteredHistory.reduce((acc, item) => {
                        acc[item.subtitle] = (acc[item.subtitle] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const mostCommon = Object.entries(counts).sort(
                        ([, a], [, b]) => b - a
                      )[0];
                      return mostCommon ? mostCommon[0] : "None";
                    })()}
                  </p>
                  <p className="text-xs text-slate-400">Most Common Category</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
