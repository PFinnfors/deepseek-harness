# Agent Note: Web theme & background settings page

Status: implemented

English | [中文](2026-08-29-shipped-web-theme-background-settings.zh.md)

## Problem

The shipped Web app exposed theme choice as a preference row (`ui-theme`'s Appearance entry) and a build-time title, with no way to retheme the browser surface, paint a chat background, or override the sidebar brand from the UI. The `ui-theme` runtime already carried a documented `overrideTokens` layering seam (guarded to a package-pinned source for dynamic plugins), but nothing shipped a consumer for it, and the settings shell's `settings.section` seat had no Theme page.

## Decision

A new client plugin, `@deepseek-ai/dsh-client-ui-theme-background`, ships in the web-app bundle (`dsh.client` roster row) and occupies the settings shell's `settings.section` seat with a Theme page (`id: 'theme'`, ordered between General and Models). The page binds one transient observable source (`createThemeSettingsSource`) that persists to `localStorage`, and three apply-side effects subscribe to that source:

- `ctx.theme.overrideTokens('theme-background-settings', TOKYO_NIGHT)` while Tokyo Night is selected — one token layer with identical light/dark values over the shipped alias tokens;
- a package-owned stylesheet painting the center-column chat scrollport (`[data-conversation-scroll]`) with the picked background (downscaled WebP data URL) under a theme-aware base tint;
- a conditional `sidebar.brand.name` occupant that replaces the shipped fallback only while the title field is non-empty.

The plugin is browser presentation only: the node half is an empty Loader seat and nothing reaches a model request. The fork's `ui-theme` already provided `overrideTokens` (upstream `4064198560`), so no theme-runtime change was needed.

## Alternatives considered

- **Extend `ui-theme` instead of a new package**: rejected — the theme runtime owns the registry and its guarded override seam; a settings page and background layer are presentation and would have dragged copy, styles, and a settings occupant into the runtime package.
- **Persist through the settings framework instead of `localStorage`**: rejected — the source must also drive apply-side effects outside the render tree, where the framework-owned store instance is not reachable; a root-scoped observable with guarded `localStorage` write-through is the minimal shape that survives refresh and re-run.

## Consequences

- The shipped Web app gains a Theme settings page (None / Tokyo Night), a chat background control, and a custom sidebar brand title, all persisted per browser.
- The `web-app` bundle patch, its package manifest, the client tsconfig aggregate, and the slot catalog gained one row each; `docs/config-catalog.*` regenerated; settings-dialog goldens gained the Theme nav row.
- The package carries the same four `oxlint` findings as the reference original (byte-identical source), which are upstream-equal and out of scope here.