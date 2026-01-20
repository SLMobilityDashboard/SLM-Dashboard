import fetch from "node-fetch";

// Read the number of API keys from environment
const API_KEY_COUNT = parseInt(process.env.GROQ_API_KEY_COUNT || "1", 10);

// Dynamically build array of API keys based on the count
const GROQ_API_KEYS = Array.from({ length: API_KEY_COUNT }, (_, i) => {
  const keyName = `GROQ_API_KEY${i + 1}`;
  return process.env[keyName];
}).filter((key) => key); // Remove any undefined keys

if (GROQ_API_KEYS.length === 0) {
  throw new Error(
    `No GROQ API keys found. Please set GROQ_API_KEY_COUNT and GROQ_API_KEY1, GROQ_API_KEY2, etc.`
  );
}

console.log(`Loaded ${GROQ_API_KEYS.length} API key(s) out of ${API_KEY_COUNT} configured`);

// Track current key index and rate limit status
let currentKeyIndex = 0;
const rateLimitedKeys = new Set();

/**
 * Get the next available API key
 * @returns {string|null} - Next available API key or null if all are rate limited
 */
function getNextApiKey() {
  const availableKeys = GROQ_API_KEYS.filter(
    (_, index) => !rateLimitedKeys.has(index)
  );

  if (availableKeys.length === 0) {
    return null; // All keys are rate limited
  }

  // Find next available key starting from current index
  for (let i = 0; i < GROQ_API_KEYS.length; i++) {
    const keyIndex = (currentKeyIndex + i) % GROQ_API_KEYS.length;
    if (!rateLimitedKeys.has(keyIndex)) {
      currentKeyIndex = keyIndex;
      return GROQ_API_KEYS[keyIndex];
    }
  }

  return null;
}

/**
 * Mark a key as rate limited and schedule its reset
 * @param {number} keyIndex - Index of the rate limited key
 */
function markKeyAsRateLimited(keyIndex) {
  rateLimitedKeys.add(keyIndex);
  console.log(`API key ${keyIndex + 1} is rate limited. Rotating to next key.`);

  // Reset the rate limit status after 1 hour
  setTimeout(() => {
    rateLimitedKeys.delete(keyIndex);
    console.log(`API key ${keyIndex + 1} rate limit reset.`);
  }, 60 * 60 * 1000); // 1 hour in milliseconds
}

/**
 * Check if response indicates rate limiting
 * @param {Response} response - Fetch response object
 * @returns {boolean} - True if rate limited
 */
function isRateLimited(response) {
  return (
    response.status === 429 ||
    response.status === 503 ||
    response.statusText?.toLowerCase().includes("rate limit")
  );
}

/**
 * Make API call with a specific key
 * @param {string} prompt - The prompt to send
 * @param {string} apiKey - API key to use
 * @returns {Promise<Response>} - Fetch response object
 */
async function makeApiCall(prompt, apiKey) {
  const requestBody = {
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
  };

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  return response;
}

/**
 * Sends a prompt to Groq LLM with automatic token rotation on rate limits
 * @param {string} prompt - The generated SQL prompt for LLM
 * @param {number} maxRetries - Maximum number of retries across all keys (default: 6)
 * @returns {Promise<string>} - Raw SQL query string from LLM
 */
export async function ReportGenerationService(prompt, maxRetries = 6) {
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    const apiKey = getNextApiKey();

    if (!apiKey) {
      throw new Error(
        `All API keys are rate limited. Please wait before retrying. Last error: ${
          lastError?.message || "Unknown error"
        }`
      );
    }

    try {
      console.log(
        `Attempting request with API key ${currentKeyIndex + 1} (attempt ${
          retryCount + 1
        }/${maxRetries})`
      );

      const response = await makeApiCall(prompt, apiKey);

      if (isRateLimited(response)) {
        markKeyAsRateLimited(currentKeyIndex);
        retryCount++;

        // Add exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
        console.log(`Rate limited. Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error(
          `Groq API request failed with status ${response.status}: ${response.statusText}. Response: ${errorText}`
        );
      }

      // Get response text first
      let rawText = await response.text();
      
      // Check if response is empty
      if (!rawText || rawText.trim().length === 0) {
        throw new Error("Groq API returned an empty response");
      }

      console.log(`Raw API Response: ${rawText.substring(0, 200)}...`);

      // Remove any code fences like ``` or ```json from the response content
      // But first, parse the JSON to get the actual content
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error(`Failed to parse JSON response: ${rawText}`);
        throw new Error(`Invalid JSON response from Groq API: ${parseError.message}`);
      }

      if (!data.choices || !data.choices[0]?.message?.content) {
        console.error(`Unexpected API response structure:`, data);
        throw new Error("Groq API response missing choices or content");
      }

      let content = data.choices[0].message.content.trim();
      
      // Now remove code fences from the actual content
      content = content.replace(/```sql\n?|```json\n?|```\n?/g, "").trim();

      console.log(`Request successful with API key ${currentKeyIndex + 1}`);

      // Move to next key for load balancing
      currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;

      // Return the cleaned content
      return content;
    } catch (error) {
      lastError = error;
      console.error(
        `Error with API key ${currentKeyIndex + 1}:`,
        error.message
      );

      // If it's a rate limit error, mark the key and continue
      if (
        error.message.includes("429") ||
        error.message.toLowerCase().includes("rate limit")
      ) {
        markKeyAsRateLimited(currentKeyIndex);
      }

      retryCount++;

      // If this isn't the last retry, wait before trying next key
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        console.log(`Waiting ${delay}ms before trying next key...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries
  console.error("All retry attempts failed");
  throw lastError || new Error("All API keys failed after maximum retries");
}

/**
 * Get status of all API keys
 * @returns {Object} - Status object with available and rate limited keys
 */
export function getApiKeyStatus() {
  return {
    totalKeys: GROQ_API_KEYS.length,
    currentKey: currentKeyIndex + 1,
    availableKeys: GROQ_API_KEYS.length - rateLimitedKeys.size,
    rateLimitedKeys: Array.from(rateLimitedKeys).map((i) => i + 1),
  };
}