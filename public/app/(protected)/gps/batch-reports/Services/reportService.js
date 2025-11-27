// Report Generation Service (integrated into component)
class ReportGenerationService {
  constructor() {
    this.activeGenerations = new Map();
    this.reportHistory = this.loadReportHistory();
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => callback());
  }

  async generateReport(config) {
    const reportId = this.generateReportId();
    const report = {
      id: reportId,
      name: this.getReportName(config.type, config.timeRange),
      type: config.type,
      status: "generating",
      generatedAt: null,
      size: null,
      pages: null,
      format: config.format || "PDF",
      progress: 0,
      config: config,
      dataPoints: this.estimateDataPoints(config),
      vehiclesAnalyzed: this.estimateVehicles(config),
      sections: this.getReportSections(config.type),
      error: null,
    };

    this.activeGenerations.set(reportId, report);
    this.addToHistory(report);
    this.simulateGeneration(reportId);
    this.notifyListeners();

    return report;
  }

  simulateGeneration(reportId) {
    const report = this.activeGenerations.get(reportId);
    if (!report) return;

    const updateProgress = () => {
      const currentProgress = report.progress;
      const increment = Math.random() * 15 + 5;
      const newProgress = Math.min(100, currentProgress + increment);

      report.progress = newProgress;
      this.updateReportInHistory(report);
      this.notifyListeners();

      if (Math.random() < 0.05 && newProgress > 50) {
        report.status = "failed";
        report.error = this.getRandomError();
        this.activeGenerations.delete(reportId);
        this.updateReportInHistory(report);
        this.notifyListeners();
        return;
      }

      if (newProgress >= 100) {
        report.status = "completed";
        report.progress = 100;
        report.generatedAt = new Date()
          .toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replace(",", "");
        report.size = this.generateFileSize(report.type);
        report.pages = this.generatePageCount(report.type);

        this.activeGenerations.delete(reportId);
        this.updateReportInHistory(report);
        this.notifyListeners();
      } else {
        setTimeout(updateProgress, Math.random() * 2000 + 1000);
      }
    };

    setTimeout(updateProgress, 500);
  }

  cancelGeneration(reportId) {
    const report = this.activeGenerations.get(reportId);
    if (report) {
      report.status = "cancelled";
      report.error = "Generation cancelled by user";
      this.activeGenerations.delete(reportId);
      this.updateReportInHistory(report);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  retryReport(reportId) {
    const report = this.getReportById(reportId);
    if (report && report.status === "failed") {
      report.status = "generating";
      report.progress = 0;
      report.error = null;
      this.activeGenerations.set(reportId, report);
      this.updateReportInHistory(report);
      this.simulateGeneration(reportId);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  getReportById(id) {
    return this.reportHistory.find((report) => report.id === id);
  }

  getAllReports() {
    return [...this.reportHistory].sort(
      (a, b) => new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0)
    );
  }

  deleteReport(reportId) {
    this.reportHistory = this.reportHistory.filter((r) => r.id !== reportId);
    this.activeGenerations.delete(reportId);
    this.notifyListeners();
    return true;
  }

  async downloadReport(report) {
    if (report.status !== "completed") {
      throw new Error("Report is not ready for download");
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `${report.name} downloaded successfully`,
          filename: `${report.name.replace(/\s+/g, "_")}_${
            report.id
          }.${report.format.toLowerCase()}`,
        });
      }, 1000);
    });
  }

  // Helper methods
  generateReportId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  getReportName(type, timeRange) {
    const templates = {
      comprehensive: "Daily GPS Batch Analysis Report",
      vehicle_usage: "Vehicle Usage Summary Report",
      route_analysis: "Route Metrics Analysis Report",
      battery_health: "Battery Health Tracker Report",
      alert_analysis: "Alert Logs Analysis Report",
    };

    const timeLabels = {
      "1d": "24h",
      "7d": "7d",
      "30d": "30d",
      "90d": "90d",
    };

    return `${templates[type]} (${timeLabels[timeRange] || timeRange})`;
  }

  estimateDataPoints(config) {
    const basePoints = {
      comprehensive: 2340000,
      vehicle_usage: 890000,
      route_analysis: 1560000,
      battery_health: 456000,
      alert_analysis: 23000,
    };

    const timeMultipliers = {
      "1d": 0.03,
      "7d": 0.2,
      "30d": 1,
      "90d": 3,
    };

    return Math.floor(
      basePoints[config.type] * (timeMultipliers[config.timeRange] || 1)
    );
  }

  estimateVehicles(config) {
    const timeMultipliers = {
      "1d": 0.8,
      "7d": 0.9,
      "30d": 1,
      "90d": 1,
    };

    return Math.floor(1247 * (timeMultipliers[config.timeRange] || 1));
  }

  getReportSections(type) {
    const sections = {
      comprehensive: [
        "Executive Summary",
        "Vehicle Usage Summary",
        "Route Metrics Analysis",
        "Battery Health Tracking",
        "Alert Logs Analysis",
        "Heatmap Coordinates",
        "Performance Recommendations",
      ],
      vehicle_usage: [
        "Daily Distance Analysis",
        "Battery Consumption Patterns",
        "Temperature and RPM Analysis",
        "Idle Time Assessment",
        "Efficiency Scoring",
        "Vehicle Performance Ranking",
      ],
      route_analysis: [
        "Route Frequency Analysis",
        "Efficiency Score Breakdown",
        "Duration vs Distance Analysis",
        "Popular Route Corridors",
        "Optimization Recommendations",
      ],
      battery_health: [
        "SOH Trend Analysis",
        "Battery Cycle Tracking",
        "Temperature Impact Assessment",
        "Health Status Distribution",
        "Maintenance Recommendations",
        "Replacement Scheduling",
      ],
      alert_analysis: [
        "Alert Type Distribution",
        "Severity Analysis",
        "Geographic Alert Patterns",
        "Time-based Alert Trends",
        "Resolution Status Tracking",
        "Prevention Strategies",
      ],
    };

    return sections[type] || sections.comprehensive;
  }

  generateFileSize(type) {
    const baseSizes = {
      comprehensive: { min: 3.8, max: 4.6 },
      vehicle_usage: { min: 1.8, max: 2.4 },
      route_analysis: { min: 2.2, max: 2.8 },
      battery_health: { min: 1.5, max: 2.1 },
      alert_analysis: { min: 0.8, max: 1.4 },
    };

    const range = baseSizes[type] || baseSizes.comprehensive;
    const size = Math.random() * (range.max - range.min) + range.min;
    return `${size.toFixed(1)} MB`;
  }

  generatePageCount(type) {
    const basePages = {
      comprehensive: { min: 60, max: 80 },
      vehicle_usage: { min: 30, max: 40 },
      route_analysis: { min: 25, max: 35 },
      battery_health: { min: 20, max: 30 },
      alert_analysis: { min: 15, max: 25 },
    };

    const range = basePages[type] || basePages.comprehensive;
    return Math.floor(Math.random() * (range.max - range.min) + range.min);
  }

  getRandomError() {
    const errors = [
      "Database connection timeout during data aggregation",
      "Insufficient memory for large dataset processing",
      "Data validation failed: incomplete vehicle records",
      "External service unavailable: mapping API timeout",
      "Report template rendering failed",
      "Disk space insufficient for report generation",
      "Network timeout during batch data retrieval",
    ];

    return errors[Math.floor(Math.random() * errors.length)];
  }

  loadReportHistory() {
    return [
      {
        id: "1",
        name: "Daily GPS Batch Analysis Report",
        type: "comprehensive",
        status: "completed",
        generatedAt: "2024-01-15 01:30",
        size: "4.2 MB",
        pages: 67,
        format: "PDF",
        dataPoints: 2340000,
        vehiclesAnalyzed: 1247,
      },
      {
        id: "2",
        name: "Vehicle Usage Summary Report",
        type: "vehicle_usage",
        status: "completed",
        generatedAt: "2024-01-15 01:15",
        size: "2.1 MB",
        pages: 34,
        format: "Excel",
        dataPoints: 890000,
        vehiclesAnalyzed: 1247,
      },
    ];
  }

  addToHistory(report) {
    const existingIndex = this.reportHistory.findIndex(
      (r) => r.id === report.id
    );
    if (existingIndex >= 0) {
      this.reportHistory[existingIndex] = { ...report };
    } else {
      this.reportHistory.unshift({ ...report });
    }
  }

  updateReportInHistory(report) {
    const index = this.reportHistory.findIndex((r) => r.id === report.id);
    if (index >= 0) {
      this.reportHistory[index] = { ...report };
    }
  }
}

export default ReportGenerationService;
