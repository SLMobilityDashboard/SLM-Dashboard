type ColumnType = "integer" | "float" | "string" | "date";

interface ColumnMeta {
  type: ColumnType;
  synonyms: string[];
}

interface TableMeta {
  description: string;
  columns: Record<string, ColumnMeta>;
  synonyms: string[];
  fullName?: string; // prefixed name for SQL queries
}

interface Relationship {
  left_table: string;
  left_column: string;
  right_table: string;
  right_column: string;
  type: "many-to-one" | "one-to-many" | "one-to-one";
}

interface Measure {
  name: string;
  expression: string;
  description: string;
}

interface DefaultFilter {
  operator: string;
  value: string | string[]; // can be single or multiple
}

interface AccessControl {
  read: string[];
  write?: string[];
  columnConstraints?: Record<string, string[]>;
}

interface Catalog {
  tables: Record<string, TableMeta>;
  relationships: Relationship[];
  measures: Record<string, Measure>;
  default_filters: Record<string, Record<string, DefaultFilter>>;
  accessControl?: Record<string, AccessControl>;
}

export class SemanticBuilderUtils {
  // Enhanced schema prefixes to match your actual database structure
  private static readonly SCHEMA_PREFIX: Record<string, string> = {
    "FACT_EXPENSES": "ADHOC.EXPENSES",
    "DIM_BATTERY": "ADHOC.MASTER_DATA", 
    "DIM_BATTERY_TYPE": "ADHOC.MASTER_DATA",
    "DIM_CUSTOMERS": "ADHOC.MASTER_DATA",
    "DIM_DEALER": "ADHOC.MASTER_DATA",
    "DIM_SWAPPING_STATION": "ADHOC.MASTER_DATA",
    "DIM_TBOXES": "ADHOC.MASTER_DATA",
    "DIM_VEHICLE": "ADHOC.MASTER_DATA",
    "FACT_VEHICLE_OWNER": "ADHOC.MASTER_DATA",
    "LOOKUP_VIEW": "ADHOC.MASTER_DATA", // New lookup view for simplified joins
    "FACT_PAYMENT": "ADHOC.PAYMENTS",
    "FACT_TBOX_GPS": "ADHOC.VEHICLE_MOVEMENTS", 
    "FACT_VEHICLE_DISTANCE": "ADHOC.VEHICLE_MOVEMENTS",
    "FACT_TBOX_BMS_SESSION": "ADHOC.VEHICLE_MOVEMENTS",
    "FACT_VEHICLE_TELEMETRY": "ADHOC.VEHICLE_TELEMETRY"
  };

