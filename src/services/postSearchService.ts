import { IPost } from "../models/Post";
import {
  parseSearchIntentWithLlm,
  sanitizeLlmIntent,
  type ParsedSearchIntent,
} from "./llmPostSearchParser";

export type SearchRequestBody = {
  query?: unknown;
  page?: unknown;
  limit?: unknown;
  sort?: unknown;
  filters?: {
    createdBy?: unknown;
    dateFrom?: unknown;
    dateTo?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type SearchModel = {
  find: (filter: Record<string, unknown>) => {
    sort: (sort: Record<string, 1 | -1>) => {
      skip: (skip: number) => {
        limit: (limit: number) => Promise<Array<IPost & { id: string } & any>>;
      };
    };
  };
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
};

export class SearchValidationError extends Error {
  details: Record<string, string>;

  constructor(details: Record<string, string>) {
    super("Invalid request");
    this.name = "SearchValidationError";
    this.details = details;
  }
}

type SearchDependencies = {
  model: SearchModel;
  buildLikesMap: (postIds: string[]) => Promise<Map<string, string[]>>;
  parseIntentWithLlm?: (query: string) => Promise<unknown>;
  embedTexts?: (texts: string[]) => Promise<number[][]>;
  serializePost: (
    post: IPost & { id: string; _id?: string },
    likes: string[],
  ) => {
    id: string;
    title: string;
    content: string;
    createdBy: string;
    image: string | null;
    likes: string[];
  };
};

export type SearchPostsResult = {
  items: Array<{
    id: string;
    title: string;
    content: string;
    createdBy: string;
    image: string | null;
    likes: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  meta: {
    fallbackUsed: boolean;
    sortApplied: "relevance" | "newest";
    filtersApplied: {
      createdBy?: string;
      dateFrom?: string;
      dateTo?: string;
    };
    parsedIntent: {
      keywords: string[];
      mustInclude: string[];
      exclude: string[];
      createdBy: string | null;
      dateFrom: string | null;
      dateTo: string | null;
      sortBy: "relevance" | "newest";
    };
  };
};

type ParsedInput = {
  query: string;
  page: number;
  limit: number;
};

const HEBREW_STOP_WORDS = new Set([
  "כל",
  "של",
  "עם",
  "בלי",
  "על",
  "את",
  "זה",
  "זאת",
  "הזה",
  "הזאת",
  "קשור",
  "קשורה",
  "קשורים",
  "קשורות",
  "שקשור",
  "שקשורה",
  "שקשורים",
  "שקשורות",
  "פוסטים",
]);

const HEBREW_PREFIXES = new Set(["ו", "ב", "ל", "כ", "מ", "ה", "ש"]);

const SEMANTIC_CANDIDATE_LIMIT = 200;
const SEMANTIC_MIN_SIMILARITY = 0.18;

const normalizeHebrewToken = (token: string): string => {
  let normalized = token;

  // Remove up to two common Hebrew prefix letters (e.g. "לאנטומיה" -> "אנטומיה").
  for (let i = 0; i < 2; i += 1) {
    if (normalized.length <= 3) {
      break;
    }

    const firstChar = normalized.charAt(0);
    if (!HEBREW_PREFIXES.has(firstChar)) {
      break;
    }

    normalized = normalized.slice(1);
  }

  return normalized;
};

const expandTermVariants = (terms: string[]): string[] => {
  const expanded = new Set<string>();

  for (const rawTerm of terms) {
    const term = rawTerm.trim().toLowerCase();
    if (!term) {
      continue;
    }

    expanded.add(term);

    const isSingleToken = !term.includes(" ");
    if (!isSingleToken) {
      continue;
    }

    const normalized = normalizeHebrewToken(term);
    expanded.add(normalized);

    for (const prefix of HEBREW_PREFIXES) {
      expanded.add(`${prefix}${normalized}`);
    }
  }

  return Array.from(expanded);
};

const extractFallbackKeywords = (query: string): string[] => {
  const normalized = query
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");

  const tokens = normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .filter((t) => {
      const normalizedToken = normalizeHebrewToken(t);
      return (
        !HEBREW_STOP_WORDS.has(t) && !HEBREW_STOP_WORDS.has(normalizedToken)
      );
    });

  const unique = Array.from(new Set(tokens));
  return unique.length > 0 ? unique : query.split(/\s+/).filter(Boolean);
};

const dot = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
};

const magnitude = (a: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }

  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot(a, b) / (magA * magB);
};

const embedTextsWithOpenAi = async (texts: string[]): Promise<number[][]> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.SEARCH_EMBEDDING_MODEL || "text-embedding-3-small",
      input: texts,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const vectors = data.data?.map((item) => item.embedding ?? []) ?? [];
  if (vectors.length !== texts.length) {
    throw new Error("Embedding response size mismatch");
  }

  return vectors;
};

