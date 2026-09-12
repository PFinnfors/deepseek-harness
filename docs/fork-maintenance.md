# Personal fork maintenance

This fork keeps DeepSeek Harness runtime code close to upstream. It removes team-specific process from routine development.

## Intentional divergences

### Agent policy

The root `AGENTS.md` is fork-owned. It asks agents to make focused changes and use focused validation. English-only fork documentation is acceptable.

Keep upstream architecture rules when they protect runtime behavior. Do not restore mandatory translation, Agent Notes, snapshots, labels, stacked pull requests, or exhaustive local gates.

### Git hooks

`package.json` exposes `pnpm run hooks:install` but does not run it through `postinstall`.

This prevents dependency installation from changing worktree Git configuration. The retained installer still installs upstream Lefthook jobs and the translation merge driver when invoked explicitly.

Run `pnpm run hooks:uninstall` to remove DSH-owned hooks and translation merge-driver settings from the current worktree. The command refuses custom hook paths and unowned hook directories. It leaves Git worktree configuration enabled because other worktree settings can use it.

Do not run `pnpm run hooks:install` during routine fork setup. Running `pnpm install` neither installs nor removes hooks.

### GitHub Actions

`.github/workflows/fork-ci.yml` is the fork-owned workflow. It runs install, typecheck, and unit tests on pull requests and master pushes.

`.github/workflows/ci.yml` and `.github/workflows/ci-master.yml` are disabled placeholders. Their upstream versions use large gate matrices, DeepSeek runner configuration, and team process checks.

The documentation deployment workflow stays manual. It can remain unused unless this fork publishes the upstream documentation website.

### Documentation gates

Upstream gate implementations remain intact under `scripts/`. This limits merge conflicts and preserves access to upstream validation when needed.

Routine fork work does not run `doc-sync`. Existing official documentation remains bilingual and upstream-owned. Add a personal plugin README to `scripts/translation-pairing.manifest.json` only if an explicitly selected upstream gate needs the exclusion.

## Updating from upstream

Treat these files as fork-owned merge points:

- `AGENTS.md`
- `package.json`, specifically the hook installation script
- `.github/workflows/fork-ci.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/ci-master.yml`
- `docs/fork-maintenance.md`

When an upstream merge conflicts in these files:

1. Keep the fork policy and small CI workflow.
2. Review upstream runtime or security changes in the conflicting content.
3. Port only changes that this fork needs.
4. Keep hook installation explicit rather than automatic.
5. Keep upstream-only workflows disabled.
6. Update this page when the divergence changes.

After an upstream merge, check that `package.json` has no automatic hook `postinstall`. Check that `fork-ci.yml` still handles pull requests and master pushes. Check that the two upstream CI files remain manual-only placeholders.

Use focused tests for merged runtime areas. Run an upstream aggregate only when diagnosing compatibility with upstream.

The upstream `scripts/ci-workflow.spec.ts` test intentionally fails against the disabled placeholder workflows. Treat those failures as expected unless this fork restores the upstream CI contract.