  static getOrganizationCatalog(): Catalog {
    const inferType = (col: string): ColumnType => {
      const lower = col.toLowerCase();
      if (lower.includes("id") || lower.includes("count") || lower.includes("tries") || lower.includes("flag") || lower.includes("status") || lower.includes("active") || lower.includes("deleted") || lower.includes("mode") || lower.includes("points")) return "integer";
      if (lower.includes("date") || lower.includes("time") || lower.includes("ctime") || lower.includes("created_at") || lower.includes("updated_at") || lower.includes("deleted_at") || lower.includes("paid_at") || lower.includes("epoch")) return "date";
      if (lower.includes("amount") || lower.includes("bill") || lower.includes("rent") || lower.includes("cost") || lower.includes("distance") || lower.includes("capacity") || lower.includes("volt") || lower.includes("temp") || lower.includes("rpm") || lower.includes("soh") || lower.includes("percent") || lower.includes("current") || lower.includes("lat") || lower.includes("long") || lower.includes("balance") || lower.includes("units")) return "float";
      return "string";
    };

    const columnSynonyms: Record<string, string[]> = {
      // Payment & Financial
      amount: ["cost", "expense", "charge", "payment", "bill", "price"],
      electricity_bill: ["electricity_cost", "power_bill", "electricity_expense"],
      station_rent: ["rent_cost", "station_cost", "rental_expense"],
      maintanance_cost: ["maintenance_expense", "upkeep_cost", "repair_cost"],
      refund_amount: ["refund", "returned_amount", "reimbursement"],
      wallet_balance: ["balance", "wallet_bal", "available_balance"],
      charge_amount: ["charging_cost", "charge_fee"],
      
      // Vehicle & Distance
      distance_km: ["distance", "km", "mileage", "travelled_distance", "kilometers"],
      chassis_number: ["vin", "frame_number", "vehicle_identification", "vehicle_vin"],
      license_plate: ["registration", "plate_number", "reg_no"],
      motor_rpm: ["rpm", "motor_speed", "rotation_speed"],
      
      // Battery & Telemetry
      bat_soh: ["battery_health", "state_of_health", "soh", "battery_condition"],
      bat_volt: ["battery_voltage", "voltage", "battery_volts"],
      bat_temp: ["battery_temperature", "temperature", "bat_temperature"],
      bat_cycle_count: ["charge_cycles", "cycle_count", "battery_cycles"],
      bat_percent: ["battery_percentage", "charge_level", "battery_level"],
      bat_current: ["battery_current", "current", "amperage"],
      
      // Location & GPS
      location: ["location_name", "place", "area"],
      longitude: ["long", "lng", "lon"],
      latitude: ["lat", "latitude_coord"],
      
      // Identifiers
      bms_id: ["battery_id", "battery_management_system_id"],
      customer_id: ["client_id", "user_id", "customer_number"],
      vehicle_id: ["car_id", "auto_id", "vehicle_number"],
      tbox_id: ["device_id", "tracker_id", "tboxid", "telemetry_id"],
      tbox_imei_no: ["imei", "device_imei", "tbox_imei", "imei_number"],
      station_id: ["swap_station_id", "bss_id", "swapping_station_id"],
      station_name: ["stationname", "swap_station", "station"],
      payment_id: ["transaction_id", "payment_reference"],
      dealer_id: ["partner_id", "vendor_id", "dealer_number"],
      
      // Time & Sessions
      ctime: ["timestamp", "recorded_time", "capture_time"],
      session_id: ["trip_id", "journey_id", "session_number"],
      session_start_time: ["start_time", "trip_start"],
      session_end_time: ["end_time", "trip_end"],
      
      // Status & Flags
      payment_status: ["status", "transaction_status", "payment_state"],
      active: ["status", "enabled", "operational"],
      deleted: ["removed", "inactive", "archived"],
      maintenance_mode: ["under_maintenance", "maintenance_status"]
    };

    const tableSynonyms: Record<string, string[]> = {
      FACT_EXPENSES: ["DATE", "LOCATION", "STATIONNAME", "ELECTRICITY_CONSUMED_IN_UNITS", "ELECTRICITY_BILL", "STATION_RENT", "MAINTENANCE_COST"],
      DIM_BATTERY: ["battery_master", "battery_data", "batteries", "battery_info"],
      DIM_BATTERY_TYPE: ["battery_types", "battery_specifications", "battery_models"],
      DIM_CUSTOMERS: ["customers", "customer_master", "clients", "users", "customer_data"],
      DIM_DEALER: ["dealers", "dealer_master", "vendors", "partners"],
      DIM_SWAPPING_STATION: ["stations", "swap_stations", "bss", "battery_stations", "swapping_points"],
      DIM_TBOXES: ["tbox_master", "telemetry_devices", "trackers", "tbox_data"],
      DIM_VEHICLE: ["vehicles", "vehicle_master", "fleet", "vehicle_data"],
      FACT_VEHICLE_OWNER: ["vehicle_ownership", "customer_vehicles", "ownership_mapping"],
      LOOKUP_VIEW: ["master_lookup", "entity_lookup", "relationship_view", "dimension_bridge"],
      FACT_PAYMENT: ["payments", "transactions", "billing", "payment_data"],
      FACT_TBOX_GPS: ["gps_data", "location_tracking", "vehicle_gps", "gps_telemetry"],
      FACT_VEHICLE_DISTANCE: ["vehicle_distance", "trip_data", "journey_logs", "distance_data"],
      FACT_TBOX_BMS_SESSION: ["vehicle_sessions", "trip_sessions", "telemetry_sessions"],
      FACT_VEHICLE_TELEMETRY: ["telemetry", "vehicle_data", "sensor_data", "telemetry_readings"]
    };

    const tables: Record<string, TableMeta> = {};
    
    // Enhanced table definitions including the new LOOKUP_VIEW
    const tableDefs = [
      { 
        name: "FACT_EXPENSES", 
        description: "Station-level expenses including electricity, rent, and maintenance costs by date and location", 
        columns: ["DATE", "LOCATION", "STATIONNAME", "ELECTRICITY_CONSUMED_IN_UNITS", "ELECTRICITY_BILL", "STATION_RENT", "MAINTANANCE_COST"] 
      },
      { 
        name: "DIM_BATTERY", 
        description: "Battery master data with specifications, charge cycles, materials, and operational status", 
        columns: ["BATTERY_ID", "VENDOR_ID", "SERIAL_NO", "BMS_ID", "LOCATION", "LOCATION_REF", "MATERIAL", "CHARGE_CYCLE", "BATTERY_TYPE_ID", "MANUFACTURE_DATE", "ACTIVE", "DELETED", "CREATED_AT", "UPDATED_AT", "DELETED_AT", "APPROVED_STATUS", "APPROVED_BY"] 
      },
      { 
        name: "DIM_BATTERY_TYPE", 
        description: "Battery type definitions including capacity, visual properties, and status", 
        columns: ["BATTERY_TYPE_ID", "NAME", "CAPACITY", "BGCOLOR", "TEXTCOLOR", "ACTIVE", "DELETED", "CREATED_AT", "UPDATED_AT", "DELETED_AT"] 
      },
      { 
        name: "DIM_CUSTOMERS", 
        description: "Customer master data including identity, contact information, and demographics", 
        columns: ["CUSTOMER_ID", "MOBILE", "NIC", "SURNAME", "OTHER_NAMES","FULLNAME", "EMAIL", "ADDRESS", "ALT_PHONE", "CITY_ID", "ACTIVE", "DELETED", "CREATED_AT", "UPDATED_AT", "DELETED_AT", "DIVISIONAL_SECRETARIAT", "CUSTOMER_TYPE"] 
      },
      { 
        name: "DIM_DEALER", 
        description: "Vehicle dealer information including contact details, authorization status, and operational regions", 
        columns: ["DEALER_ID", "DEALER_SHOP_NAME", "DEALER_CODE", "DEALER_BR_NUMBER", "DEALER_ADDRESS", "DEALER_MOBILE_NUMBER", "DEALER_EMAIL", "ACTIVE", "DELETED", "CREATED_AT", "DELETED_AT", "UPDATED_AT", "STATION_ID", "NIC", "DEALER_NAME", "PERSONAL_ADDRESS", "LOC_STATE", "LOC_AREA", "LONGITUDE", "LATITUDE"] 
      },
      { 
        name: "DIM_SWAPPING_STATION", 
        description: "Battery swapping station master data including location, operational status, and maintenance information", 
        columns: ["STATION_ID", "VENDOR_ID", "STATION_MODEL", "SERIAL_NO", "NAME", "LOCATION_ID", "RATING_GROUP_ID", "HA_INTERVAL", "STATUS_INTERVAL", "CERT", "CERT_TAG", "OPERATOR_PW", "OPERATOR_PW_TAG", "INIT_COMPLETED", "CONFIG_DOWNLOADED", "MAINTENANCE_MODE", "ACTIVE", "DELETED", "CREATED_AT", "UPDATED_AT", "DELETED_AT", "APPROVED_STATUS", "APPROVED_BY", "BSS_PLANTED_DATE_ELEC_UNIT_COUNT", "BSS_PLANTED_DATE", "BSS_PLANTED_PLACE_MOBILE_NUMBER"] 
      },
      { 
        name: "DIM_TBOXES", 
        description: "Telemetry unit (TBOX) hardware master data including serial numbers and configuration", 
        columns: ["TBOX_ID", "TBOX_SERIAL_NO", "TBOX_IMEI_NO", "OPERATOR_PW", "OPERATOR_PW_TAG", "CERT", "CERT_TAG", "INIT_COMPLETED", "CONFIG_DOWNLOADED", "INTERNAL_NO", "SIM_MOBILE_NO", "SIM_IMEI_NO", "CREATED_AT"] 
      },
      { 
        name: "DIM_VEHICLE", 
        description: "Vehicle master data including registration, model specifications, and associated components", 
        columns: ["VEHICLE_ID", "VENDOR_ID", "VEHICLE_TYPE_ID", "VEHICLE_MODEL_ID", "VEHICLE_MODEL_COLOR_ID", "BATCH_NO", "CHASSIS_NUMBER", "LICENSE_PLATE", "ACTIVE", "DELETED", "CREATED_AT", "UPDATED_AT", "DELETED_AT", "MOTOR_NUMBER", "TBOX_ID", "BATTERY_TYPE_ID", "APPROVED_STATUS", "APPROVED_BY"] 
      },
      { 
        name: "FACT_VEHICLE_OWNER", 
        description: "Vehicle ownership mapping between customers and vehicles", 
        columns: ["VEHICLE_ID", "CUSTOMER_ID", "BATTERY_TYPE_ID"] 
      },
      {
        name: "LOOKUP_VIEW",
        description: "Centralized lookup view for simplified joins across normalized dimension tables, enabling direct navigation to relevant entities via unique IDs",
        columns: ["TBOX_ID", "TBOX_IMEI_NO", "VEHICLE_ID", "CHASSIS_NUMBER", "BATTERY_TYPE_ID", "CUSTOMER_ID", "DEALER_ID"]
      },
      { 
        name: "FACT_PAYMENT", 
        description: "All payment transactions including swaps, charging, refunds, and subscriptions with detailed financial information", 
        columns: ["PAYMENT_ID", "PAYMENT_METHOD_ID", "CUSTOMER_ID", "RATING_ID", "PAYMENT_METHOD", "PAYMENT_STATUS", "AMOUNT", "CURRENCY", "TRANSACTION_ID", "LOCATION_NAME", "STATION_NAME", "PAID_AT", "CREATED_AT", "AMOUNT_PAID", "CHARGE_AMOUNT", "CHARGE_PERCENTAGE", "REFUND_AMOUNT", "REFUND_PERCENTAGE", "PAYMENT_TRIES", "PREVIOUS_WALLET_BAL", "WALLET_BALANCE", "WALLET_MIN_BAL", "WALLET_CODE", "PAYMENT_METHOD_TYPE", "PAYMENT_TYPE", "REASON", "AGREEMENT", "EVENT_CODE", "EVENT_MSG", "CREATED_EPOCH", "DETAILS_JSON"] 
      },
      { 
        name: "FACT_TBOX_GPS", 
        description: "Raw GPS telemetry data captured at 30-second intervals for vehicle location tracking", 
        columns: ["LONGDIR", "LONG", "LAT", "CTIME", "LATDIR", "TBOX_IMEI_NO"] 
      },
      { 
        name: "FACT_VEHICLE_DISTANCE", 
        description: "Daily session-level distance and telemetry data per vehicle with battery and session tracking", 
        columns: ["SESSION_ID", "TBOX_IMEI_NO", "BMSID", "GPS_DATE", "SESSION_START_TIME", "SESSION_END_TIME", "DISTANCE_KM", "TOTAL_GPS_POINTS", "BATTERY_TYPE_ID", "BATTERY_NAME", "CAPACITY"] 
      },
      { 
        name: "FACT_TBOX_BMS_SESSION", 
        description: "Session mapping between vehicles, TBOX devices, and battery management systems", 
        columns: ["SESSION_ID", "TBOX_IMEI_NO", "BMSID", "START_TIME", "END_TIME"] 
      },
      { 
        name: "FACT_VEHICLE_TELEMETRY", 
        description: "Processed vehicle telemetry including battery metrics, motor parameters, and error diagnostics", 
        columns: ["TELEMETRY_ID", "SESSION_ID", "TBOX_IMEI_NO", "BMSID", "GEAR_INFORMATION", "TIME_STAMP", "SIDE_STAND_INFO", "TBOX_MEMS_ERROR_FLAG", "BATTERY_ERROR", "BRAKE_STATUS", "INVERTER_ERROR", "BAT_TEMP", "BAT_VOLT", "BAT_CYCLE_COUNT", "BAT_SOH", "BAT_PERCENT", "THROTTLE_PERCENT", "BAT_CURRENT", "MOTOR_RPM", "MOTOR_TEMP", "INVERTER_TEMP", "TBOX_INTERNAL_BAT_VOLT", "STATE"] 
      }
    ];

    tableDefs.forEach(t => {
      const colMap: Record<string, ColumnMeta> = {};
      t.columns.forEach(c => {
        colMap[c] = {
          type: inferType(c),
          synonyms: columnSynonyms[c.toLowerCase()] || []
        };
      });
      
      const schemaPrefix = this.SCHEMA_PREFIX[t.name];
      tables[t.name] = {
        fullName: `${schemaPrefix}.${t.name}`,
        description: t.description,
        columns: colMap,
        synonyms: tableSynonyms[t.name] || [],
      };
    });

    // Enhanced relationships including LOOKUP_VIEW connections
    const relationships: Relationship[] = [
      // LOOKUP_VIEW relationships - Hub for simplified joins
      { left_table: "LOOKUP_VIEW", left_column: "TBOX_ID", right_table: "DIM_TBOXES", right_column: "TBOX_ID", type: "one-to-one" },
      { left_table: "LOOKUP_VIEW", left_column: "VEHICLE_ID", right_table: "DIM_VEHICLE", right_column: "VEHICLE_ID", type: "one-to-one" },
      { left_table: "LOOKUP_VIEW", left_column: "BATTERY_TYPE_ID", right_table: "DIM_BATTERY_TYPE", right_column: "BATTERY_TYPE_ID", type: "many-to-one" },
      { left_table: "LOOKUP_VIEW", left_column: "CUSTOMER_ID", right_table: "DIM_CUSTOMERS", right_column: "CUSTOMER_ID", type: "many-to-one" },
      { left_table: "LOOKUP_VIEW", left_column: "DEALER_ID", right_table: "DIM_DEALER", right_column: "DEALER_ID", type: "many-to-one" },
      { left_table: "LOOKUP_VIEW", left_column: "TBOX_IMEI_NO", right_table: "DIM_TBOXES", right_column: "TBOX_IMEI_NO", type: "many-to-one" },

      // Vehicle ownership relationships
      { left_table: "FACT_VEHICLE_OWNER", left_column: "VEHICLE_ID", right_table: "DIM_VEHICLE", right_column: "VEHICLE_ID", type: "many-to-one" },
      { left_table: "FACT_VEHICLE_OWNER", left_column: "CUSTOMER_ID", right_table: "DIM_CUSTOMERS", right_column: "CUSTOMER_ID", type: "many-to-one" },
      { left_table: "FACT_VEHICLE_OWNER", left_column: "BATTERY_TYPE_ID", right_table: "DIM_BATTERY_TYPE", right_column: "BATTERY_TYPE_ID", type: "many-to-one" },
      
      // Vehicle to components relationships
      { left_table: "DIM_VEHICLE", left_column: "TBOX_ID", right_table: "DIM_TBOXES", right_column: "TBOX_ID", type: "many-to-one" },
      { left_table: "DIM_VEHICLE", left_column: "BATTERY_TYPE_ID", right_table: "DIM_BATTERY_TYPE", right_column: "BATTERY_TYPE_ID", type: "many-to-one" },
      
      // Battery relationships
      { left_table: "DIM_BATTERY", left_column: "BATTERY_TYPE_ID", right_table: "DIM_BATTERY_TYPE", right_column: "BATTERY_TYPE_ID", type: "many-to-one" },
      
      // Station relationships
      { left_table: "DIM_DEALER", left_column: "STATION_ID", right_table: "DIM_SWAPPING_STATION", right_column: "STATION_ID", type: "many-to-one" },
      
      // Payment relationships
      { left_table: "FACT_PAYMENT", left_column: "CUSTOMER_ID", right_table: "DIM_CUSTOMERS", right_column: "CUSTOMER_ID", type: "many-to-one" },
      { left_table: "FACT_PAYMENT", left_column: "STATION_NAME", right_table: "DIM_SWAPPING_STATION", right_column: "NAME", type: "many-to-one" },
      
      // Telemetry relationships - can now use LOOKUP_VIEW for simplified joins
      { left_table: "FACT_TBOX_GPS", left_column: "TBOX_IMEI_NO", right_table: "DIM_TBOXES", right_column: "TBOX_IMEI_NO", type: "many-to-one" },
      { left_table: "FACT_TBOX_GPS", left_column: "TBOX_IMEI_NO", right_table: "LOOKUP_VIEW", right_column: "TBOX_IMEI_NO", type: "many-to-one" },
      
      // BMS Session relationships
      { left_table: "FACT_TBOX_BMS_SESSION", left_column: "TBOX_IMEI_NO", right_table: "DIM_TBOXES", right_column: "TBOX_IMEI_NO", type: "many-to-one" },
      { left_table: "FACT_TBOX_BMS_SESSION", left_column: "TBOX_IMEI_NO", right_table: "LOOKUP_VIEW", right_column: "TBOX_IMEI_NO", type: "many-to-one" },
      { left_table: "FACT_TBOX_BMS_SESSION", left_column: "BMSID", right_table: "DIM_BATTERY", right_column: "BMS_ID", type: "many-to-one" },
      
      // Session relationships
      { left_table: "FACT_VEHICLE_DISTANCE", left_column: "SESSION_ID", right_table: "FACT_TBOX_BMS_SESSION", right_column: "SESSION_ID", type: "one-to-one" },
      { left_table: "FACT_VEHICLE_DISTANCE", left_column: "TBOX_IMEI_NO", right_table: "DIM_TBOXES", right_column: "TBOX_IMEI_NO", type: "many-to-one" },
      { left_table: "FACT_VEHICLE_DISTANCE", left_column: "TBOX_IMEI_NO", right_table: "LOOKUP_VIEW", right_column: "TBOX_IMEI_NO", type: "many-to-one" },
      { left_table: "FACT_VEHICLE_DISTANCE", left_column: "BMSID", right_table: "DIM_BATTERY", right_column: "BMS_ID", type: "many-to-one" },
      
      // Telemetry relationships
      { left_table: "FACT_VEHICLE_TELEMETRY", left_column: "SESSION_ID", right_table: "FACT_TBOX_BMS_SESSION", right_column: "SESSION_ID", type: "many-to-one" },
      { left_table: "FACT_VEHICLE_TELEMETRY", left_column: "TBOX_IMEI_NO", right_table: "DIM_TBOXES", right_column: "TBOX_IMEI_NO", type: "many-to-one" },
      { left_table: "FACT_VEHICLE_TELEMETRY", left_column: "TBOX_IMEI_NO", right_table: "LOOKUP_VIEW", right_column: "TBOX_IMEI_NO", type: "many-to-one" },     
      { left_table: "FACT_VEHICLE_TELEMETRY", left_column: "BMSID", right_table: "DIM_BATTERY", right_column: "BMS_ID", type: "many-to-one" }
    ];

    // Enhanced measures for battery swapping business with LOOKUP_VIEW optimizations
    const measures: Record<string, Measure> = {
      TOTAL_SWAPS: { 
        name: "TOTAL_SWAPS", 
        expression: "COUNT(DISTINCT PAYMENT_ID)", 
        description: "Total number of battery swaps performed" 
      },
      TOTAL_REVENUE: { 
        name: "TOTAL_REVENUE", 
        expression: "SUM(AMOUNT)", 
        description: "Net revenue from all transactions after refunds" 
      },
      TOTAL_EXPENSES: { 
        name: "TOTAL_EXPENSES", 
        expression: "SUM(ELECTRICITY_BILL + STATION_RENT + MAINTANANCE_COST)", 
        description: "Sum of all station operational expenses" 
      },
      NET_PROFIT: { 
        name: "NET_PROFIT", 
        expression: "SUM(AMOUNT) - SUM(ELECTRICITY_BILL + STATION_RENT + MAINTANANCE_COST)", 
        description: "Net profit after expenses" 
      },
      TOTAL_DISTANCE: { 
        name: "TOTAL_DISTANCE", 
        expression: "SUM(DISTANCE_KM)", 
        description: "Total distance travelled by all vehicles" 
      },
      AVERAGE_BATTERY_HEALTH: { 
        name: "AVERAGE_BATTERY_HEALTH", 
        expression: "AVG(BAT_SOH)", 
        description: "Average battery state of health across fleet" 
      },
      ELECTRICITY_EFFICIENCY: { 
        name: "ELECTRICITY_EFFICIENCY", 
        expression: "SUM(DISTANCE_KM) / SUM(ELECTRICITY_CONSUMED_IN_UNITS)", 
        description: "Distance traveled per unit of electricity consumed" 
      },
      ACTIVE_VEHICLE_COUNT: {
        name: "ACTIVE_VEHICLE_COUNT",
        expression: "COUNT(DISTINCT VEHICLE_ID)",
        description: "Count of unique active vehicles using LOOKUP_VIEW for simplified joins"
      },
      CUSTOMER_UTILIZATION: {
        name: "CUSTOMER_UTILIZATION",
        expression: "COUNT(DISTINCT SESSION_ID) / COUNT(DISTINCT CUSTOMER_ID)",
        description: "Average sessions per customer"
      }
    };

    // Updated default filters
    const default_filters: Record<string, Record<string, DefaultFilter>> = {
      FACT_PAYMENT: {
        PAYMENT_STATUS: { operator: "IN", value: ["PAID", "VOIDED"] }
      },
      FACT_EXPENSES: { 
        DATE: { operator: ">=", value: "2024-01-01" } 
      },
      DIM_CUSTOMERS: {
        ACTIVE: { operator: "=", value: "1" },
        DELETED: { operator: "=", value: "0" }
      },
      DIM_VEHICLE: {
        ACTIVE: { operator: "=", value: "1" },
        DELETED: { operator: "=", value: "0" }
      },
      DIM_BATTERY: {
        ACTIVE: { operator: "=", value: "1" },
        DELETED: { operator: "=", value: "0" }
      },
      DIM_SWAPPING_STATION: {
        ACTIVE: { operator: "=", value: "1" },
        DELETED: { operator: "=", value: "0" }
      }
      // No filters for LOOKUP_VIEW as it's a bridge table
    };

    const accessControl: Record<string, AccessControl> = {};
    Object.keys(tables).forEach(t => {
      accessControl[t] = { 
        read: ["analyst", "admin", "operator"], 
        write: t === "LOOKUP_VIEW" ? [] : ["admin"], // LOOKUP_VIEW is read-only
        columnConstraints: {
          // Sensitive columns restricted to admin only
          "OPERATOR_PW": ["admin"],
          "CERT": ["admin"],
          "NIC": ["admin"],
          "EMAIL": ["admin", "analyst"]
        }
      };
    });

    return { tables, relationships, measures, default_filters, accessControl };
  }

