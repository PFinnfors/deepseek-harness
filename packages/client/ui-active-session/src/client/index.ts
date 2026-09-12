/**
 * Active-session sidebar browser, browser half. One registration fills the
 * shell's `sidebar.workspaces` hole — the whole browsing region — at a lower
 * slot priority than the shipped ui-workspace browser, shadowing that entry
 * while the shipper's other registrations (hero workspace picker, its
 * directory-flow holes, the UiWorkspace service) stay live. Sessions are
 * Active by default; the row menu toggles the state, and the view options add
 * the Filter by Active seat. Export discipline: packages/client/AGENTS.md.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces } from '@deepseek-ai/dsh-api-workspace-controller/client'
// Type-only: pulls the UiWorkspace service contract (startSession,
// pickDirectory) provided by ui-workspace; behavior crosses through the
// injected service, never a value import.
import type { UiWorkspace } from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { WorkspaceBrowserInjected } from './contract/slots.ts'
import { en, zh, type ActiveSessionKey } from './locales.ts'
import { WorkspaceBrowser } from './WorkspaceBrowser.tsx'

export type { WorkspaceBrowserInjected, WorkspaceBrowserProps } from './contract/slots.ts'
export type { ActiveSessionKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The sidebar Active-session browsing region copy (owned by this plugin). */
    uiActiveSession: ActiveSessionKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'uiActiveSession'

/**
 * Required services. The sidebar.workspaces target slot is declared by the
 * ui-sidebar apply, whose activation order relative to this one is NOT
 * constrained: apply therefore depends on the declaration through
 * `slots.inject()` instead of assuming order, exactly like the shipper.
 */
export const inject = [
  'slots', 'sessions', 'workspaces', 'uiWorkspace', 'locale',
]

/**
 * Register the browser once the sidebar declaration is on the ledger. The
 * inject factory returns plain callbacks; data reads use the framework's
 * global hooks (useSessions / useWorkspaces / useSessionPendingInteraction).
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const sessions = ctx.get('sessions') as ISessions
  const workspaces = ctx.get('workspaces') as IWorkspaces
  const uiWorkspace = ctx.get('uiWorkspace') as UiWorkspace
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-active-session: dictionaries')

  const injected = (): WorkspaceBrowserInjected => ({
    startSession: (workspaceId) => { uiWorkspace.startSession(workspaceId) },
    open: (sessionId) => { sessions.open(sessionId) },
    addWorkspace: () => {
      // Host picker: cancel returns null and leaves the region untouched.
      uiWorkspace.pickDirectory().then((path) => {
        if (path === null) return
        return workspaces.create({ path }).then((ws) => {
          uiWorkspace.startSession(ws.workspaceId)
        })
      }).catch(() => {
        // Non-fatal: the picker is host-side; keep the region usable.
      })
    },
    renameSession: async (sessionId, title) => {
      // Row → session-face hop: rename is a per-session verb.
      const session = sessions.binding(sessionId)?.session
      if (session === undefined) throw new Error(`unknown session "${sessionId}"`)
      const result = await session.rename(title)
      if (!result.ok) throw new Error(result.error.message)
    },
    forkSession: (sessionId) => {
      sessions.fork({ sessionId, increaseTitle: true })
        .then((childId) => { sessions.open(childId) })
        .catch(() => {
          // Fork or child-rename failure keeps the current selection.
        })
    },
    renameWorkspace: async (workspaceId, title) => { await workspaces.rename(workspaceId, title) },
    deleteWorkspace: async (workspaceId) => { await workspaces.delete(workspaceId) },
    archiveSession: (sessionId) => { void workspaces.archiveSession(sessionId) },
  })

  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register(
    {
      name: 'sidebar.workspaces',
      priority: -1,
      locale: NS,
      inject: injected,
    },
    WorkspaceBrowser,
  ))
}
