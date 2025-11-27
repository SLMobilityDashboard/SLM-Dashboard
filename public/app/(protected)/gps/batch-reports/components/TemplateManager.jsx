// components/TemplateManager.js
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Settings,
  BarChart3,
  Battery,
  Route,
  AlertTriangle,
  Users,
  Database,
  CheckCircle,
  XCircle,
  Save,
  X,
  Eye,
  Download,
  Star,
} from "lucide-react";

// Template Manager Service
class TemplateManagerService {
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

// Create singleton instance
const templateService = new TemplateManagerService();

// Available report sections
const AVAILABLE_SECTIONS = [
  { id: "exec_summary", name: "Executive Summary", icon: BarChart3 },
  { id: "vehicle_usage", name: "Vehicle Usage Summary", icon: Users },
  { id: "route_metrics", name: "Route Metrics Analysis", icon: Route },
  { id: "battery_health", name: "Battery Health Tracking", icon: Battery },
  { id: "alert_logs", name: "Alert Logs Analysis", icon: AlertTriangle },
  { id: "heatmap", name: "Heatmap Coordinates", icon: Database },
  {
    id: "recommendations",
    name: "Performance Recommendations",
    icon: CheckCircle,
  },
  { id: "daily_distance", name: "Daily Distance Analysis", icon: BarChart3 },
  {
    id: "battery_consumption",
    name: "Battery Consumption Patterns",
    icon: Battery,
  },
  { id: "temp_rpm", name: "Temperature and RPM Analysis", icon: Settings },
  { id: "idle_time", name: "Idle Time Assessment", icon: Users },
  { id: "efficiency", name: "Efficiency Scoring", icon: BarChart3 },
  { id: "ranking", name: "Vehicle Performance Ranking", icon: Users },
];

// Template Editor Component
function TemplateEditor({ template, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sections: [],
    dataTables: {
      vehicle_usage: false,
      route_metrics: false,
      battery_health: false,
      alert_logs: false,
    },
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (template && isOpen) {
      setFormData({
        name: template.name,
        description: template.description,
        sections: template.sections || [],
        dataTables: template.dataTables || {
          vehicle_usage: false,
          route_metrics: false,
          battery_health: false,
          alert_logs: false,
        },
      });
    } else if (isOpen) {
      setFormData({
        name: "",
        description: "",
        sections: [],
        dataTables: {
          vehicle_usage: false,
          route_metrics: false,
          battery_health: false,
          alert_logs: false,
        },
      });
    }
    setErrors({});
  }, [template, isOpen]);

  const handleSectionToggle = (sectionId) => {
    setFormData((prev) => {
      const existingIndex = prev.sections.findIndex((s) => s.id === sectionId);
      const newSections = [...prev.sections];

      if (existingIndex >= 0) {
        newSections[existingIndex].enabled =
          !newSections[existingIndex].enabled;
      } else {
        const sectionDef = AVAILABLE_SECTIONS.find((s) => s.id === sectionId);
        if (sectionDef) {
          newSections.push({
            id: sectionId,
            name: sectionDef.name,
            enabled: true,
            order: newSections.length + 1,
          });
        }
      }

      return { ...prev, sections: newSections };
    });
  };