  static getFilteredCatalog(selectedTables: string[]): Catalog {
    const fullCatalog = this.getOrganizationCatalog();

    const filteredTables: Record<string, TableMeta> = {};
    
    selectedTables.forEach(tableName => {
      if (fullCatalog.tables[tableName]) {
        filteredTables[tableName] = fullCatalog.tables[tableName];
      } else {
        console.warn(`Table not found in catalog: ${tableName}. Available tables:`, Object.keys(fullCatalog.tables));
      }
    });

    const filteredRelationships = fullCatalog.relationships.filter(
      rel => selectedTables.includes(rel.left_table) && selectedTables.includes(rel.right_table)
    );

    const filteredMeasures = fullCatalog.measures;

    const filteredDefaultFilters: Record<string, Record<string, DefaultFilter>> = {};
    selectedTables.forEach(tableName => {
      if (fullCatalog.default_filters[tableName]) {
        filteredDefaultFilters[tableName] = fullCatalog.default_filters[tableName];
      }
    });

    const filteredAccessControl: Record<string, AccessControl> = {};
    selectedTables.forEach(tableName => {
      if (fullCatalog.accessControl?.[tableName]) {
        filteredAccessControl[tableName] = fullCatalog.accessControl[tableName];
      }
    });

    return {
      tables: filteredTables,
      relationships: filteredRelationships,
      measures: filteredMeasures,
      default_filters: filteredDefaultFilters,
      accessControl: filteredAccessControl
    };
  }

