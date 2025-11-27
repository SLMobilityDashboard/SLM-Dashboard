export class DataAnalysisService {
  static PROGRESS_STAGES = {
    initializing: { percent: 5, status: "Initializing analysis..." },
    connecting: { percent: 15, status: "Connecting to Snowflake..." },
    counting_records: { percent: 20, status: "Counting records..." },
    fetching_data: { percent: 30, status: "Fetching data in batches..." },
    analyzing: { percent: 85, status: "Analyzing data..." },
    compiling: { percent: 95, status: "Compiling insights..." },
    completed: { percent: 100, status: "Analysis complete!" },
    failed: { percent: 0, status: "Analysis failed" },
  };

  constructor() {
    this.listeners = new Set();
    this.analysisHistory = [];
    this.currentAnalysisId = null;
    this.batchSize = 400; // Number of records to fetch per batch
  }

  async executeSnowflakeQuery(query, bindings = []) {
    try {
      // Build the final query - for production, implement proper parameter binding in your API
      let finalQuery = query;

      // Safe parameter replacement - escape single quotes and handle different types
      bindings.forEach((val) => {
        if (val === null || val === undefined) {
          finalQuery = finalQuery.replace("?", "NULL");
        } else if (typeof val === "string") {
          // Escape single quotes to prevent SQL injection
          const escapedVal = val.replace(/'/g, "''");
          finalQuery = finalQuery.replace("?", `'${escapedVal}'`);
        } else if (typeof val === "number") {
          finalQuery = finalQuery.replace("?", val.toString());
        } else {
          finalQuery = finalQuery.replace("?", `'${val.toString()}'`);
        }
      });

      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql: finalQuery }),
      });

      if (!response.ok) {
        throw new Error(`Snowflake query failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle different response formats
      if (result.data && result.data.rows) {
        return result.data.rows;
      } else if (Array.isArray(result)) {
        return result;
      } else if (result.rows) {
        return result.rows;
      } else {
        return result;
      }
    } catch (error) {
      console.error("Snowflake query error:", error);
      throw error;
    }
  }

  /**
   * Create or replace the VEHICLE_DAILY_DISTANCE table with underutilized vehicle data
   * @param {string} startDate - 'YYYY-MM-DD'
   * @param {string} endDate - 'YYYY-MM-DD'
   * @param {number} thresholdKm - Threshold in km/day
   */
  async generateUnderutilizedVehicleReport(startDate, endDate, thresholdKm) {
    const sql = `
      CREATE OR REPLACE TABLE REPORT_DB.GPS_DASHBOARD.VEHICLE_DAILY_DISTANCE AS
      WITH daily_aggregated AS (
          SELECT 
              TBOXID,
              BMSID,
              GPS_DATE,
              BATTERY_TYPE_ID,
              CAPACITY,
              BATTERY_NAME,
              COUNT(*) AS TOTAL_GPS_POINTS,
              COALESCE(SUM(DISTANCE_KM), 0) AS DISTANCE_KM
          FROM RAW_DB.GPS_DATA
          WHERE GPS_DATE BETWEEN ? AND ?
          GROUP BY 
              TBOXID,
              BMSID,
              GPS_DATE,
              BATTERY_TYPE_ID,
              CAPACITY,
              BATTERY_NAME
      ),
      vehicle_totals AS (
          SELECT 
              TBOXID,
              BMSID,
              BATTERY_TYPE_ID,
              CAPACITY,
              BATTERY_NAME,
              SUM(DISTANCE_KM) AS TOTAL_DISTANCE,
              COUNT(DISTINCT GPS_DATE) AS ACTIVE_DAYS,
              AVG(DISTANCE_KM) AS AVG_DAILY_DISTANCE
          FROM daily_aggregated
          GROUP BY 
              TBOXID,
              BMSID,
              BATTERY_TYPE_ID,
              CAPACITY,
              BATTERY_NAME
      )
      SELECT 
          d.TBOXID,
          d.BMSID,
          d.GPS_DATE,
          d.BATTERY_TYPE_ID,
          d.CAPACITY,
          d.BATTERY_NAME,
          d.TOTAL_GPS_POINTS,
          d.DISTANCE_KM,
          v.TOTAL_DISTANCE,
          v.ACTIVE_DAYS,
          v.AVG_DAILY_DISTANCE
      FROM daily_aggregated d
      JOIN vehicle_totals v 
          ON d.TBOXID = v.TBOXID
          AND d.BMSID = v.BMSID
      WHERE v.AVG_DAILY_DISTANCE < ?
      ORDER BY d.TBOXID, d.GPS_DATE;
    `;

    return this.executeSnowflakeQuery(sql, [startDate, endDate, thresholdKm]);
  }

  async analyzeData(
    config = {
      timeRangeStart: "2025-08-01",
      timeRangeEnd: "2025-08-10",
      utilizationThresholdKm: 10, // minimum km/day threshold
      includedTables: {
        vehicle_daily_distance: true,
        route_metrics: true,
        battery_health: true,
        alert_logs: true,
      },
      timeRange: "7d", // used inside insights generation
    },
    progressCallback
  ) {
    const analysisId = `analysis-${Date.now()}`;
    this.currentAnalysisId = analysisId;

    try {
      // Initialize analysis record
      const analysis = {
        id: analysisId,
        timestamp: new Date().toISOString(),
        config,
        status: "in-progress",
        insights: [],
        progress: this.createProgressUpdate("initializing"),
      };

      this.analysisHistory.unshift(analysis);
      this.notifyListeners();
      progressCallback?.(analysis.progress);

      // 1. Connect to Snowflake
      analysis.progress = this.createProgressUpdate("connecting");
      this.notifyListeners();
      progressCallback?.(analysis.progress);

      // Test connection to ensure Snowflake is available
      await this.executeSnowflakeQuery("SELECT CURRENT_VERSION()");

      // Optional: Generate the underutilized vehicle report table before analyzing
      if (
        config.timeRangeStart &&
        config.timeRangeEnd &&
        config.utilizationThresholdKm
      ) {
        analysis.progress = this.createProgressUpdate("connecting", {
          status: "Creating underutilized vehicle report...",
        });
        this.notifyListeners();
        progressCallback?.(analysis.progress);

        await this.generateUnderutilizedVehicleReport(
          config.timeRangeStart,
          config.timeRangeEnd,
          config.utilizationThresholdKm || 20
        );
      }

      // 2. Count records in each table
      analysis.progress = this.createProgressUpdate("counting_records");
      this.notifyListeners();
      progressCallback?.(analysis.progress);

      const tables = {};
      const activeTables = Object.keys(config.includedTables).filter(
        (table) => config.includedTables[table]
      );

      // Get record counts for each table
      for (const table of activeTables) {
        const countQuery = `SELECT COUNT(*) AS COUNT FROM REPORT_DB.GPS_DASHBOARD.${table.toUpperCase()}`;
        const result = await this.executeSnowflakeQuery(countQuery);

        const count =
          Array.isArray(result) && result.length > 0
            ? result[0].COUNT || result[0].count || 0
            : 0;

        tables[table] = {
          count: count,
          rows: [],
          batchesProcessed: 0,
          totalBatches: Math.ceil(count / this.batchSize),
        };
      }

      // 3. Fetch data in batches with progress updates
      analysis.progress = this.createProgressUpdate("fetching_data");
      this.notifyListeners();
      progressCallback?.(analysis.progress);

      const totalBatchesAllTables = activeTables.reduce(
        (sum, table) => sum + tables[table].totalBatches,
        0
      );

      let completedBatches = 0;

      for (const table of activeTables) {
        const tableData = tables[table];

        if (tableData.count <= this.batchSize) {
          const query = `SELECT * FROM REPORT_DB.GPS_DASHBOARD.${table.toUpperCase()} LIMIT ${
            this.batchSize
          }`;
          const result = await this.executeSnowflakeQuery(query);
          tableData.rows = Array.isArray(result) ? result : [];
          tableData.batchesProcessed = 1;
          completedBatches += 1;
        } else {
          for (let batch = 0; batch < tableData.totalBatches; batch++) {
            const offset = batch * this.batchSize;
            const query = `SELECT * FROM REPORT_DB.GPS_DASHBOARD.${table.toUpperCase()} LIMIT ${
              this.batchSize
            } OFFSET ${offset}`;
            const result = await this.executeSnowflakeQuery(query);

            if (Array.isArray(result)) {
              tableData.rows.push(...result);
            }

            tableData.batchesProcessed = batch + 1;
            completedBatches += 1;

            // Update progress based on batches completed
            const fetchProgress =
              30 + (50 * completedBatches) / totalBatchesAllTables;
            analysis.progress = {
              ...analysis.progress,
              percent: Math.min(fetchProgress, 80),
              status: `Fetching ${table} (batch ${batch + 1}/${
                tableData.totalBatches
              })`,
              currentTable: table,
              processedRows: tableData.rows.length,
              totalRows: tableData.count,
              details: `Processed ${completedBatches} of ${totalBatchesAllTables} total batches`,
            };
            this.notifyListeners();
            progressCallback?.(analysis.progress);
          }
        }
      }

      // 4. Analyze data
      analysis.progress = this.createProgressUpdate("analyzing");
      this.notifyListeners();
      progressCallback?.(analysis.progress);

      const insights = await this.generateInsights(
        tables,
        config.timeRange,
        config
      );

      // 5. Compile results
      analysis.progress = this.createProgressUpdate("compiling");
      this.notifyListeners();
      progressCallback?.(analysis.progress);

      analysis.insights = insights;
      analysis.status = "completed";
      analysis.progress = this.createProgressUpdate("completed");

      this.notifyListeners();
      progressCallback?.(analysis.progress);

      return analysis;
    } catch (error) {
      const failedAnalysis = this.analysisHistory.find(
        (a) => a.id === analysisId
      );
      if (failedAnalysis) {
        failedAnalysis.status = "failed";
        failedAnalysis.error = error.message;
        failedAnalysis.progress = this.createProgressUpdate("failed", {
          error: error.message,
        });
        this.notifyListeners();
        progressCallback?.(failedAnalysis.progress);
      }
      throw error;
    } finally {
      this.currentAnalysisId = null;
    }
  }

  createProgressUpdate(stage, additionalData = {}) {
    const stageInfo = DataAnalysisService.PROGRESS_STAGES[stage] || {};
    return {
      status: stageInfo.status || stage,
      percent: stageInfo.percent || 0,
      currentTable: null,
      processedRows: 0,
      totalRows: 0,
      ...additionalData,
    };
  }

  async generateInsights(tables, timeRange, config) {
    const insights = [];
    const days = this.getDaysFromRange(timeRange);

    // Vehicle Daily Distance Insights (replaces vehicle_usage)
    if (tables.vehicle_daily_distance) {
      const utilizationInsights = await this.analyzeVehicleUtilization(
        tables.vehicle_daily_distance.rows,
        days,
        config.utilizationThresholdKm || 20
      );
      insights.push(...utilizationInsights);
    }

    // Route Metrics Insights
    if (tables.route_metrics) {
      const routeInsights = await this.analyzeRouteMetrics(
        tables.route_metrics.rows,
        days
      );
      insights.push(...routeInsights);
    }

    // Battery Health Insights
    if (tables.battery_health) {
      const batteryInsights = await this.analyzeBatteryHealth(
        tables.battery_health.rows,
        days
      );
      insights.push(...batteryInsights);
    }

    // Alert Logs Insights
    if (tables.alert_logs) {
      const alertInsights = await this.analyzeAlertLogs(
        tables.alert_logs.rows,
        days
      );
      insights.push(...alertInsights);
    }

    return insights;
  }

  async analyzeVehicleUtilization(data, days, thresholdKmPerDay = 20) {
    const insights = [];
    if (!data || data.length === 0) return insights;

    // Calculate total threshold for the period
    const totalThreshold = thresholdKmPerDay * days;

    // Group data by TBOXID and sum DISTANCE_KM for the selected period
    const vehicleDistances = data.reduce((acc, record) => {
      const tboxId = record.TBOXID;
      const distance = parseFloat(record.DISTANCE_KM || 0);
      const gpsDate = record.GPS_DATE;

      if (!acc[tboxId]) {
        acc[tboxId] = {
          totalDistance: 0,
          recordCount: 0,
          tboxId: tboxId,
          bmsId: record.BMSID,
          batteryName: record.BATTERY_NAME,
          batteryType: record.BATTERY_TYPE_ID,
          capacity: record.CAPACITY,
          firstDate: gpsDate,
          lastDate: gpsDate,
          activeDays: new Set(),
          // Use pre-calculated values if available from the SQL
          totalDistanceFromSql: record.TOTAL_DISTANCE,
          activeDaysFromSql: record.ACTIVE_DAYS,
          avgDailyDistanceFromSql: record.AVG_DAILY_DISTANCE,
        };
      }

      acc[tboxId].totalDistance += distance;
      acc[tboxId].recordCount += 1;
      acc[tboxId].activeDays.add(gpsDate);

      // Track date range
      if (new Date(gpsDate) < new Date(acc[tboxId].firstDate)) {
        acc[tboxId].firstDate = gpsDate;
      }
      if (new Date(gpsDate) > new Date(acc[tboxId].lastDate)) {
        acc[tboxId].lastDate = gpsDate;
      }

      return acc;
    }, {});

    // Analyze utilization for each vehicle
    Object.values(vehicleDistances).forEach((vehicle) => {
      const {
        tboxId,
        totalDistance,
        bmsId,
        batteryName,
        activeDays,
        totalDistanceFromSql,
        avgDailyDistanceFromSql,
      } = vehicle;

      // Use SQL-calculated values if available, otherwise use our calculations
      const finalTotalDistance = totalDistanceFromSql || totalDistance;
      const actualActiveDays = activeDays.size;
      const avgDailyDistance =
        avgDailyDistanceFromSql ||
        finalTotalDistance / Math.max(actualActiveDays, 1);

      // Since the table is already filtered by underutilized vehicles,
      // we know these are underutilized - provide detailed insights
      const utilizationPercentage = (
        (finalTotalDistance / totalThreshold) *
        100
      ).toFixed(1);

      insights.push({
        type: "utilization",
        message: `Vehicle ${tboxId} (${
          batteryName || bmsId
        }) is underutilized (${finalTotalDistance.toFixed(
          1
        )}km in ${days} days, ${utilizationPercentage}% of expected ${totalThreshold}km)`,
        severity: finalTotalDistance < totalThreshold * 0.5 ? "high" : "medium",
        recommendation: `Review vehicle scheduling and routing. Expected minimum: ${totalThreshold}km (${thresholdKmPerDay}km/day), Actual: ${finalTotalDistance.toFixed(
          1
        )}km`,
        vehicleId: tboxId,
        metrics: {
          totalDistance: finalTotalDistance.toFixed(1),
          expectedDistance: totalThreshold,
          dailyThreshold: thresholdKmPerDay,
          utilizationRate: utilizationPercentage,
          avgDailyDistance: avgDailyDistance.toFixed(1),
          activeDays: actualActiveDays,
          timeframe: `${days} days`,
          bmsId: bmsId,
          batteryName: batteryName,
        },
      });

      // Check for vehicles with no activity (0 distance)
      if (finalTotalDistance === 0) {
        insights.push({
          type: "inactive",
          message: `Vehicle ${tboxId} (${
            batteryName || bmsId
          }) shows no activity (0km traveled in ${days} days)`,
          severity: "high",
          recommendation:
            "Investigate vehicle status - potential maintenance issue or inactive vehicle",
          vehicleId: tboxId,
          metrics: {
            totalDistance: 0,
            expectedDistance: totalThreshold,
            utilizationRate: 0,
            avgDailyDistance: 0,
            activeDays: 0,
            timeframe: `${days} days`,
            bmsId: bmsId,
            batteryName: batteryName,
          },
        });
      }

      // Check for vehicles with sporadic usage (active days much less than expected)
      if (actualActiveDays < days * 0.5 && finalTotalDistance > 0) {
        insights.push({
          type: "scheduling",
          message: `Vehicle ${tboxId} (${
            batteryName || bmsId
          }) has sporadic usage (active only ${actualActiveDays} out of ${days} days)`,
          severity: "medium",
          recommendation:
            "Review scheduling efficiency. Consider more consistent daily usage.",
          vehicleId: tboxId,
          metrics: {
            totalDistance: finalTotalDistance.toFixed(1),
            expectedDistance: totalThreshold,
            utilizationRate: utilizationPercentage,
            avgDailyDistance: avgDailyDistance.toFixed(1),
            activeDays: actualActiveDays,
            expectedActiveDays: days,
            usageConsistency: ((actualActiveDays / days) * 100).toFixed(1),
            timeframe: `${days} days`,
            bmsId: bmsId,
            batteryName: batteryName,
          },
        });
      }
    });

    return insights;
  }

  async analyzeRouteMetrics(data, days) {
    const insights = [];
    if (!data || data.length === 0) return insights;

    // 1. Long Duration Routes (>2h for <50km)
    const inefficientRoutes = data.filter(
      (r) => r.DURATION > 120 && r.DISTANCE < 50
    );

    for (const route of inefficientRoutes) {
      insights.push({
        type: "routing",
        message: `Route ${route.ROUTE_ID} is inefficient (${route.DURATION}min for ${route.DISTANCE}km)`,
        severity: "medium",
        recommendation:
          "Review route for traffic patterns or better alternatives",
        vehicleId: route.VEHICLE_ID || "N/A",
      });
    }

    // 2. High Distance Routes (>200km)
    const longRoutes = data.filter((r) => r.DISTANCE > 200);

    for (const route of longRoutes) {
      insights.push({
        type: "planning",
        message: `Route ${route.ROUTE_ID} is unusually long (${route.DISTANCE}km)`,
        severity: "low",
        recommendation:
          "Consider breaking into multiple routes or adding charging stops",
        vehicleId: route.VEHICLE_ID || "N/A",
      });
    }

    return insights;
  }

  async analyzeBatteryHealth(data, days) {
    const insights = [];
    if (!data || data.length === 0) return insights;

    // 1. Poor Battery Health (<80%)
    const poorBatteries = data.filter((b) => b.HEALTH_PERCENTAGE < 80);

    for (const battery of poorBatteries) {
      insights.push({
        type: "battery",
        message: `Vehicle ${battery.VEHICLE_ID} has degraded battery (${battery.HEALTH_PERCENTAGE}% health)`,
        severity: "high",
        recommendation: "Schedule battery diagnostic and possible replacement",
        vehicleId: battery.VEHICLE_ID,
      });
    }

    // 2. Long Time Since Last Charge (>3 days)
    const staleCharges = data.filter((b) => {
      const daysSinceCharge =
        (new Date() - new Date(b.LAST_CHARGE)) / (1000 * 60 * 60 * 24);
      return daysSinceCharge > 3;
    });

    for (const battery of staleCharges) {
      insights.push({
        type: "charging",
        message: `Vehicle ${battery.VEHICLE_ID} hasn't been charged in over 3 days`,
        severity: "medium",
        recommendation: "Verify charging schedule and equipment",
        vehicleId: battery.VEHICLE_ID,
      });
    }

    return insights;
  }

  async analyzeAlertLogs(data, days) {
    const insights = [];
    if (!data || data.length === 0) return insights;

    // 1. High Severity Alerts
    const highAlerts = data.filter((a) => a.SEVERITY === "high");

    for (const alert of highAlerts) {
      insights.push({
        type: "safety",
        message: `High priority alert for ${alert.VEHICLE_ID}: ${alert.MESSAGE}`,
        severity: "high",
        recommendation: "Immediate attention required",
        vehicleId: alert.VEHICLE_ID,
      });
    }

    // 2. Frequent Medium Alerts (more than 3 per vehicle)
    const vehicleAlertCounts = data.reduce((acc, alert) => {
      if (alert.SEVERITY === "medium") {
        acc[alert.VEHICLE_ID] = (acc[alert.VEHICLE_ID] || 0) + 1;
      }
      return acc;
    }, {});

    for (const [vehicleId, count] of Object.entries(vehicleAlertCounts)) {
      if (count > 3) {
        insights.push({
          type: "maintenance",
          message: `Vehicle ${vehicleId} has ${count} medium priority alerts`,
          severity: "medium",
          recommendation: "Schedule diagnostic check for recurring issues",
          vehicleId,
        });
      }
    }

    return insights;
  }

  getDaysFromRange(timeRange) {
    return (
      {
        "1d": 1,
        "7d": 7,
        "30d": 30,
        "90d": 90,
      }[timeRange] || 7
    );
  }

  notifyListeners() {
    const history = [...this.analysisHistory];
    this.listeners.forEach((listener) => listener(history));
  }

  addListener(listener) {
    this.listeners.add(listener);
    // Immediately notify new listener with current state
    listener([...this.analysisHistory]);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  getAllAnalyses() {
    return [...this.analysisHistory];
  }

  getCurrentAnalysis() {
    return this.analysisHistory.find((a) => a.id === this.currentAnalysisId);
  }
}

export default new DataAnalysisService();
