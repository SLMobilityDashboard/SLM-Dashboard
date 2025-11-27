import React, { useState, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Settings,
  Eye,
  Filter,
  Download,
} from "lucide-react";

// Custom components to match the design
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg ${className}`}
  >
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const CardHeader = ({ children }) => <div className="p-6 pb-3">{children}</div>;

const CardTitle = ({ children }) => (
  <h3 className="text-lg font-semibold text-slate-200">{children}</h3>
);

const Badge = ({ children, className = "" }) => (
  <span className={`px-2 py-1 text-xs rounded-md border ${className}`}>
    {children}
  </span>
);

const Button = ({
  children,
  variant = "default",
  size = "default",
  className = "",
  ...props
}) => {
  const baseClass =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors";
  const variants = {
    default: "bg-blue-600 hover:bg-blue-700 text-white",
    outline:
      "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700",
    ghost: "hover:bg-slate-700 text-slate-300",
  };
  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-sm",
    xs: "px-2 py-1 text-xs",
  };

  return (
    <button
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Select = ({ children, value, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-40 px-3 py-2 text-left bg-slate-800/50 border border-slate-600 rounded-md text-slate-300 text-sm"
      >
        {value === "all" ? "All Severities" : value}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-slate-800 border border-slate-600 rounded-md shadow-lg z-10">
          {React.Children.map(children, (child) =>
            React.cloneElement(child, { onValueChange, setIsOpen })
          )}
        </div>
      )}
    </div>
  );
};

const SelectItem = ({ value, children, onValueChange, setIsOpen }) => (
  <button
    className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-700 text-sm"
    onClick={() => {
      onValueChange(value);
      setIsOpen(false);
    }}
  >
    {children}
  </button>
);

const Tabs = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className="space-y-4">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </div>
  );
};

const TabsList = ({ children, activeTab, setActiveTab }) => (
  <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
    {React.Children.map(children, (child) =>
      React.cloneElement(child, { activeTab, setActiveTab })
    )}
  </div>
);

const TabsTrigger = ({ value, children, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(value)}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === value
        ? "bg-slate-700 text-white"
        : "text-slate-400 hover:text-slate-300"
    }`}
  >
    {children}
  </button>
);

const TabsContent = ({ value, children, activeTab }) => {
  if (activeTab !== value) return null;
  return <div>{children}</div>;
};