  // Enhanced helper method to debug schema mappings
  static debugSchemaMappings(): void {
    console.log("Available schema mappings:");
    Object.entries(this.SCHEMA_PREFIX).forEach(([table, schema]) => {
      console.log(`${table} -> ${schema}.${table}`);
    });
  }

  // Helper method to validate table names
  static validateTableNames(tableNames: string[]): { valid: string[], invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    tableNames.forEach(tableName => {
      if (this.SCHEMA_PREFIX[tableName]) {
        valid.push(tableName);
      } else {
        invalid.push(tableName);
      }
    });
    
    return { valid, invalid };
  }

  // Enhanced business-specific query suggestions leveraging LOOKUP_VIEW
  static getBusinessQuerySuggestions(): string[] {
    return [
      "What is the total revenue by station this month?",
      "Show me the average battery health by battery type",
      "Which customers have the highest vehicle utilization?",
      "What are the maintenance costs by location?",
      "Show me payment transaction success rates",
      "What is the electricity consumption efficiency by station?",
      "Which vehicles have traveled the most distance?",
      "Show me battery swap frequency by customer",
      "What is the net profit by location?",
      "Which stations have the highest operational costs?",
      "Show customer journey from vehicle purchase to usage patterns",
      "Which dealers are performing best by region?",
      "What is the battery degradation rate by usage patterns?",
      "Show telemetry anomalies and error patterns by vehicle type"
    ];
  }