const semanticFallbackSearch = async (
  query: string,
  deps: SearchDependencies,
): Promise<Array<IPost & { id: string } & any>> => {
  const candidates = await deps.model
    .find({})
    .sort({ createdAt: -1 })
    .skip(0)
    .limit(SEMANTIC_CANDIDATE_LIMIT);

  if (candidates.length === 0) {
    return [];
  }

  const texts = [query, ...candidates.map((p) => `${p.title}\n${p.content}`)];
  const embed = deps.embedTexts ?? embedTextsWithOpenAi;
  const vectors = await embed(texts);

  const queryVector = vectors[0];
  const scored = candidates
    .map((post, index) => ({
      post,
      score: cosineSimilarity(queryVector, vectors[index + 1] ?? []),
    }))
    .filter((item) => item.score >= SEMANTIC_MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.post);
};

export const parseAndValidateSearchInput = (
  body: SearchRequestBody,
): ParsedInput => {
  const details: Record<string, string> = {};

  const rawQuery = body?.query;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

  if (!query) {
    details.query = "query is required";
  } else if (query.length > 500) {
    details.query = "query must be at most 500 characters";
  }

  const rawPage = body?.page;
  const rawLimit = body?.limit;

  const page = rawPage === undefined ? 1 : Number(rawPage);
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);

  if (!Number.isFinite(page) || !Number.isInteger(page) || page < 1) {
    details.page = "page must be an integer greater than or equal to 1";
  }

  if (
    !Number.isFinite(limit) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    details.limit = "limit must be between 1 and 50";
  }

  if (Object.keys(details).length > 0) {
    throw new SearchValidationError(details);
  }

  return {
    query,
    page,
    limit,
  };
};

export const searchPosts = async (
  body: SearchRequestBody,
  deps: SearchDependencies,
): Promise<SearchPostsResult> => {
  const parsed = parseAndValidateSearchInput(body);

  const fallbackIntent: ParsedSearchIntent = {
    keywords: extractFallbackKeywords(parsed.query),
    mustInclude: [],
    exclude: [],
    createdBy: null,
    dateFrom: null,
    dateTo: null,
    sortBy: "relevance",
  };

  let finalIntent = fallbackIntent;
  let fallbackUsed = true;

  try {
    const parser = deps.parseIntentWithLlm ?? parseSearchIntentWithLlm;
    const llmRawIntent = await parser(parsed.query);
    finalIntent = sanitizeLlmIntent(llmRawIntent as any, fallbackIntent);
    fallbackUsed = false;
  } catch {
    fallbackUsed = true;
  }

  finalIntent = {
    ...finalIntent,
    createdBy: null,
    dateFrom: null,
    dateTo: null,
    sortBy: "relevance",
  };

  const expandedKeywords = expandTermVariants(finalIntent.keywords);
  const expandedMustInclude = expandTermVariants(finalIntent.mustInclude);
  const expandedExclude = expandTermVariants(finalIntent.exclude);

  const filter: Record<string, unknown> = {};

  const termToRegex = (term: string): RegExp => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped.replace(/ +/g, "\\s+[\u05D0-\u05EA]?\\s*");
    return new RegExp(pattern, "i");
  };

  if (expandedKeywords.length > 0) {
    filter.$or = expandedKeywords.flatMap((term) => {
      const regex = termToRegex(term);
      return [{ title: regex }, { content: regex }];
    });
  }

  if (expandedMustInclude.length > 0) {
    filter.$and = expandedMustInclude.map((term) => {
      const regex = termToRegex(term);
      return {
        $or: [{ title: regex }, { content: regex }],
      };
    });
  }

  if (expandedExclude.length > 0) {
    filter.$nor = expandedExclude.map((term) => {
      const regex = termToRegex(term);
      return {
        $or: [{ title: regex }, { content: regex }],
      };
    });
  }

  const skip = (parsed.page - 1) * parsed.limit;
  const sortSpec = { createdAt: -1 as const };

  let [posts, total] = await Promise.all([
    deps.model.find(filter).sort(sortSpec).skip(skip).limit(parsed.limit),
    deps.model.countDocuments(filter),
  ]);

  if (total === 0) {
    try {
      const semanticPosts = await semanticFallbackSearch(parsed.query, deps);
      total = semanticPosts.length;
      posts = semanticPosts.slice(skip, skip + parsed.limit);
    } catch {
      // Preserve lexical behavior when semantic retrieval is unavailable.
    }
  }

  const postIds = posts.map((post) => post.id);
  const likesByPostId = await deps.buildLikesMap(postIds);

  const items = posts.map((post) => ({
    ...deps.serializePost(post, likesByPostId.get(post.id) ?? []),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }));

  return {
    items,
    page: parsed.page,
    limit: parsed.limit,
    total,
    hasMore: parsed.page * parsed.limit < total,
    meta: {
      fallbackUsed,
      sortApplied: "relevance",
      filtersApplied: {},
      parsedIntent: finalIntent,
    },
  };
};
