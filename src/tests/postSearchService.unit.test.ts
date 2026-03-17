import {
  parseAndValidateSearchInput,
  searchPosts,
  SearchValidationError,
} from "../services/postSearchService";

describe("postSearchService", () => {
  test("parseAndValidateSearchInput - missing query throws SearchValidationError", () => {
    expect(() => parseAndValidateSearchInput({})).toThrow(
      SearchValidationError,
    );

    try {
      parseAndValidateSearchInput({});
    } catch (err) {
      expect((err as SearchValidationError).details.query).toBe(
        "query is required",
      );
    }
  });

  test("parseAndValidateSearchInput - defaults page and limit", () => {
    const parsed = parseAndValidateSearchInput({ query: "docker" });
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  test("parseAndValidateSearchInput - ignores legacy filter fields", () => {
    const parsed = parseAndValidateSearchInput({
      query: "docker",
      filters: {
        dateFrom: "2026-03-17T23:59:59.999Z",
        dateTo: "2026-03-01T00:00:00.000Z",
      },
      sort: "newest",
    });

    expect(parsed.query).toBe("docker");
  });

  test("searchPosts - returns stable contract and computes hasMore", async () => {
    const posts = [
      {
        id: "p1",
        _id: "p1",
        title: "Docker troubleshooting",
        content: "Build error fixes",
        createdBy: "u1",
        image: null,
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      },
    ];

    const deps = {
      model: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(posts),
            }),
          }),
        }),
        countDocuments: jest.fn().mockResolvedValue(3),
      },
      parseIntentWithLlm: jest.fn().mockRejectedValue(new Error("unavailable")),
      buildLikesMap: jest.fn().mockResolvedValue(new Map([["p1", ["u2"]]])),
      serializePost: jest.fn().mockImplementation((post, likes) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        createdBy: post.createdBy,
        image: post.image,
        likes,
      })),
    };

    const result = await searchPosts(
      {
        query: "docker error",
        page: 1,
        limit: 1,
      },
      deps as any,
    );

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items[0].likes).toEqual(["u2"]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(true);
    expect(result.meta.fallbackUsed).toBe(true);
    expect(result.meta.sortApplied).toBe("relevance");
    expect(result.meta.filtersApplied).toEqual({});
    expect(result.meta.parsedIntent.keywords).toEqual(["docker", "error"]);
    expect(result.meta.parsedIntent.createdBy).toBeNull();
    expect(result.meta.parsedIntent.dateFrom).toBeNull();
    expect(result.meta.parsedIntent.dateTo).toBeNull();
  });

  test("searchPosts - uses llm intent when parser succeeds", async () => {
    const posts = [
      {
        id: "p2",
        _id: "p2",
        title: "Prod-only rollout",
        content: "No windows references",
        createdBy: "u1",
        image: null,
        createdAt: new Date("2026-03-11T00:00:00.000Z"),
        updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      },
    ];

    const findLimit = jest.fn().mockResolvedValue(posts);
    const findSkip = jest.fn().mockReturnValue({ limit: findLimit });
    const findSort = jest.fn().mockReturnValue({ skip: findSkip });
    const modelFind = jest.fn().mockReturnValue({ sort: findSort });

    const deps = {
      model: {
        find: modelFind,
        countDocuments: jest.fn().mockResolvedValue(1),
      },
      parseIntentWithLlm: jest.fn().mockResolvedValue({
        keywords: ["k8s"],
        mustInclude: ["prod"],
        exclude: ["windows"],
        createdBy: "u1",
        dateFrom: "2026-03-01T00:00:00.000Z",
        dateTo: "2026-03-17T00:00:00.000Z",
        sortBy: "newest",
      }),
      buildLikesMap: jest.fn().mockResolvedValue(new Map([["p2", []]])),
      serializePost: jest.fn().mockImplementation((post, likes) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        createdBy: post.createdBy,
        image: post.image,
        likes,
      })),
    };

    const result = await searchPosts(
      { query: "kubernetes prod posts" },
      deps as any,
    );

    expect(result.meta.fallbackUsed).toBe(false);
    expect(result.meta.parsedIntent.keywords).toEqual(["k8s"]);
    expect(result.meta.parsedIntent.mustInclude).toEqual(["prod"]);
    expect(result.meta.parsedIntent.exclude).toEqual(["windows"]);
    expect(result.meta.sortApplied).toBe("relevance");
    expect(result.meta.parsedIntent.sortBy).toBe("relevance");
    expect(result.meta.parsedIntent.createdBy).toBeNull();
    expect(result.meta.parsedIntent.dateFrom).toBeNull();
    expect(result.meta.parsedIntent.dateTo).toBeNull();
    expect(modelFind).toHaveBeenCalled();
  });
});