  // Helper to get table relationships for a specific table
  static getTableRelationships(tableName: string): Relationship[] {
    const catalog = this.getOrganizationCatalog();
    return catalog.relationships.filter(
      rel => rel.left_table === tableName || rel.right_table === tableName
    );
  }

  // New helper method to get optimal join path using LOOKUP_VIEW
  static getOptimalJoinPath(startTable: string, targetTables: string[]): string[] {
    const relationships = this.getOrganizationCatalog().relationships;
    
    // Check if LOOKUP_VIEW can simplify the join path
    const lookupConnections = relationships.filter(rel => 
      rel.left_table === "LOOKUP_VIEW" || rel.right_table === "LOOKUP_VIEW"
    );
    
    // If start table connects to LOOKUP_VIEW and target tables can be reached via LOOKUP_VIEW
    const canUseLookupView = lookupConnections.some(rel => 
      (rel.left_table === startTable || rel.right_table === startTable) ||
      targetTables.some(target => rel.left_table === target || rel.right_table === target)
    );
    
    if (canUseLookupView && !targetTables.includes("LOOKUP_VIEW")) {
      return ["LOOKUP_VIEW", ...targetTables];
    }
    
    return targetTables;
  }

  // Helper method to suggest dimension tables for fact table queries
  static suggestDimensionsForFact(factTable: string): string[] {
    const relationships = this.getOrganizationCatalog().relationships;
    const suggestedDims = new Set<string>();
    
    // Find all dimension tables connected to this fact table
    relationships.forEach(rel => {
      if (rel.left_table === factTable && rel.right_table.startsWith("DIM_")) {
        suggestedDims.add(rel.right_table);
      }
      if (rel.right_table === factTable && rel.left_table.startsWith("DIM_")) {
        suggestedDims.add(rel.left_table);
      }
    });
    
    // Always suggest LOOKUP_VIEW for fact tables that connect to telemetry
    if (["FACT_VEHICLE_TELEMETRY", "FACT_TBOX_GPS", "FACT_VEHICLE_DISTANCE", "FACT_TBOX_BMS_SESSION"].includes(factTable)) {
      suggestedDims.add("LOOKUP_VIEW");
    }
    
    return Array.from(suggestedDims).sort();
  }

