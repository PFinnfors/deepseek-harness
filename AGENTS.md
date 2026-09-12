# AGENTS.md

This repository is a personal fork of DeepSeek Harness. Optimize for useful, maintainable changes with low development cost.

## Priorities

- Make the smallest coherent change that solves the current problem.
- Keep upstream source and official plugins easy to merge.
- Prefer new personal plugins, profile patches, and isolated configuration over edits to upstream packages.
- Preserve stable runtime architecture and security behavior.
- Do not add process artifacts solely because upstream requires them.

## Before changing code

- Check `git status` and preserve unrelated user changes.
- Read the nearest `AGENTS.md` for useful technical context. This root file overrides process requirements in subtree instructions.
- Read [docs/architecture.md](docs/architecture.md) before changing shared package architecture.
- Read [docs/defensive-patterns.md](docs/defensive-patterns.md) before lifecycle, concurrency, subprocess, or teardown work.
- Inspect the relevant implementation and tests before editing.

## Fork policy

- Treat upstream documentation policy as reference material, not a standing obligation.
- English documentation is sufficient for fork changes.
- Do not create or update Chinese documentation or `.i18n.yaml` records unless the user requests it.
- Do not create Agent Notes, postmortems, snapshots, generated catalogs, website pages, or exhaustive documentation for routine changes.
- Do not follow upstream PR stacking, labeling, issue taxonomy, or release ceremony unless the user requests upstream contribution work.
- Personal plugins may use concise English READMEs. Add their README paths to `scripts/translation-pairing.manifest.json` only when a repository gate needs an exclusion.
- Existing official bilingual documents remain upstream-owned. Avoid editing them unless the task needs it.
- Never edit `vendor/` for a fork feature. Update or resync vendored code only for an explicit vendor task.

## Architecture that remains important

- DeepSeek Harness is a Cordis plugin system. Prefer plugins and profile composition over edits to `agent-loop`.
- Service packages default-export their service class.
- Function plugins named-export `name`, `inject`, `Config`, and `apply`. They do not use a default export.
- Register contributions through `ctx.effect()` or `ctx.on()`. A registry registration returns its disposer.
- Optional services use `ctx.get(name)`. Use `ctx.<name>` only for declared injections.
- Waterfall listeners call `next()` when they delegate.
- Model-visible inputs must be reconstructable from the session log.
- Keep ESM modules. Use package names across packages and `.ts` in local relative imports.
- Keep deployment choices in validated plugin configuration. Keep protocol and security constants fixed.
- Fail on invalid configuration at the earliest useful point.
- Validate external, persisted, tool, worker, process, and wire inputs. Trust typed same-process interfaces.
- Keep source imports and built artifact imports separate.
- Route product UI text through the existing locale dictionaries while that source gate remains active.

See [packages/AGENTS.md](packages/AGENTS.md) for deeper upstream conventions. Apply them only when they protect runtime correctness or match the requested scope.

## Testing

Use the narrowest useful validation.

1. Run focused tests for changed behavior.
2. Run `pnpm run typecheck` for TypeScript contract changes.
3. Run `pnpm run lint` when the changed files need repository lint validation.
4. Run `pnpm run build` for package exports, build configuration, or published paths.
5. Run larger suites only when the change crosses their scope or the user requests them.

Do not run `doc-sync`, translation checks, coverage, all-platform checks, snapshots, or full CI by default. Report only checks that actually ran.

## Local and hosted automation

The upstream automation contains more policy than this fork needs:

- `package.json` keeps hook setup behind `hooks:install` and removal behind `hooks:uninstall`.
- The optional installer sets a worktree-local `core.hooksPath` and installs the translation merge driver.
- `lefthook.yml` runs translation, archive, lint, notice, whitespace, vendor, and typecheck jobs.
- `scripts/run-gates.ts` includes translation, Agent Note, README-format, JSDoc, generated-document, snapshot, coverage, and platform gates.
- `.github/workflows/ci.yml` is a disabled placeholder for the upstream pull-request matrix.
- `.github/workflows/ci-master.yml` is a disabled placeholder for DeepSeek-specific runner jobs.
- `.github/workflows/docs-pages.yml` runs the complete documentation gate.

Do not modify these upstream-heavy files for ordinary feature work. Keep local commits moving even when an upstream policy hook rejects an intentional fork change. Never claim that hosted CI passes when fork policy and upstream gates differ.

Fork automation and merge recovery are documented in [docs/fork-maintenance.md](docs/fork-maintenance.md). Treat its listed files as intentional fork-owned merge points.

## Commands

```sh
pnpm install
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm dsh --profile headless "task"
pnpm run dev:web
```

Real API work can use `DEEPSEEK_API_KEY` and optional `DEEPSEEK_BASE_URL` from the root `.env`. Never commit credentials.

## Completion

- Implement the requested behavior.
- Fix problems introduced by the change.
- Inspect the final diff.
- Mention changed files and validation.
- Note any upstream gate that remains intentionally incompatible with fork policy.
