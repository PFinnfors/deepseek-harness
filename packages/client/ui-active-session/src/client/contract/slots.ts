/**
 * ui-active-session contracts. One registration shares this package:
 *
 * WorkspaceBrowser fills the sidebar shell's `sidebar.workspaces` hole — the
 * whole browsing region (section header, search, grouped/flat session list,
 * workspace dialogs). It shadows the shipped ui-workspace browser at a lower
 * slot priority while keeping that package's other registrations, and it
 * additionally owns the Active state (per-session toggle, dimmed inactive
 * rows/folders, Filter by Active view) that plain session browsing has no
 * seat for.
 *
 * The registration is deliberately self-contained: it declares no
 * directory-flow child hole and reads Workspace membership from the shared
 * Workspace service, so adding a workspace uses the same
 * `pickDirectory → create → startSession` route as the shipped browser.
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pull the owner SlotMap merge and the GlobalStandardProps hook
// merges (useSessions/useSessionPendingInteraction from ui-session,
// useWorkspaces from ui-workspace) into programs that resolve the runtime
// share below.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/**
 * Browser-private injected share (arrives via the register inject factory).
 * Data reads use the global framework hooks; these are the Host actions the
 * browsing region drives.
 */
export type WorkspaceBrowserInjected = {
  /** Start a New Session in a Workspace (reuse-or-create its blank session). */
  startSession: (workspaceId: WorkspaceId) => void
  /** Open a real Session. */
  open: (sessionId: SessionId) => void
  /** Start the host directory-picker flow and adopt the picked path as a new Workspace. */
  addWorkspace: () => void
  /** Rename a Session (resolves on host acceptance; rejects with the wire message). */
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
  /** Fork a Session at its last completed turn and open the child. */
  forkSession: (sessionId: SessionId) => void
  /** Rename a Host Workspace (rejects on name conflict; resolves on durability). */
  renameWorkspace: (workspaceId: WorkspaceId, title: string) => Promise<void>
  /** Delete only a Host Workspace registration; directory and Session logs remain. */
  deleteWorkspace: (workspaceId: WorkspaceId) => Promise<void>
  /** Archive a Session into the registry-global set: hidden from grouping surfaces. */
  archiveSession: (sessionId: SessionId) => void
}

/** Full browser props: shell owner share + injected actions + the locale seat. */
export type WorkspaceBrowserProps =
  PropsRuntime<'sidebar.workspaces'>
  & WorkspaceBrowserInjected
  & PropsLocale<'uiActiveSession'>
