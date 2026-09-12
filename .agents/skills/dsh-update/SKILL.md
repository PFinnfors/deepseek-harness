---
name: dsh-update
description: 'Use when a new model or provider does not appear in the DeepSeek Harness, when a pinned third-party dependency needs bumping (for example @earendil-works/pi-ai so a newly released LLM provider catalog entry becomes available), or more generally when the task is "update the package / registry so something new shows up". Collects the update procedures for the DeepSeek Harness repository.'
---

# DeepSeek Harness Updates

This skill collects the concrete procedures for updating parts of the DeepSeek Harness so that newly released external facts — models, providers, packages — become available to the product. It is a growing bucket: add a section as a new update procedure is discovered. Keep each procedure exact and mechanical so a future agent can follow it without re-deriving it.

## Sync this fork with the official repository

Configure the official repository once:

```sh
git remote add upstream https://github.com/deepseek-ai/DeepSeek-Harness.git
git fetch upstream
```

For each update, start with a clean worktree and fetch `upstream`. Merge `upstream/master` into the fork branch. Resolve conflicts using `docs/fork-maintenance.md`: preserve the listed fork-owned policy, hook, and CI files, but review conflicting upstream runtime and security changes before discarding them.

After the merge, confirm that `package.json` has no hook `postinstall`, `fork-ci.yml` still handles pull requests and master pushes, and the upstream CI files remain manual-only placeholders. Run focused tests for changed runtime areas. Use upstream gate aggregates only when diagnosing upstream compatibility.

## General principle

The harness does not hardcode upstream catalogs. It reads them from a pinned third-party package at the version declared in that package's `package.json`. A newly released upstream entry is invisible until the dependency is bumped. Before hunting for a missing model or provider in harness source, check whether the entry is simply a newer version of the underlying catalog than the one pinned.

## Update a pinned LLM provider catalog (pi-ai)

The OpenRouter, DeepSeek, and sibling LLM catalogs come from `@earendil-works/pi-ai`. A model that appears on the provider but not in the harness is almost always a stale pi-ai pin.

1. Find the declared version:
   `grep pi-ai packages/llm/llm-pi-ai/package.json`
2. Find the latest published version:
   `npm view @earendil-works/pi-ai version`
3. Bump the range in `packages/llm/llm-pi-ai/package.json` (for example `"@earendil-works/pi-ai": "^0.85.1"`). Prefer the `^` minor under which the drift gates in `packages/llm/llm-pi-ai/src/catalog.ts` still compile; a pi-ai release that adds or removes fields fails those gates with the drifted key named, which is the intended signal — address it, do not silence it.
4. Regenerate the lockfile and install:
   `pnpm install --filter @deepseek-ai/dsh-llm-pi-ai`
5. Confirm the lockfile now pins the new version:
   `grep -n "earendil-works/pi-ai@" pnpm-lock.yaml`
6. Validate:
   `pnpm run typecheck`

The harness never refreshes a route's catalog at runtime — `packages/llm/llm-pi-ai/README.md` states "A route's catalog never refreshes itself". So the static pi-ai catalog is the source of truth; a bump is required, not an optional refresh.

## Verify an upstream model actually landed

The built-in OpenRouter catalog is a generated data file inside pi-ai's package. To confirm a specific model id is present in a given pi-ai version (for example, after a bump), download that version's tarball and inspect the data file:

```sh
cd /tmp && rm -rf pi && mkdir pi && cd pi
npm pack @earendil-works/pi-ai@<version> --silent
tar xzf earendil-works-pi-ai-<version>.tgz
grep -o '"id": *"[^"]*"' package/dist/providers/data/openrouter.json | grep -i '<model-substring>'
```

An empty match means the model is not in that version's static catalog, regardless of whether the provider already serves it.

## Scope of this skill

This file is ordinary guidance, not a checklist and not a contract. Follow the code, keep the specific procedure accurate, and add a new section rather than expanding an unrelated one when a different update procedure is discovered.