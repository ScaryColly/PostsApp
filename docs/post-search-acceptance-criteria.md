# Post Free-Text Search - Acceptance Criteria

## Scope

This document defines acceptance criteria for a new API endpoint that searches posts using free-text input, with LLM-assisted parsing and deterministic backend query execution.

The goal is to make behavior unambiguous before writing tests or implementation.

## Endpoint (Proposed)

- Method: `POST`
- Path: `/posts/search`

## Definitions

- Free-text query: The raw text entered by the user.
- Parsed intent: Structured interpretation returned by the LLM service.
- Deterministic query: MongoDB filter/sort built by backend rules only (never direct LLM operators).
- Fallback mode: Keyword-only search path used when LLM parsing fails or times out.

## Functional Acceptance Criteria

### AC-1 Basic search request succeeds

- Given a valid request body with a non-empty `query`
- When calling `POST /posts/search`
- Then response status is `200`
- And response body contains:
  - `items` (array)
  - `page` (number)
  - `limit` (number)
  - `total` (number)
  - `hasMore` (boolean)
  - `meta` object with `fallbackUsed` (boolean)

### AC-2 Empty query is rejected

- Given request body has missing, empty, or whitespace-only `query`
- When calling `POST /posts/search`
- Then response status is `400`
- And response body includes a clear validation error

### AC-3 Pagination defaults are applied

- Given request body omits `page` and `limit`
- When calling `POST /posts/search`
- Then backend applies default values
- And response includes these default values

### AC-4 Pagination boundaries are enforced

- Given request body includes out-of-range pagination values
- When calling `POST /posts/search`
- Then backend clamps/rejects values according to API contract
- And does not allow unbounded result size

### AC-5 LLM output is schema-validated

- Given LLM returns parsed intent
- When parsed intent contains unknown fields or invalid types
- Then backend does not use those fields in DB query
- And request either continues with sanitized intent or returns controlled error per contract

### AC-6 Query execution is deterministic and safe

- Given any parsed intent
- When backend builds Mongo query
- Then only allowlisted filters/sort options are used
- And no raw Mongo operators from LLM output are executed

### AC-7 Fallback behavior on LLM failure

- Given LLM service fails, times out, or returns malformed JSON
- When calling `POST /posts/search`
- Then backend still returns `200` using fallback keyword search
- And `meta.fallbackUsed` is `true`

### AC-8 Filter by creator (if provided)

- Given parsed intent or explicit filter includes `createdBy`
- When search is executed
- Then only posts from that creator are returned

### AC-9 Date filtering (if provided)

- Given parsed intent includes `dateFrom` and/or `dateTo`
- When search is executed
- Then results respect the date range boundaries

### AC-10 Exclusion terms are respected

- Given parsed intent includes exclusion terms
- When search is executed
- Then items containing exclusion terms in searchable fields are not returned

### AC-11 Sorting behavior is predictable

- Given sort mode is `relevance`
- When search is executed
- Then results are sorted by relevance strategy
- And tie-breaking is deterministic
- Given sort mode is `newest`
- Then results are sorted by creation date descending

### AC-12 Response contract stability

- Given success path with or without results
- When calling `POST /posts/search`
- Then response schema remains stable and includes all required top-level fields
- And empty search results return `items: []` with `200`

### AC-13 Error handling is controlled

- Given unexpected internal error outside normal fallback path
- When calling `POST /posts/search`
- Then response status is `500`
- And error message does not leak internal details

### AC-14 Existing post APIs remain unaffected

- Given existing endpoints under `/posts`
- When new search endpoint is added
- Then existing tests for create/get/update/delete/like flows continue to pass unchanged

## Non-Functional Acceptance Criteria

### NFR-1 Performance guardrail

- Under normal conditions, median endpoint latency meets agreed target (to be defined before release).
- Timeout is configured for LLM call.

### NFR-2 Observability

- Search request logs include correlation id, fallback flag, and timing metrics.
- Logs do not expose secrets or sensitive payloads.

### NFR-3 Reliability

- LLM transient failures do not break endpoint availability due to fallback mode.

### NFR-4 Security

- User input is treated as untrusted.
- Prompt-injection text is not executed as backend instruction.
- Query builder enforces allowlist and safe defaults.

## Out of Scope (Initial Version)

- Semantic vector retrieval.
- Multi-language ranking optimization.
- Personalized ranking by user behavior.

## Exit Criteria for Step 1

Step 1 is complete when:

- Acceptance criteria are reviewed and approved.
- Criteria are specific enough to derive test cases without ambiguity.
- No implementation code has been added yet.

## Step 2 Reference

- API contract for implementation and testing is defined in `docs/post-search-api-contract.md`.
