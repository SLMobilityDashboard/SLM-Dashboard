import {
  permissionCheckPrompt,
  sqlGenerationPrompt,
} from "../Prompts/SQLGenerationPrompts.js";
import { ReportGenerationService } from "./ReportGenerationService.js";
import MongoDBManager from "../lib/mongodb.ts";

export class SQLQueryService {
  static validateQueryParameters(semanticModel) {
    if (!semanticModel || typeof semanticModel !== "object") {
      throw new Error("Semantic model must be an object");
    }
    if (!semanticModel.query) {
      throw new Error("Semantic model must include 'query' string");
    }
    return true;
  }

  // Extract JSON block from the LLM response (handles fenced and non-fenced JSON)
  static extractJSON(text) {
    // Remove code fences
    let cleaned = text.replace(/```json\n?|```/g, "").trim();

    // Try to match the actual JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in LLM response.");
    }

    let jsonStr = jsonMatch[0];

    // 🔧 FIX: Clean the SQL field to remove literal newlines/tabs that break JSON parsing
    // Match the "sql" field value and collapse all whitespace
    jsonStr = jsonStr.replace(
      /"sql"\s*:\s*"([\s\S]*?)"/,
      (match, sqlContent) => {
        // Replace all literal newlines, tabs, and multiple spaces with single space
        const cleanedSql = sqlContent
          .replace(/[\n\r\t]/g, " ") // Replace newlines/tabs with space
          .replace(/\s+/g, " ") // Collapse multiple spaces
          .trim(); // Remove leading/trailing spaces
        return `"sql": "${cleanedSql}"`;
      }
    );

    return jsonStr;
  }

  static async callLLM(prompt) {
    // Call your LLM here, e.g., fetch or API call
    return await ReportGenerationService(prompt);
  }

  static sanitizeSQL(sql) {
    if (!sql || typeof sql !== "string") return sql;

    // 1️⃣ Remove % characters from aliases like "fp%" → fp
    sql = sql.replace(/(["\w]+)%/g, "$1");

    // 2️⃣ Fix quoted aliases: remove quotes around simple identifiers
    //    But keep quotes around fully qualified table/column names with special chars
    sql = sql.replace(/"([a-zA-Z0-9_]+)"/g, "$1");

    // 3️⃣ Fix column references like ss%.NAME or fp%.CREATED_EPOCH → ss.NAME
    sql = sql.replace(/([a-zA-Z0-9_]+)\.%/g, "$1.");

    // 4️⃣ Collapse multiple spaces/newlines into single space for cleanliness
    sql = sql.replace(/\s+/g, " ");

    // 5️⃣ Trim leading/trailing whitespace
    return sql.trim();
  }

  static async runPermissionCheck(semanticModel) {
    // console.log(
    //   "🔄 Running permission check...",
    //   JSON.stringify(semanticModel, null, 2)
    // );
    const prompt = permissionCheckPrompt(semanticModel);
    // console.log("🔄 LLM Request for Permission Check:", prompt);
    const llmResponse = await this.callLLM(prompt);

    try {
      const jsonText = this.extractJSON(llmResponse);
      // console.log("🔄 LLM Response for Permission Check:", jsonText);
      return JSON.parse(jsonText);
    } catch (err) {
      console.error("JSON parse error on permission check response:", err);
      console.error("Raw LLM Response:", llmResponse);
      throw new Error(
        "Failed to parse permission check JSON response: " + err.message
      );
    }
  }

  static async runSQLGeneration(semanticModel, resolvedQuery = null) {
    const prompt = sqlGenerationPrompt(semanticModel, resolvedQuery);
    console.log("🔄 LLM Request for SQL Generation:", prompt);
    const llmResponse = await this.callLLM(prompt);

    try {
      const jsonText = this.extractJSON(llmResponse);
      console.log(
        "🔄 Extracted JSON (first 200 chars):",
        jsonText.substring(0, 200) + "..."
      );
      return JSON.parse(jsonText);
    } catch (err) {
      console.error("JSON parse error on SQL generation response:", err);
      console.error("Raw LLM Response:", llmResponse);
      throw new Error(
        "Failed to parse SQL generation JSON response: " + err.message
      );
    }
  }

  static async generateQuery(semanticModel) {
    this.validateQueryParameters(semanticModel);

    // console.log("🔄 Running permission check...", semanticModel);
    // Step 1: Run permission check
    const permissionResult = await this.runPermissionCheck(semanticModel);
    // console.log("✅ Permission check result:", permissionResult);
    if (!permissionResult.allowed) {
      // Save failure details to MongoDB for analysis
      try {
        await MongoDBManager.savePermissionFailure({
          semanticModel,
          explanation:
            permissionResult.explanation || "No explanation provided",
          timestamp: new Date(),
        });
        console.log("🔴 Permission failure saved to DB");
      } catch (err) {
        console.error("Error saving permission failure to DB:", err);
      }

      return {
        sql: "",
        explanation: permissionResult.explanation,
      };
    }

    // Step 2: Permissions allowed, generate SQL
    // Pass resolvedQuery from permission check if available, else null
    const resolvedQuery = permissionResult.resolvedQuery || null;

    const sqlResult = await this.runSQLGeneration(semanticModel, resolvedQuery);

    if (!sqlResult.sql || !sqlResult.explanation) {
      throw new Error("Invalid response from SQL generation step.");
    }

    // Sanitize the SQL before returning
    const sanitizedSQL = this.sanitizeSQL(sqlResult.sql);

    return {
      sql: sanitizedSQL,
      explanation: sqlResult.explanation.trim(),
    };
  }
}
