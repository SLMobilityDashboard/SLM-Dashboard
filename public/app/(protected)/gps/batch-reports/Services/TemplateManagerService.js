// Template Manager Service
export class TemplateManagerService {
  constructor() {
    this.templates = this.loadTemplates();
    this.listeners = [];
  }

  loadTemplates() {
    // Default templates
    const defaultTemplates = [
      {
        id: "comprehensive",
        name: "Daily GPS Batch Analysis Report",
        description:
          "Complete analysis of GPS data, telemetry, routes, battery health, and alerts from daily batch processing",
        type: "system",
        isDefault: true,
        sections: [
          {
            id: "exec_summary",
            name: "Executive Summary",
            enabled: true,
            order: 1,
          },
          {
            id: "vehicle_usage",
            name: "Vehicle Usage Summary (DAILY_VEHICLE_USAGE_SUMMARY)",
            enabled: true,
            order: 2,
          },
          {
            id: "route_metrics",
            name: "Route Metrics Analysis (DAILY_ROUTE_METRICS)",
            enabled: true,
            order: 3,
          },
          {
            id: "battery_health",
            name: "Battery Health Tracking (BATTERY_HEALTH_TRACKER)",
            enabled: true,
            order: 4,
          },
          {
            id: "alert_logs",
            name: "Alert Logs Analysis (ALERT_LOGS)",
            enabled: false,
            order: 5,
          },
          {
            id: "heatmap",
            name: "Heatmap Coordinates",
            enabled: true,
            order: 6,
          },
          {
            id: "recommendations",
            name: "Performance Recommendations",
            enabled: true,
            order: 7,
          },
        ],
        dataTables: {
          vehicle_usage: true,
          route_metrics: true,
          battery_health: true,
          alert_logs: false,
        },
        estimatedPages: "60-80",
        estimatedTime: "25-30 min",
        dataPoints: "2M+",
        createdAt: "2024-01-15",
        createdBy: "System",
        lastModified: "2024-01-15",
        usageCount: 245,
        rating: 4.8,
      },
      {
        id: "vehicle_usage",
        name: "Vehicle Usage Summary Report",
        description:
          "Detailed analysis of daily vehicle usage including distance, battery consumption, and efficiency metrics",
        type: "system",
        isDefault: true,
        sections: [
          {
            id: "daily_distance",
            name: "Daily Distance Analysis",
            enabled: true,
            order: 1,
          },
          {
            id: "battery_consumption",
            name: "Battery Consumption Patterns",
            enabled: true,
            order: 2,
          },
          {
            id: "temp_rpm",
            name: "Temperature and RPM Analysis",
            enabled: true,
            order: 3,
          },
          {
            id: "idle_time",
            name: "Idle Time Assessment",
            enabled: true,
            order: 4,
          },
          {
            id: "efficiency",
            name: "Efficiency Scoring",
            enabled: true,
            order: 5,
          },
          {
            id: "ranking",
            name: "Vehicle Performance Ranking",
            enabled: true,
            order: 6,
          },
        ],
        dataTables: {
          vehicle_usage: true,
          route_metrics: false,
          battery_health: true,
          alert_logs: false,
        },
        estimatedPages: "30-40",
        estimatedTime: "15-20 min",
        dataPoints: "800K+",
        createdAt: "2024-01-15",
        createdBy: "System",
        lastModified: "2024-01-15",
        usageCount: 156,
        rating: 4.6,
      },
    ];

    // Load custom templates from state (in a real app, this would be from localStorage or API)
    const customTemplates = [];

    return [...defaultTemplates, ...customTemplates];
  }

  getAllTemplates() {
    return this.templates;
  }

  getTemplate(id) {
    return this.templates.find((t) => t.id === id);
  }

  createTemplate(templateData) {
    const newTemplate = {
      ...templateData,
      id: `custom_${Date.now()}`,
      type: "custom",
      isDefault: false,
      createdAt: new Date().toISOString().split("T")[0],
      createdBy: "User",
      lastModified: new Date().toISOString().split("T")[0],
      usageCount: 0,
      rating: 0,
    };

    this.templates.push(newTemplate);
    this.notifyListeners();
    return newTemplate;
  }

  updateTemplate(id, updates) {
    const index = this.templates.findIndex((t) => t.id === id);
    if (index !== -1 && this.templates[index].type === "custom") {
      this.templates[index] = {
        ...this.templates[index],
        ...updates,
        lastModified: new Date().toISOString().split("T")[0],
      };
      this.notifyListeners();
      return this.templates[index];
    }
    return null;
  }

  duplicateTemplate(id) {
    const template = this.getTemplate(id);
    if (template) {
      const duplicated = {
        ...template,
        id: `custom_${Date.now()}`,
        name: `${template.name} (Copy)`,
        type: "custom",
        isDefault: false,
        createdAt: new Date().toISOString().split("T")[0],
        createdBy: "User",
        lastModified: new Date().toISOString().split("T")[0],
        usageCount: 0,
        rating: 0,
      };
      this.templates.push(duplicated);
      this.notifyListeners();
      return duplicated;
    }
    return null;
  }

  deleteTemplate(id) {
    const index = this.templates.findIndex((t) => t.id === id);
    if (index !== -1 && this.templates[index].type === "custom") {
      this.templates.splice(index, 1);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => callback());
  }
}
