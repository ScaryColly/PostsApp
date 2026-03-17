import {
  parseSearchIntentWithLlm,
  sanitizeLlmIntent,
  type ParsedSearchIntent,
} from "../services/llmPostSearchParser";

describe("llmPostSearchParser", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("sanitizeLlmIntent - keeps only allowed values and defaults", () => {
    const defaults: ParsedSearchIntent = {
      keywords: ["docker", "error"],
      mustInclude: [],
      exclude: [],
      createdBy: null,
      dateFrom: null,
      dateTo: null,
      sortBy: "relevance",
    };

    const result = sanitizeLlmIntent(
      {
        keywords: ["k8s", 123, ""],
        mustInclude: ["prod"],
        exclude: ["windows"],
        createdBy: "u1",
        dateFrom: "2026-03-01T00:00:00.000Z",
        dateTo: "bad-date",
        sortBy: "newest",
        $where: "malicious",
      } as any,
      defaults,
    );

    expect(result.keywords).toEqual(["k8s"]);
    expect(result.mustInclude).toEqual(["prod"]);
    expect(result.exclude).toEqual(["windows"]);
    expect(result.createdBy).toBe("u1");
    expect(result.dateFrom).toBe("2026-03-01T00:00:00.000Z");
    expect(result.dateTo).toBeNull();
    expect(result.sortBy).toBe("newest");
  });

  test("sanitizeLlmIntent - falls back to defaults when arrays are invalid", () => {
    const defaults: ParsedSearchIntent = {
      keywords: ["docker", "error"],
      mustInclude: [],
      exclude: [],
      createdBy: "u2",
      dateFrom: "2026-03-01T00:00:00.000Z",
      dateTo: "2026-03-17T00:00:00.000Z",
      sortBy: "relevance",
    };

    const result = sanitizeLlmIntent(
      {
        keywords: "docker",
        sortBy: "invalid",
      } as any,
      defaults,
    );

    expect(result.keywords).toEqual(["docker", "error"]);
    expect(result.createdBy).toBe("u2");
    expect(result.dateFrom).toBe("2026-03-01T00:00:00.000Z");
    expect(result.dateTo).toBe("2026-03-17T00:00:00.000Z");
    expect(result.sortBy).toBe("relevance");
  });

  test("parseSearchIntentWithLlm - throws when api key missing", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(parseSearchIntentWithLlm("docker error")).rejects.toThrow(
      "OPENAI_API_KEY is not configured",
    );
  });

  test("parseSearchIntentWithLlm - retries once then succeeds", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.SEARCH_LLM_RETRY_COUNT = "1";

    const fetchMock = jest
      .spyOn(globalThis, "fetch" as any)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output_text:
            '{"keywords":["docker"],"mustInclude":[],"exclude":[],"createdBy":null,"dateFrom":null,"dateTo":null,"sortBy":"relevance"}',
        }),
      } as Response);

    const result = await parseSearchIntentWithLlm("docker error");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      keywords: ["docker"],
      sortBy: "relevance",
    });
  });

  test("parseSearchIntentWithLlm - fails on invalid json", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: "not-json" }),
    } as Response);

    await expect(parseSearchIntentWithLlm("docker error")).rejects.toThrow(
      "LLM returned invalid JSON",
    );
  });
});
