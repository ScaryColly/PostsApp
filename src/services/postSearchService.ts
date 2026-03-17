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
    keywords: parsed.query.split(/\s+/).filter(Boolean),
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

  // Free-text only mode: legacy non-text intent fields are ignored.
  finalIntent = {
    ...finalIntent,
    createdBy: null,
    dateFrom: null,
    dateTo: null,
    sortBy: "relevance",
  };

  const allSearchTerms = Array.from(
    new Set(
      [...finalIntent.keywords, ...finalIntent.mustInclude].filter(Boolean),
    ),
  );

  const filter: Record<string, unknown> = {};

  if (allSearchTerms.length > 0) {
    filter.$and = allSearchTerms.map((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      return {
        $or: [{ title: regex }, { content: regex }],
      };
    });
  }

  if (finalIntent.exclude.length > 0) {
    filter.$nor = finalIntent.exclude.map((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      return {
        $or: [{ title: regex }, { content: regex }],
      };
    });
  }

  const skip = (parsed.page - 1) * parsed.limit;
  const sortSpec = { createdAt: -1 as const };

  const [posts, total] = await Promise.all([
    deps.model.find(filter).sort(sortSpec).skip(skip).limit(parsed.limit),
    deps.model.countDocuments(filter),
  ]);

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