  // Helper method to identify key business metrics for a table combination
  static getRelevantMetrics(tables: string[]): string[] {
    const measures = this.getOrganizationCatalog().measures;
    const relevantMetrics: string[] = [];
    
    if (tables.includes("FACT_PAYMENT")) {
      relevantMetrics.push("TOTAL_REVENUE", "TOTAL_SWAPS");
    }
    if (tables.includes("FACT_EXPENSES")) {
      relevantMetrics.push("TOTAL_EXPENSES", "NET_PROFIT", "ELECTRICITY_EFFICIENCY");
    }
    if (tables.includes("FACT_VEHICLE_DISTANCE")) {
      relevantMetrics.push("TOTAL_DISTANCE");
    }
    if (tables.includes("FACT_VEHICLE_TELEMETRY") || tables.includes("DIM_BATTERY")) {
      relevantMetrics.push("AVERAGE_BATTERY_HEALTH");
    }
    if (tables.includes("LOOKUP_VIEW")) {
      relevantMetrics.push("ACTIVE_VEHICLE_COUNT", "CUSTOMER_UTILIZATION");
    }
    
    return relevantMetrics;
  }

  // Method to validate and suggest table combinations
  static validateTableCombination(tables: string[]): {
    valid: boolean;
    suggestions: string[];
    warnings: string[];
    optimizedPath: string[];
  } {
    const { valid: validTables, invalid: invalidTables } = this.validateTableNames(tables);
    const relationships = this.getOrganizationCatalog().relationships;
    
    const suggestions: string[] = [];
    const warnings: string[] = [];
    
    if (invalidTables.length > 0) {
      warnings.push(`Invalid table names: ${invalidTables.join(", ")}`);
    }
    
    // Check if tables are properly connected
    const hasDirectConnections = validTables.length <= 1 || validTables.some(table1 => 
      validTables.some(table2 => 
        table1 !== table2 && relationships.some(rel => 
          (rel.left_table === table1 && rel.right_table === table2) ||
          (rel.left_table === table2 && rel.right_table === table1)
        )
      )
    );
    
    if (!hasDirectConnections && validTables.length > 1) {
      suggestions.push("Consider adding LOOKUP_VIEW to simplify joins between unconnected tables");
      suggestions.push("Add bridge tables like FACT_VEHICLE_OWNER for customer-vehicle relationships");
    }
    
    // Suggest optimal join path
    const optimizedPath = validTables.length > 1 ? 
      this.getOptimalJoinPath(validTables[0], validTables.slice(1)) : 
      validTables;
    
    return {
      valid: invalidTables.length === 0 && (validTables.length <= 1 || hasDirectConnections),
      suggestions,
      warnings,
      optimizedPath
    };
  }
}