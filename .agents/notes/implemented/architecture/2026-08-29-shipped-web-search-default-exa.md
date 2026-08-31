# Agent Note: Shipped web search defaults to Exa

Status: implemented

English | [中文](2026-08-29-shipped-web-search-default-exa.zh.md)

## Problem

The base bundle pinned the shipped `web_search` to DeepSeek's native search (`searchProvider: deepseek-official` on the `web` row, mounting `web-search-deepseek` with `apiKeyEnv: DEEPSEEK_API_KEY`). Every model search then cost a full auxiliary Messages round trip with server-side retrieval — latency and tokens on every query — and the tool row had to override `searchTimeoutMs` to 60s to fit that round trip. The search capability also inherited the chat credential (`DEEPSEEK_API_KEY`), so a deployment could not run the model and pick a lighter search backend without config surgery. The web capability seam ([2026-06-24-web-capability-seam](2026-06-24-web-capability-seam.md)) deliberately keeps providers swappable, so no contract forced this choice; the shipped default did.

## Decision

The base bundle now pins `searchProvider: exa` and mounts `web-search-exa` on every dsh profile. Exa answers in a single HTTP round trip with portable snippets and publication dates, so the provider-neutral 30s tool budget applies and the DeepSeek-specific `searchTimeoutMs: 60000` override is removed — from the shipped `tool-web` row and from the Web app's `standard`, `ptc`, and `cordis` agent presets, which carried that tuning for the DeepSeek round trip. `web-search-exa` resolves its key from `$EXA_API_KEY` in the launching environment; a deployment that wants another backend swaps `searchProvider` and mounts that provider instead, exactly as any other search backend overlays the seam.

DeepSeek search stays a shipped provider, not a default. The `dsh` app (`apps/cli`) keeps `@deepseek-ai/dsh-web-search-deepseek` in its dependency closure so an explicitly mounted row resolves, and the web e2e DeepSeek search scenario pins `web` back to `searchProvider: deepseek-official` through the scaffold and drives the real provider against a deterministic local Messages double — preserving the shipped DeepSeek path's model-visible and durable coverage.

## Alternatives considered

- **Keep DeepSeek native search as the shipped default**: rejected — it forces a model round trip, an auxiliary request on the session event vocabulary, and a 60s tool budget on every search of every default deployment, with no provider-neutral schema, model-visible, or durable benefit over a single-request backend.
- **Auto-select instead of pinning (`searchProvider: exa`)**: rejected — pinning matches the seam's explicit-resolution rule; auto-select only wins when exactly one usable provider registers, so a deployment that mounts a second backend would go `WEB_PROVIDER_AMBIGUOUS` by default with no documented first choice.
- **Delete the DeepSeek provider from the shipped surface**: rejected beyond the default — it is a real product capability with its own settings card and an e2e proving the complete path; the change is a default, not a removal.

## Consequences

- Every shipped profile answers `web_search` with one HTTP call instead of one model turn, and the tool falls back to the provider-neutral 30s budget.
- The search capability decouples from the chat credential: `$EXA_API_KEY` is its own launch-environment key, so the model provider and the search backend can differ.
- The `dsh` app dependency closure gains `@deepseek-ai/dsh-web-search-deepseek` (it was previously reachable only through `dsh-base`), keeping the DeepSeek provider resolvable for explicit mounts and the web e2e DeepSeek scenario.
- The shipped `web-search-deepseek` settings card remains the DeepSeek provider's configure surface; it is inert unless a deployment mounts that provider.
