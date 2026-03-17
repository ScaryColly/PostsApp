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

  test("searchPosts - multi-word keyword matches post with prefixed variant (מערכת עיכול → מערכת העיכול)", async () => {
    const digestivePost = {
      id: "pDigest",
      _id: "pDigest",
      title: "מערכת העיכול",
      content: "פוסט על מערכת העיכול",
      createdBy: "u1",
      image: null,
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      updatedAt: new Date("2026-03-15T00:00:00.000Z"),
    };

    const modelFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([digestivePost]),
        }),
      }),
    });

    const deps = {
      model: {
        find: modelFind,
        countDocuments: jest.fn().mockResolvedValue(1),
      },
      parseIntentWithLlm: jest.fn().mockResolvedValue({
        keywords: ["מערכת עיכול"],
        mustInclude: [],
        exclude: [],
      }),
      buildLikesMap: jest.fn().mockResolvedValue(new Map()),
      serializePost: jest.fn().mockImplementation((post, likes) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        createdBy: post.createdBy,
        image: post.image,
        likes,
      })),
    };

    await searchPosts({ query: "מערכת עיכול" }, deps as any);

    const findArg = modelFind.mock.calls[0][0];
    const regexes: RegExp[] = (
      findArg.$or as Array<{ title?: RegExp; content?: RegExp }>
    )
      .map((e) => e.title ?? e.content)
      .filter((r): r is RegExp => r instanceof RegExp);

    const anyMatchesWithPrefix = regexes.some((r) => r.test("מערכת העיכול"));
    expect(anyMatchesWithPrefix).toBe(true);
  });

  test("searchPosts - semantic keywords are matched with OR logic", async () => {
    const posts: any[] = [];

    const modelFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(posts),
        }),
      }),
    });

    const deps = {
      model: {
        find: modelFind,
        countDocuments: jest.fn().mockResolvedValue(0),
      },
      parseIntentWithLlm: jest.fn().mockResolvedValue({
        keywords: ["אנטומיה", "כף יד", "מערכת העיכול"],
        mustInclude: [],
        exclude: [],
      }),
      buildLikesMap: jest.fn().mockResolvedValue(new Map()),
      serializePost: jest.fn(),
    };

    await searchPosts({ query: "כל הפוסטים שקשורים לאנטומיה" }, deps as any);

    const findArg = modelFind.mock.calls[0][0];
    expect(Array.isArray(findArg.$or)).toBe(true);
    expect(findArg.$or.length).toBeGreaterThanOrEqual(6);
    expect(findArg.$and).toBeUndefined();
  });

  test("searchPosts - semantic fallback ranks posts for any subject when lexical yields no match", async () => {
    const lexicalFindLimit = jest.fn().mockResolvedValue([]);
    const lexicalFindSkip = jest
      .fn()
      .mockReturnValue({ limit: lexicalFindLimit });
    const lexicalFindSort = jest
      .fn()
      .mockReturnValue({ skip: lexicalFindSkip });

    const semanticCandidates = [
      {
        id: "pA",
        _id: "pA",
        title: "מערכת העיכול",
        content: "פירוט על איברי מערכת העיכול",
        createdBy: "u1",
        image: null,
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
        updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
      {
        id: "pB",
        _id: "pB",
        title: "כף היד",
        content: "עצמות ושרירים בכף היד",
        createdBy: "u1",
        image: null,
        createdAt: new Date("2026-03-11T00:00:00.000Z"),
        updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      },
    ];

    const semanticFindLimit = jest.fn().mockResolvedValue(semanticCandidates);
    const semanticFindSkip = jest
      .fn()
      .mockReturnValue({ limit: semanticFindLimit });
    const semanticFindSort = jest
      .fn()
      .mockReturnValue({ skip: semanticFindSkip });

    const modelFind = jest
      .fn()
      .mockReturnValueOnce({ sort: lexicalFindSort })
      .mockReturnValueOnce({ sort: semanticFindSort });

    const deps = {
      model: {
        find: modelFind,
        countDocuments: jest.fn().mockResolvedValue(0),
      },
      parseIntentWithLlm: jest.fn().mockResolvedValue({
        keywords: ["אנטומיה"],
        mustInclude: [],
        exclude: [],
      }),
      embedTexts: jest.fn().mockResolvedValue([
        [1, 0],
        [0.92, 0.08],
        [0.87, 0.13],
      ]),
      buildLikesMap: jest.fn().mockResolvedValue(new Map()),
      serializePost: jest.fn().mockImplementation((post, likes) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        createdBy: post.createdBy,
        image: post.image,
        likes,
      })),
    };

    const result = await searchPosts({ query: "אנטומיה" }, deps as any);

    expect(result.total).toBe(2);
    expect(result.items.map((p) => p.id)).toEqual(["pA", "pB"]);
    expect(deps.embedTexts).toHaveBeenCalled();
  });

  test("searchPosts - fallback strips common Hebrew filler words", async () => {
    const posts: any[] = [];

    const deps = {
      model: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(posts),
            }),
          }),
        }),
        countDocuments: jest.fn().mockResolvedValue(0),
      },
      parseIntentWithLlm: jest.fn().mockRejectedValue(new Error("down")),
      buildLikesMap: jest.fn().mockResolvedValue(new Map()),
      serializePost: jest.fn(),
    };

    const result = await searchPosts(
      { query: "כל הפוסטים שקשורים לאנטומיה" },
      deps as any,
    );

    expect(result.meta.parsedIntent.keywords).toContain("לאנטומיה");
    expect(result.meta.parsedIntent.keywords).not.toContain("כל");
    expect(result.meta.parsedIntent.keywords).not.toContain("פוסטים");
    expect(result.meta.parsedIntent.keywords).not.toContain("שקשורים");
  });

  test("searchPosts - fallback does not strip intrinsic leading letters", async () => {
    const deps = {
      model: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
        countDocuments: jest.fn().mockResolvedValue(0),
      },
      parseIntentWithLlm: jest.fn().mockRejectedValue(new Error("down")),
      embedTexts: jest.fn().mockResolvedValue([[1, 0]]),
      buildLikesMap: jest.fn().mockResolvedValue(new Map()),
      serializePost: jest.fn(),
    };

    const result = await searchPosts({ query: "מחשב" }, deps as any);

    expect(result.meta.parsedIntent.keywords).toContain("מחשב");
    expect(result.meta.parsedIntent.keywords).not.toContain("חשב");
  });
});
