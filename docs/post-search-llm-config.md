# Post Search LLM Config

This document describes runtime configuration for LLM-assisted post search parsing.

## Required

- OPENAI_API_KEY
  - API key used by the LLM parser adapter.
  - If missing, search falls back to deterministic keyword parsing.

## Optional

- OPENAI_MODEL
  - Default: gpt-4o-mini
  - Model used for parsing free-text query into structured intent.

- SEARCH_LLM_TIMEOUT_MS
  - Default: 5000
  - Request timeout in milliseconds per LLM attempt.

- SEARCH_LLM_RETRY_COUNT
  - Default: 1
  - Number of retries after a failed LLM attempt.
  - Total attempts = retry count + 1.

- SEARCH_LLM_MAX_TOKENS
  - Default: 300
  - Max response tokens for parser output.

## Fallback Behavior

If any LLM call fails (missing key, timeout, network error, non-200 response, malformed JSON),
search continues with deterministic fallback parsing and sets response metadata:

- meta.fallbackUsed = true

## Security Notes

- LLM output is sanitized with strict allowlisted fields.
- Unknown properties and unsafe values are ignored.
- Backend query building remains deterministic and does not execute raw operators from LLM output.