export default function AlertsMonitoring() {
  // Alert types with icons and descriptions
  const ALERT_TYPES = [
    {
      type: "Battery Low",
      category: "scooter",
      severity: "warning",
      description: "Scooter battery below 15%",
      icon: "battery",
    },
    {
      type: "GPS Signal Lost",
      category: "scooter",
      severity: "critical",
      description: "No GPS signal for over 5 minutes",
      icon: "alert",
    },
    {
      type: "Station Offline",
      category: "station",
      severity: "critical",
      description: "Charging station not responding",
      icon: "bell",
    },
    {
      type: "High Usage",
      category: "system",
      severity: "info",
      description: "Station utilization above 90%",
      icon: "zap",
    },
    {
      type: "Maintenance Due",
      category: "scooter",
      severity: "warning",
      description: "Scheduled maintenance overdue",
      icon: "settings",
    },
  ];

  // Generate random alerts
  function generateRandomAlerts(count = 25) {
    return Array.from({ length: count }, (_, i) => {
      const alertType =
        ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
      const timestamp = new Date(
        Date.now() - Math.random() * 24 * 60 * 60 * 1000
      );

      return {
        id: i + 1,
        ...alertType,
        timestamp: timestamp.toISOString(),
        location: `Station ${Math.floor(Math.random() * 156) + 1}`,
        deviceId: `SCT-${Math.floor(Math.random() * 2847) + 1}`,
        status: Math.random() > 0.7 ? "resolved" : "active",
        acknowledged: Math.random() > 0.6,
      };
    }).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  const [alerts, setAlerts] = useState(generateRandomAlerts());
  const [alertStats, setAlertStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    resolved: 0,
  });
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    const stats = {
      total: alerts.length,
      critical: alerts.filter(
        (a) => a.severity === "critical" && a.status === "active"
      ).length,
      warning: alerts.filter(
        (a) => a.severity === "warning" && a.status === "active"
      ).length,
      info: alerts.filter((a) => a.severity === "info" && a.status === "active")
        .length,
      resolved: alerts.filter((a) => a.status === "resolved").length,
    };
    setAlertStats(stats);
  }, [alerts]);

  // Real-time simulation of new alerts every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const alertType =
          ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
        const newAlert = {
          id: Date.now(),
          ...alertType,
          timestamp: new Date().toISOString(),
          location: `Station ${Math.floor(Math.random() * 156) + 1}`,
          deviceId: `SCT-${Math.floor(Math.random() * 2847) + 1}`,
          status: "active",
          acknowledged: false,
        };
        setAlerts((prev) => [newAlert, ...prev.slice(0, 24)]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/50";
      case "info":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return AlertCircle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Bell;
      default:
        return Bell;
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const severityMatch =
      filterSeverity === "all" || alert.severity === filterSeverity;
    const categoryMatch =
      filterCategory === "all" || alert.category === filterCategory;
    return severityMatch && categoryMatch;
  });

  return (
    <div className="min-h-screen text-slate-200">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Alerts Monitoring
            </h1>
            <p className="text-slate-400">
              Real-time alert management and monitoring system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              LIVE
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Alerts</p>
                  <p className="text-2xl font-bold text-white">
                    {alertStats.total}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">All time</p>
                </div>
                <Bell className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-red-400 text-sm mb-1">Critical</p>
                  <p className="text-2xl font-bold text-red-400">
                    {alertStats.critical}
                  </p>
                  <p className="text-xs text-red-500/70 mt-1">
                    Needs attention
                  </p>
                </div>
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-amber-400 text-sm mb-1">Warning</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {alertStats.warning}
                  </p>
                  <p className="text-xs text-amber-500/70 mt-1">
                    Monitor closely
                  </p>
                </div>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-400 text-sm mb-1">Info</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {alertStats.info}
                  </p>
                  <p className="text-xs text-blue-500/70 mt-1">Informational</p>
                </div>
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/30">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-400 text-sm mb-1">Resolved</p>
                  <p className="text-2xl font-bold text-green-400">
                    {alertStats.resolved}
                  </p>
                  <p className="text-xs text-green-500/70 mt-1">Completed</p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-4">
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="scooter">Scooter</SelectItem>
              <SelectItem value="station">Station</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Active Alerts ({alertStats.total - alertStats.resolved})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({alertStats.resolved})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card className="max-h-[60vh] overflow-auto">
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredAlerts
                    .filter((a) => a.status === "active")
                    .map((alert) => {
                      const SeverityIcon = getSeverityIcon(alert.severity);

                      return (
                        <div
                          key={alert.id}
                          className={`p-4 rounded-lg border ${
                            alert.acknowledged
                              ? "bg-slate-800/30 border-slate-600/50"
                              : "bg-slate-700/30 border-slate-500/50"
                          } flex justify-between items-start space-x-4`}
                        >
                          <div className="flex space-x-3 items-center">
                            <SeverityIcon
                              className={`w-5 h-5 ${
                                alert.severity === "critical"
                                  ? "text-red-400"
                                  : alert.severity === "warning"
                                  ? "text-amber-400"
                                  : "text-blue-400"
                              }`}
                            />
                            <Settings className="w-5 h-5 text-slate-300" />
                          </div>

                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="font-semibold text-white">
                                {alert.type}
                              </h4>
                              <span className="text-xs text-slate-400">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 mb-2">
                              {alert.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge
                                className={getSeverityColor(alert.severity)}
                              >
                                {alert.severity}
                              </Badge>
                              <Badge className="bg-slate-700/50 border-slate-600 text-slate-300">
                                {alert.category}
                              </Badge>
                              <span className="text-slate-400">
                                Device: {alert.deviceId}
                              </span>
                              <span className="text-slate-400">
                                Location: {alert.location}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col space-y-1">
                            <Button size="xs" variant="ghost">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            {!alert.acknowledged && (
                              <Button
                                size="xs"
                                variant="ghost"
                                className="text-amber-400 hover:text-amber-300"
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300"
                            >
                              Resolve
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resolved">
            <Card className="max-h-[60vh] overflow-auto">
              <CardHeader>
                <CardTitle>Resolved Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredAlerts
                    .filter((a) => a.status === "resolved")
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 rounded-lg border border-slate-600/50 bg-slate-800/20 flex items-start space-x-4"
                      >
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <Settings className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-semibold text-slate-300">
                              {alert.type}
                            </h4>
                            <span className="text-xs text-slate-400">
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mb-1">
                            {alert.description}
                          </p>
                          <div className="text-xs text-slate-500">
                            Device: {alert.deviceId} | Location:{" "}
                            {alert.location}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