  const handleDataTableToggle = (tableKey) => {
    setFormData((prev) => ({
      ...prev,
      dataTables: {
        ...prev.dataTables,
        [tableKey]: !prev.dataTables[tableKey],
      },
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Template description is required";
    }

    const enabledSections = formData.sections.filter((s) => s.enabled);
    if (enabledSections.length === 0) {
      newErrors.sections = "At least one section must be enabled";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[90vh] flex flex-col">
        {/* Header - fixed height */}
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-100">
            {template ? "Edit Template" : "Create New Template"}
          </h2>
          <p className="text-slate-400 mt-1">
            Configure the report template settings and sections
          </p>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter template name"
                  className="bg-slate-800/50 border-slate-700 text-slate-300"
                />
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter template description"
                  className="bg-slate-800/50 border-slate-700 text-slate-300"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-red-400">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Report Sections */}
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Report Sections</Label>
                {errors.sections && (
                  <p className="text-sm text-red-400 mt-1">{errors.sections}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_SECTIONS.map((section) => {
                  const sectionData = formData.sections.find(
                    (s) => s.id === section.id
                  );
                  const isEnabled = sectionData?.enabled || false;

                  return (
                    <div
                      key={section.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isEnabled
                          ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-300"
                          : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-800/50"
                      }`}
                      onClick={() => handleSectionToggle(section.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={isEnabled}
                          onChange={() => handleSectionToggle(section.id)}
                        />
                        <section.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {section.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Tables */}
            <div className="space-y-4 pb-6">
              <Label className="text-slate-300">Include Data Tables</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.dataTables.vehicle_usage}
                    onCheckedChange={() =>
                      handleDataTableToggle("vehicle_usage")
                    }
                  />
                  <Label className="text-sm text-slate-400">
                    DAILY_VEHICLE_USAGE_SUMMARY
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.dataTables.route_metrics}
                    onCheckedChange={() =>
                      handleDataTableToggle("route_metrics")
                    }
                  />
                  <Label className="text-sm text-slate-400">
                    DAILY_ROUTE_METRICS
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.dataTables.battery_health}
                    onCheckedChange={() =>
                      handleDataTableToggle("battery_health")
                    }
                  />
                  <Label className="text-sm text-slate-400">
                    BATTERY_HEALTH_TRACKER
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.dataTables.alert_logs}
                    onCheckedChange={() => handleDataTableToggle("alert_logs")}
                  />
                  <Label className="text-sm text-slate-400">ALERT_LOGS</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - fixed height */}
        <div className="p-6 border-t border-slate-700 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 bg-transparent"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Manager Component
export function TemplateManager({ onTemplateSelect }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const updateTemplates = () => {
      setTemplates(templateService.getAllTemplates());
    };

    updateTemplates();
    templateService.addListener(updateTemplates);

    return () => {
      templateService.removeListener(updateTemplates);
    };
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setEditorOpen(true);
  };

  const handleEditTemplate = (template) => {
    if (template.type === "custom") {
      setSelectedTemplate(template);
      setEditorOpen(true);
    } else {
      showNotification("System templates cannot be edited", "error");
    }
  };

  const handleDuplicateTemplate = (template) => {
    const duplicated = templateService.duplicateTemplate(template.id);
    if (duplicated) {
      showNotification(`Template duplicated: ${duplicated.name}`, "success");
    }
  };

  const handleDeleteTemplate = (template) => {
    if (templateService.deleteTemplate(template.id)) {
      showNotification("Template deleted successfully", "success");
    } else {
      showNotification("Cannot delete system templates", "error");
    }
  };

  const handleSaveTemplate = (templateData) => {
    try {
      if (selectedTemplate) {
        templateService.updateTemplate(selectedTemplate.id, templateData);
        showNotification("Template updated successfully", "success");
      } else {
        templateService.createTemplate(templateData);
        showNotification("Template created successfully", "success");
      }
    } catch (error) {
      showNotification("Failed to save template", "error");
    }
  };

  const getReportTypeIcon = (template) => {
    if (template.name.includes("Vehicle Usage")) return Users;
    if (template.name.includes("Route")) return Route;
    if (template.name.includes("Battery")) return Battery;
    if (template.name.includes("Alert")) return AlertTriangle;
    return BarChart3;
  };

  const filteredTemplates = templates.filter((template) => {
    if (filter === "all") return true;
    if (filter === "system") return template.type === "system";
    if (filter === "custom") return template.type === "custom";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert
          className={`${
            notification.type === "success"
              ? "border-green-500/50 bg-green-500/10"
              : notification.type === "error"
              ? "border-red-500/50 bg-red-500/10"
              : "border-blue-500/50 bg-blue-500/10"
          }`}
        >
          <AlertDescription
            className={`${
              notification.type === "success"
                ? "text-green-400"
                : notification.type === "error"
                ? "text-red-400"
                : "text-blue-400"
            }`}
          >
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Template Manager
          </h1>
          <p className="text-slate-400">
            Create and manage custom report templates
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              <SelectItem value="system">System Templates</SelectItem>
              <SelectItem value="custom">Custom Templates</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleCreateTemplate}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const IconComponent = getReportTypeIcon(template);
          return (
            <Card
              key={template.id}
              className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-100 text-lg">
                        {template.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={
                            template.type === "system"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          }
                        >
                          {template.type === "system" ? "System" : "Custom"}
                        </Badge>
                        {template.isDefault && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-slate-400 text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Template Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Sections:</span>
                      <span className="text-slate-300 ml-2">
                        {template.sections?.filter((s) => s.enabled).length ||
                          0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Usage:</span>
                      <span className="text-slate-300 ml-2">
                        {template.usageCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Created:</span>
                      <span className="text-slate-300 ml-2">
                        {template.createdAt}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Rating:</span>
                      <span className="text-slate-300 ml-2">
                        {template.rating > 0 ? `${template.rating}/5` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Enabled Sections Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">
                      Enabled Sections:
                    </h4>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {template.sections
                        ?.filter((s) => s.enabled)
                        ?.slice(0, 3)
                        ?.map((section, index) => (
                          <div
                            key={section.id}
                            className="flex items-center gap-2 text-xs text-slate-400"
                          >
                            <div className="w-3 h-3 rounded-full bg-cyan-500/30 text-cyan-400 text-xs flex items-center justify-center">
                              {index + 1}
                            </div>
                            <span>{section.name}</span>
                          </div>
                        ))}
                      {template.sections?.filter((s) => s.enabled).length >
                        3 && (
                        <div className="text-xs text-slate-500">
                          +
                          {template.sections.filter((s) => s.enabled).length -
                            3}{" "}
                          more...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-600 text-slate-300 bg-transparent"
                      onClick={() => handleEditTemplate(template)}
                      disabled={template.type === "system"}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {onTemplateSelect && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-slate-600 text-slate-300 bg-transparent"
                        onClick={() => onTemplateSelect(template)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 bg-transparent"
                      onClick={() => handleDuplicateTemplate(template)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {template.type === "custom" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 bg-transparent hover:border-red-500 hover:text-red-400"
                        onClick={() => handleDeleteTemplate(template)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No templates found
            </h3>
            <p className="text-slate-400 text-center mb-4">
              {filter === "custom"
                ? "You haven't created any custom templates yet."
                : "No templates match the current filter."}
            </p>
            {filter === "custom" && (
              <Button
                onClick={handleCreateTemplate}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Editor Modal */}
      <TemplateEditor
        template={selectedTemplate}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
