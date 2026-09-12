---
description: "Sidebar session browser for the dsh web client: sessions are Active by default, the row menu toggles a session active/inactive with dimmed inactive rows and folders, and the view options gain a Filter by Active seat that hides folders holding only inactive sessions."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-active-session

## Summary

`dsh-client-ui-active-session` is the web sidebar session browser: its browser half registers one component into the ui-sidebar-declared `sidebar.workspaces` hole at a lower slot priority than the shipped ui-workspace browser, shadowing that entry while the shipper's other registrations (the hero workspace picker and the `uiWorkspace` service) stay live. The browser adds an Active state to plain session browsing: every session is Active by default, the session-row context menu's leading entry toggles Active/Inactive, and inactive sessions — plus folders whose sessions are all inactive — render dimmed through the theme's `label-dimmed` alias. The view options menu gains a Filter by Active section that hides Workspaces holding only inactive sessions.

Its host half is empty on purpose: the plugin is pure UI, and the Active set is browser-local view state that resets with the browser.

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

The browser works like the shipped region it shadows: one folder per Host Workspace, a localized Ungrouped bucket for loose sessions, relative timestamps, the status dot, and Group by / Order by view options. On top of that:

- **Active by default** — every session starts Active; nothing is dimmed until the user toggles it.
- **Toggle Active** — the ellipsis menu on a session row leads with a `Toggle Active` entry; selecting it flips that session's Active state. The menu's leading row carries a check while the session is Active.
- **Dimmed styling** — an inactive session's row and title use the theme's `label-dimmed` alias; a folder dims only when every visible session inside it is inactive.
- **Filter by Active** — the view options gain a Filter by section (All sessions / Active sessions). Under Active, sessions that are inactive hide, and a Workspace whose sessions are all inactive disappears entirely; empty Workspaces also hide, while the All view keeps them.
- **Folder collapse** — clicking a folder collapses it completely (zero session rows) no matter how many sessions it holds; inside an open folder, long lists fold to five ordinary rows with a Show-more control, and blank New Session rows are exempt so the provisional row never hides.

### Theme fit

The region renders exclusively through the shared `--dsw-alias-*` semantic tokens and the `--ds-ease-in-out` motion token, so the active UI-theme plugin (Tokyo Night, etc.) owns every color. Dimmed states reuse the theme's own `label-dimmed` alias rather than a fixed palette.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package is one ownership rule: the Active state is a property of the *view*, not of the Session log or the Workspace registry, so it lives as component-local state in the browser and resets on remount. Nothing model-visible or durable changes.

### Slot shadowing

The ui-sidebar `sidebar.workspaces` hole is a `single` slot, so exactly one entry renders: the lowest `priority` wins. ui-workspace registers its browser at the default `0`; this plugin registers at `-1`, shadowing the shipped region while ui-workspace's own apply keeps providing the `uiWorkspace` service, the `useWorkspaces` root hook, and the conversation hero picker. The shadow is intentional product behavior (the Active browser replaces the shipped one in the sidebar), not a composition conflict.

### Copy and locale

All copy is bilingual and owned by this package: it registers zh/en dictionaries under the `uiActiveSession` namespace of `dsh-client-locale` and declares that namespace on its slot registration, so the framework synthesizes the typed `t` seat. The shared common vocabulary (`cancel`, `close`, ...) still resolves through the lookup chain. The `workspace` namespace stays owned by ui-workspace.

### State derivation

The pure derivation in `tree.ts` (grouping, flat list, overflow folding, status dot, relative time) is deterministic over snapshot inputs; the component feeds it the `useSessions` / `useWorkspaces` / `useSessionPendingInteraction` global hooks and applies its own Active filter on top. The two bis of folder state (open/closed vs show-all) are separate sets: collapsing a folder also resets its show-all bit so reopening starts at the first-five state.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

These pages cover the sidebar seat, the browser being shadowed, and the workspace model.

- [ui-sidebar](../ui-sidebar/README.md) — the shell sidebar owning the `sidebar.workspaces` hole.
- [ui-workspace](../ui-workspace/README.md) — the shipped browser this plugin shadows (and the `uiWorkspace` service it consumes).
- [api-workspace-controller](../../api/workspace-controller/README.md) — the Client Workspace model behind the browser.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package is a browser-side UI plugin layer that registers nothing model-facing.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define the Active state's lifetime and scope; they are current package constraints.

- **The Active set is view-local** — it resets when the browser remounts (a full page reload, or any unload of the sidebar region, restores every session to Active). Persisting it would be an explicit future choice: the state is product-visible but arguably session-scoped, and there is no existing store for it.
- **Filter-by-Active hides content, never archives** — inactive sessions remain in the registry and under the All view; the filter is a viewing affordance only.
- **No directory-flow hole** — unlike the shipped browser, this region has no "Add workspace via in-app browser" child slot; adding a workspace uses the host picker route (`pickDirectory → create → startSession`).

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Keep the `uiActiveSession` namespace self-contained: it must own every key the component reads (plus the common vocabulary), because the seat types to the namespace's dictionary union and the `workspace` namespace is not this package's to reuse.

</details>