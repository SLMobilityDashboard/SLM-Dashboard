// CustomAnalysisService.js - Extension for DataAnalysisService
export class CustomAnalysisService {
  static loadCustomAnalyses() {
    const saved = localStorage.getItem("customAnalyses");
    return saved ? JSON.parse(saved) : [];
  }

  static saveCustomAnalysis(analysis) {
    const existing = this.loadCustomAnalyses();
    const updated =
      analysis.id && existing.find((a) => a.id === analysis.id)
        ? existing.map((a) => (a.id === analysis.id ? analysis : a))
        : [...existing, analysis];

    localStorage.setItem("customAnalyses", JSON.stringify(updated));
    return analysis;
  }

  static deleteCustomAnalysis(id) {
    const existing = this.loadCustomAnalyses();
    const updated = existing.filter((a) => a.id !== id);
    localStorage.setItem("customAnalyses", JSON.stringify(updated));
  }

  static async executeCustomAnalysis(customAnalysis, tableData) {
    const insights = [];

    if (
      !tableData ||
      !tableData[customAnalysis.table] ||
      !tableData[customAnalysis.table].rows
    ) {
      return insights;
    }

    const data = tableData[customAnalysis.table].rows;
    const filteredData = this.applyConditions(data, customAnalysis.conditions);

    // Generate insights for each matching row
    for (const row of filteredData) {
      const insight = this.generateInsightFromTemplate(row, customAnalysis);
      if (insight) {
        insights.push(insight);
      }
    }

    return insights;
  }

  static applyConditions(data, conditions) {
    if (!conditions || conditions.length === 0) return data;

    return data.filter((row) => {
      let result = true;
      let currentLogicalOperator = null;

      for (const condition of conditions) {
        const { column, operator, value, logicalOperator } = condition;
        const rowValue = row[column];

        let conditionResult = this.evaluateCondition(rowValue, operator, value);

        if (currentLogicalOperator === null) {
          result = conditionResult;
        } else if (currentLogicalOperator === "AND") {
          result = result && conditionResult;
        } else if (currentLogicalOperator === "OR") {
          result = result || conditionResult;
        }

        currentLogicalOperator = logicalOperator;
      }

      return result;
    });
  }

  static evaluateCondition(rowValue, operator, conditionValue) {
    // Convert values for comparison
    const numericRowValue = parseFloat(rowValue);
    const numericConditionValue = parseFloat(conditionValue);

    switch (operator) {
      case ">":
        return numericRowValue > numericConditionValue;
      case "<":
        return numericRowValue < numericConditionValue;
      case ">=":
        return numericRowValue >= numericConditionValue;
      case "<=":
        return numericRowValue <= numericConditionValue;
      case "=":
        return (
          String(rowValue).toLowerCase() ===
          String(conditionValue).toLowerCase()
        );
      case "!=":
        return (
          String(rowValue).toLowerCase() !==
          String(conditionValue).toLowerCase()
        );
      case "contains":
        return String(rowValue)
          .toLowerCase()
          .includes(String(conditionValue).toLowerCase());
      case "startswith":
        return String(rowValue)
          .toLowerCase()
          .startsWith(String(conditionValue).toLowerCase());
      case "endswith":
        return String(rowValue)
          .toLowerCase()
          .endsWith(String(conditionValue).toLowerCase());
      default:
        return false;
    }
  }

  static generateInsightFromTemplate(row, customAnalysis) {
    const { insightConfig } = customAnalysis;

    // Replace template variables with actual values
    let message = insightConfig.messageTemplate;
    let recommendation = insightConfig.recommendation;

    // Replace {COLUMN_NAME} with actual values
    for (const [key, value] of Object.entries(row)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, "g"), value);
      recommendation = recommendation.replace(
        new RegExp(placeholder, "g"),
        value
      );
    }

    return {
      type: insightConfig.type,
      message,
      severity: insightConfig.severity,
      recommendation,
      vehicleId: row.VEHICLE_ID || "N/A",
      customAnalysisId: customAnalysis.id,
      customAnalysisName: customAnalysis.name,
    };
  }
}

// Extended DataAnalysisService with custom analysis support
export class ExtendedDataAnalysisService extends DataAnalysisService {
  async generateInsights(tables, timeRange) {
    const insights = [];

    // Run original built-in insights
    const builtInInsights = await super.generateInsights(tables, timeRange);
    insights.push(...builtInInsights);

    // Run custom analyses
    const customAnalyses = CustomAnalysisService.loadCustomAnalyses();

    for (const customAnalysis of customAnalyses) {
      try {
        const customInsights =
          await CustomAnalysisService.executeCustomAnalysis(
            customAnalysis,
            tables
          );
        insights.push(...customInsights);
      } catch (error) {
        console.error(
          `Error executing custom analysis ${customAnalysis.name}:`,
          error
        );
        // Add error insight
        insights.push({
          type: "error",
          message: `Failed to execute custom analysis: ${customAnalysis.name}`,
          severity: "low",
          recommendation: "Check custom analysis configuration",
          vehicleId: "N/A",
          customAnalysisId: customAnalysis.id,
          error: error.message,
        });
      }
    }

    return insights;
  }

  // Method to test a custom analysis with current data
  async testCustomAnalysis(customAnalysis, config) {
    try {
      // Get sample data for the specified table
      const tables = {};
      const tableName = customAnalysis.table;

      // Fetch small sample for testing
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName.toUpperCase()}`;
      const countResult = await this.executeSnowflakeQuery(countQuery);
      const totalRows = countResult.data?.rows?.[0]?.COUNT || 0;

      // Get first 50 rows for testing
      const sampleQuery = `SELECT * FROM ${tableName.toUpperCase()} LIMIT 50`;
      const sampleResult = await this.executeSnowflakeQuery(sampleQuery);

      tables[tableName] = {
        count: totalRows,
        rows: sampleResult.data?.rows || [],
      };

      // Execute custom analysis
      const insights = await CustomAnalysisService.executeCustomAnalysis(
        customAnalysis,
        tables
      );

      return {
        success: true,
        insights,
        sampleSize: tables[tableName].rows.length,
        totalRows,
        matchingRows: insights.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        insights: [],
      };
    }
  }

  // Get insights grouped by custom analysis
  getInsightsByCustomAnalysis(insights) {
    const grouped = {};
    const builtIn = [];

    for (const insight of insights) {
      if (insight.customAnalysisId) {
        if (!grouped[insight.customAnalysisId]) {
          grouped[insight.customAnalysisId] = {
            analysisName: insight.customAnalysisName,
            insights: [],
          };
        }
        grouped[insight.customAnalysisId].insights.push(insight);
      } else {
        builtIn.push(insight);
      }
    }

    return {
      custom: grouped,
      builtIn,
    };
  }
}

// Usage example:
/*
// In your main component, replace DataAnalysisService with ExtendedDataAnalysisService

import { ExtendedDataAnalysisService } from './Services/ExtendedDataAnalysisService';

const extendedService = new ExtendedDataAnalysisService();

// Test a custom analysis
const testResult = await extendedService.testCustomAnalysis(customAnalysis, config);

// Run full analysis with custom insights included
const result = await extendedService.analyzeData(config, progressCallback);

// Group insights by type
const groupedInsights = extendedService.getInsightsByCustomAnalysis(result.insights);
*/
