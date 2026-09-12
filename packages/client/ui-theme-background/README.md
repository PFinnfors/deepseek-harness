---
description: "Custom theme & background settings section: None/Tokyo Night token override, a center-column chat background image, and a brand-title override; for users and maintainers mounting the roster row."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-theme-background

## Summary

This package contributes a Theme page to Settings with three independent controls: a brand title field that overrides the sidebar "DSH Local Build" text while non-empty, a theme picker (None / Tokyo Night) that stacks a tokyonight token layer over the shipped theme in both light and dark modes, and a background image that fills the center-column chat area behind the transcript at low opacity. All three choices persist in `localStorage`, so they survive a page refresh and a plugin re-run. The package contributes browser presentation only and adds nothing to model requests.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this plugin in the browser roster of a deployment (a `dsh.client` row), so the Settings shell renders the Theme section. The section registers beside the shipped settings pages with its own nav entry; the background and title effects apply to the center column and sidebar of the shell that declares those seams.

### Choosing a theme

None leaves the shipped light/dark/system behavior exactly as if the plugin were absent. Tokyo Night stacks a single token override layer (all 13 DSH alias tokens mapped to the folke tokyonight `night` palette) with identical light and dark values, so it wins regardless of the appearance preference.

### Setting a background

Set background / Update background picks an image file and stores it as a downscaled WebP data URL in `localStorage`; Clear background removes it. The image is painted on the chat scrollport seam (`[data-conversation-scroll]`), scaled `cover` under a theme-aware base tint — it never reaches the sidebar, and it stays independent of the theme picker.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The browser half creates one transient observable source (`createThemeSettingsSource`) that both occupants share and that persists to `localStorage`. Apply-side effects subscribe to it: the token override (`ctx.theme.overrideTokens`), the chat-background stylesheet (a package-owned `<style>` tag with `data-plugin` attributes), and the conditional `sidebar.brand.name` occupant, which is registered only while the title field is non-empty so the shipped fallback stays intact on empty. The settings page registers into `settings.section` with a locale-following nav label; the node half is an empty Loader seat.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the theme or layout surface is not enough. They move from the slots this package occupies to the shells that render them.

- [ui-settings](../ui-settings/README.md) — declares `settings.section` and renders the settings panel.
- [ui-sidebar](../ui-sidebar/README.md) — declares `sidebar.brand.name` and renders its fallback.
- [ui-theme](../ui-theme/README.md) — owns the `--dsw-*` token registry the override stacks onto.
- [ui-conversation](../ui-conversation/README.md) — owns the `data-conversation-scroll` chat scrollport the background paints.
- [Web client architecture](../../../.agents/notes/implemented/architecture/2026-07-19-gui-web-client-architecture.md) — how browser plugin rows load and register slots.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package contributes browser presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define how the panel supplies its controls. They are current package constraints, not a feature backlog.

- **The theme list is fixed** — None and Tokyo Night are the only choices; adding, editing, or managing themes is deliberately out of scope.
- **Persistence is per-browser** — choices live in this browser's `localStorage`, not in a deployment settings document.
- **The title overrides the sidebar brand only** — the browser document title is a build-environment concern (`DSH_CLIENT_TITLE`) outside the slot system.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>