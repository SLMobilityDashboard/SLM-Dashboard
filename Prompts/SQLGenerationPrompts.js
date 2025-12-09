import { SQLPromptFormatters } from "../utils/SQLPromptFormatters.js";
import { OrgContext } from "./OrgContext.js";

export const permissionCheckPrompt = (
  semanticModel,
  organizationalContext = ""
) => {
  const formattedTables = SQLPromptFormatters.formatTables(
    semanticModel.semanticModel.tables
  );
  const formattedRelationships = SQLPromptFormatters.formatRelationships(
    semanticModel.semanticModel.relationships
  );

  return `
You are an expert semantic analyzer.

## USER QUERY
"${semanticModel.query || "No query provided"}"

## USER ROLE
${semanticModel.executorRole || "guest"}

## ORGANIZATIONAL CONTEXT
${OrgContext}

## DATABASE SCHEMA

### Tables and Columns
${formattedTables}

### Relationships
${formattedRelationships}

## INSTRUCTIONS
1. Identify all tables and columns required to answer the user's query, resolving synonyms.
2. Detect any ambiguous or unknown terms in the query, but you can assume details from the organizational context, assumptions need to be clearly stated in explanations.
3. Only for the very vague and ambiguous terms, clearly mention the doubts in the explanation.
4. If the query needs more context or information, ask for clarification.
5. Do not generate SQL queries or any other output.
6. If the query cannot be answered due to insufficient information, return an empty response with an explanation.
7. Assume everyone has access to everything for now

## OUTPUT FORMAT
Return exactly one JSON object with one of these formats:

- If ambiguous terms:
{
  "allowed": false,
  "explanation": "Ambiguous terms found: [...] Please clarify."
}

- If insufficient permissions:
{
  "allowed": false,
  "explanation": "The user does not have sufficient permissions to access the required tables or columns."
}

- If access granted:
{
  "allowed": true,
  "explanation": "Access granted to the required tables and columns and Query has no ambiguous terms."
}

Do not add any extra text or commentary.
`.trim();
};

export const sqlGenerationPrompt = (
  semanticModel,
  resolvedQuery = null,
  organizationalContext = ""
) => {
  const formattedTables = SQLPromptFormatters.formatTables(
    semanticModel.semanticModel.tables
  );
  const formattedRelationships = SQLPromptFormatters.formatRelationships(
    semanticModel.semanticModel.relationships
  );
  const formattedMeasures = SQLPromptFormatters.formatMeasures(
    semanticModel.semanticModel.measures
  );
  const formattedFilters = SQLPromptFormatters.formatFilters(
    semanticModel.semanticModel.default_filters
  );

  const queryToUse =
    resolvedQuery || semanticModel.query || "No query provided";

  return `
You are an expert SQL query generator.

## USER QUERY
"${queryToUse}"

## USER ROLE
${semanticModel.executorRole || "guest"}

## ORGANIZATIONAL CONTEXT
${OrgContext}

## DATABASE SCHEMA

### Tables and Columns
${formattedTables}

### Relationships
${formattedRelationships}

### Predefined Measures
${formattedMeasures}

### Default Filters
${formattedFilters}

## INSTRUCTIONS
1. Generate a SQL query that answers the user's question accurately.
2. Include GROUP BY, ORDER BY, COALESCE, and LIMIT if applicable.
3. Always apply default filters from the model.
4. Use proper JOIN syntax and optimize for performance.
5. Resolve ambiguous terms using synonyms or predefined measures **but never introduce new columns or tables not explicitly listed in the schema. If a join seems missing, always route through LOOKUP_VIEW.**
6. **Date filtering rules (enforced):**
   - "CREATED_EPOCH" and "TIME_STAMP" fields are proper TIMESTAMP(0) types in UTC.
          Ex - 2025-12-01T18:29:57.000+0000
   - For month/year aggregation, use:
       TO_NUMBER(TO_CHAR(CREATED_EPOCH, 'YYYYMM'))
     or
       DATE_TRUNC('MONTH', CREATED_EPOCH)
   - NEVER use epoch conversion functions like unix_to_timestamp.
   - NEVER use CREATED_AT or other timestamp fields for month/year aggregation.
7. Use simple, readable aliases: fp for FACT_PAYMENT, ss for DIM_SWAPPING_STATION.
8. Ensure SQL is syntactically correct.
9. Return exactly one JSON object with "sql" and very descriptive "explanation".
10. Include only necessary columns for the query; do not include extras.
11. Prefix all tables, views, and functions with their schema (fullName).
12. Use standard Snowflake syntax.
13. Include only necessary columns in SELECT.
14. Use Snowflake-supported functions only:
        CURRENT_TIMESTAMP instead of NOW()
        DAYOFWEEK() instead of DAY_OF_WEEK() use CASE DAYOFWEEK() = 0 THEN SUNDAY pattern for day names
        

IMPORTANT: Return the JSON object in valid JSON format, escaping newlines inside string values as \\n. The object must be parseable by standard JSON parsers.

## OUTPUT FORMAT
{
  "sql": "...",
  "explanation": "..."
}
`.trim();
};
