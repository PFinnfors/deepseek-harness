# Agent Note: Shipped LSP code navigation from the dsh CLI

Status: implemented

English | [中文](2026-08-29-shipped-lsp-code-navigation.zh.md)

## Problem

The LSP capability seam ([2026-07-15-lsp-capability-seam](2026-07-15-lsp-capability-seam.md)) shipped as three packages — `dsh-lsp`, `dsh-lsp-stdio`, `dsh-tool-lsp` — but the `dsh` app's dependency closure did not include them. A deployment that mounted the seam through a `cordis.yml` overlay could not resolve those named plugins, so semantic code navigation was not usable from the shipped CLI even though the seam, the generic stdio host, and the model-facing tool all existed.

## Decision

The `dsh` app (`apps/cli`) gains `@deepseek-ai/dsh-lsp`, `@deepseek-ai/dsh-lsp-stdio`, and `@deepseek-ai/dsh-tool-lsp` in its dependencies, making the shipped seam resolvable from the CLI. Two default-off example overlays ship under `apps/cli/config/examples/lsp/`, each mounting the seam as its own plugin instance:

- `lsp-python.cordis.yml` mounts the trio with one server (`python`, command `pyright-langserver`, `args: ['--stdio']`, `.py` → `python`).
- `lsp-gdscript.cordis.yml` mounts the trio with one server (`gdscript`, command `godot`, `args: ['--lsp']`, `.gd` → `gdscript`), targeting Godot's native stdio language server added in Godot 4.4+/4.6-dev.

The Python and GDScript servers are prerequisites on PATH that a deployment must install; this machine has `pyright` but not a `godot` binary carrying `--lsp`. `dsh-lsp-stdio` resolves every configured server executable at load before registering any provider, so a missing executable makes that overlay's plugin instance register nothing and fail loudly. Because each overlay is an independent `dsh-lsp-stdio` instance, a missing `pyright` or `godot` does not block the other overlay. Activation is opt-in (`dsh web --patch apps/cli/config/examples/lsp/lsp-*.cordis.yml`).

## Alternatives considered

- **One combined overlay listing Python and GDScript servers in a single `dsh-lsp-stdio` instance**: rejected — that host resolves every configured executable at load, so a machine missing `godot` or `pyright` would fail the entire instance and break the language that is installed.
- **Autodetect installed servers**: rejected — the generic host is explicitly not a language-server catalog or installer; deployments configure commands and mappings on purpose, and silent degradation contradicts the fail-loud rule for a missing configured server.
- **Wire into a shipped base-bundle profile**: rejected — LSP is an optional capability; defaulting it onto every profile would require a bundled server and contradict the opt-in overlay pattern the seam documents.

## Consequences

- The `dsh` app dependency closure is wider by three packages, so an explicit overlay mounting the seam resolves through the shipped `cordis-plugin-loader`.
- Each language ships as a separate overlay, so a missing server on a deployment fails only that language; the other overlay activates independently.
- Semantic navigation (`goToDefinition`, `findReferences`, `goToImplementation`, `hover`) is available to the agent when a deployment opt-ins and installs a server; without an installed server the overlay fails loudly rather than silently returning no results.
- Godot's native `--lsp` stdio mode is experimental and does not redirect print output to stderr, so server logs can interleave on stdout; a stricter client may reject it and the overlay documents a stdio-to-TCP bridge (`godot-lsp-stdio-bridge`) as the reported fallback.
