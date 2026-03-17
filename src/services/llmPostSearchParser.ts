export type LlmSearchIntent = {
  keywords?: unknown;
  mustInclude?: unknown;
  exclude?: unknown;
  createdBy?: unknown;
  createdAt?: unknown;
  sortBy?: unknown;
};

export type ParsedSearchIntent = {
  keywords: string[];
  mustInclude: string[];
  exclude: string[];
  createdBy: string | null;
  createdAt: string | null;
  sortBy: "relevance" | "newest";
};

type SearchLlmConfig = {
  model: string;
  timeoutMs: number;
  retryCount: number;
  maxOutputTokens: number;
};

const parseIntEnv = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : fallback;
};

export const getSearchLlmConfig = (): SearchLlmConfig => {
  return {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    timeoutMs: parseIntEnv(process.env.SEARCH_LLM_TIMEOUT_MS, 5000),
    retryCount: parseIntEnv(process.env.SEARCH_LLM_RETRY_COUNT, 1),
    maxOutputTokens: parseIntEnv(process.env.SEARCH_LLM_MAX_TOKENS, 300),
  };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const postToOpenAi = async (
  apiKey: string,
  prompt: string,
  config: SearchLlmConfig,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    return await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_output_tokens: config.maxOutputTokens,
        input: prompt,
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toIsoOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toSort = (value: unknown): "relevance" | "newest" => {
  return value === "newest" ? "newest" : "relevance";
};

export const sanitizeLlmIntent = (
  value: LlmSearchIntent,
  defaults: ParsedSearchIntent,
): ParsedSearchIntent => {
  const keywords = toStringArray(value.keywords);
  const mustInclude = toStringArray(value.mustInclude);
  const exclude = toStringArray(value.exclude);

  const createdBy =
    typeof value.createdBy === "string" && value.createdBy.trim()
      ? value.createdBy.trim()
      : defaults.createdBy;

  const createdAt = toIsoOrNull(value.createdAt) ?? defaults.createdAt;

  return {
    keywords: keywords.length > 0 ? keywords : defaults.keywords,
    mustInclude,
    exclude,
    createdBy,
    createdAt,
    sortBy: toSort(value.sortBy),
  };
};

export const parseSearchIntentWithLlm = async (
  query: string,
): Promise<LlmSearchIntent> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const config = getSearchLlmConfig();
  const currentDateTime = new Date().toISOString();

  const prompt = [
    "Convert the user's free-text post search query to strict JSON.",
    "Return only a JSON object with keys:",
    "keywords (string[]), mustInclude (string[]), exclude (string[]), createdBy (string|null), createdAt (ISO string|null), sortBy ('relevance'|'newest').",
    "keywords must include semantic expansions and close domain terms that may appear in matching posts.",
    "Use the same language as the user query and avoid filler/stop words.",
    "For broad intent queries (for example 'posts related to anatomy'), include likely concrete anatomy terms (for example hand, digestive system, organs, bones) when relevant.",
    "If the user asks for a specific day or relative day such as today or yesterday, set createdAt to an ISO string on that target UTC calendar day.",
    "Keep keywords concise and useful for retrieval (typically 3-8 terms).",
    "Do not include Mongo operators or any extra keys.",
    `Current datetime (UTC): ${currentDateTime}`,
    `User query: ${query}`,
  ].join("\n");

  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= config.retryCount; attempt += 1) {
    try {
      response = await postToOpenAi(apiKey, prompt, config);

      if (!response.ok) {
        throw new Error(`LLM request failed with status ${response.status}`);
      }

      break;
    } catch (err) {
      lastError = err;

      if (attempt === config.retryCount) {
        break;
      }

      await sleep(100 * (attempt + 1));
    }
  }

  if (!response) {
    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error("LLM request failed");
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const textFromOutput =
    typeof data.output_text === "string"
      ? data.output_text
      : data.output?.[0]?.content?.[0]?.text;

  if (!textFromOutput) {
    throw new Error("LLM response did not include text output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textFromOutput);
  } catch {
    throw new Error("LLM returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM returned non-object JSON");
  }

  return parsed as LlmSearchIntent;
};
