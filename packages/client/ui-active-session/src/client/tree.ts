/**
 * Pure derivation for the Active-session sidebar browser: session grouping by
 * Workspace, the flat recency list, per-folder overflow folding, the status
 * dot, and relative time. All functions are deterministic over their inputs —
 * the browser calls them from render with snapshot data and never mutates.
 */
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {
  SessionPendingInteractionBase,
} from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceBrowserProps } from './contract/slots.ts'

/** Group key for Sessions outside every Workspace. */
export const UNGROUPED_KEY = ''

/** Ordinary rows kept per open folder before the overflow control. */
export const COLLAPSED_LIMIT = 5

/** One workspace group section: header facts plus its visible session rows. */
export interface SessionGroup {
  /** Group key: the workspace id or {@link UNGROUPED_KEY}. */
  key: string
  /** Backing Workspace id; absent only for the ungrouped bucket. */
  workspaceId: WorkspaceId | undefined
  /** Display label; empty only for the ungrouped bucket (renderer localizes). */
  label: string
  /** Rows before the Active filter is applied; folder dimming reads this. */
  allSessions: SessionSummary[]
  /** Rows after the Active filter (the renderer additionally applies search). */
  sessions: SessionSummary[]
}

/** Pending interaction kinds with a dedicated status presentation. */
export type SessionPendingInteractionStatus = 'approval' | 'plan-review' | 'question'

/** Ordinary sessions are visible; among blank sessions, only the current one is visible. */
export function sessionVisible(
  session: SessionSummary,
  current: SessionId | undefined,
  archived: ReadonlySet<SessionId>,
): boolean {
  return session.origin !== 'subagent'
    && !archived.has(session.id)
    && (!session.blank || session.id === current)
}

/** Recency comparator: newest first, id as the deterministic tiebreak. */
function byRecency(a: SessionSummary, b: SessionSummary): number {
  if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt
  return a.id < b.id ? -1 : 1
}

/**
 * Group Sessions by Host Workspace: one group per entity in stable Host
 * order, members resolved from sessionIds in their stored order. Sessions
 * outside every Workspace trail under {@link UNGROUPED_KEY}. `orderBy`
 * selects per-group row order: member order ('manual') or recency
 * ('updated'), newest first.
 */
export function buildGroups(
  list: SessionListState,
  wsItems: readonly WorkspaceView[],
  archivedSet: ReadonlySet<SessionId>,
  orderBy: 'manual' | 'updated',
): SessionGroup[] {
  const groups: SessionGroup[] = []
  const accounted = new Set<SessionId>()
  for (const w of wsItems) {
    const members: SessionSummary[] = []
    for (const id of w.sessionIds) {
      const s = list.byId[id]
      if (s === undefined || accounted.has(id)) continue
      accounted.add(id)
      if (sessionVisible(s, list.current, archivedSet)) members.push(s)
    }
    if (orderBy === 'updated') members.sort(byRecency)
    groups.push({
      key: w.workspaceId, workspaceId: w.workspaceId, label: w.title,
      allSessions: members, sessions: members,
    })
  }
  const stray = list.ids
    .map(id => list.byId[id])
    .filter((s): s is SessionSummary =>
      s !== undefined && !accounted.has(s.id) && sessionVisible(s, list.current, archivedSet))
  if (stray.length > 0) {
    groups.push({
      key: UNGROUPED_KEY,
      workspaceId: undefined,
      label: '',
      allSessions: [...stray].sort(byRecency),
      sessions: [...stray].sort(byRecency),
    })
  }
  return groups
}

/** The flat "In one list" body: every session as a top-level row, strictly newest-first. */
export function flatRows(
  list: SessionListState,
  archivedSet: ReadonlySet<SessionId>,
): SessionSummary[] {
  return list.ids
    .map(id => list.byId[id])
    .filter((s): s is SessionSummary =>
      s !== undefined && sessionVisible(s, list.current, archivedSet))
    .sort(byRecency)
}

/**
 * First {@link COLLAPSED_LIMIT} ordinary rows plus every blank row; the rest
 * are counted for the Show-more control. Blank rows are exempt because the
 * selected New Session row must stay reachable regardless of folder size.
 */
export function collapsedRows(sessions: readonly SessionSummary[]): {
  rows: SessionSummary[]
  hiddenCount: number
} {
  let ordinaryCount = 0
  const rows = sessions.filter((s) => {
    if (s.blank) return true
    if (ordinaryCount >= COLLAPSED_LIMIT) return false
    ordinaryCount += 1
    return true
  })
  return { rows, hiddenCount: sessions.length - rows.length }
}

/** Status dot presentation: pending user interaction, running, or the done reminder. */
export function statusOf(
  s: SessionSummary,
  pendingMap: ReadonlyMap<SessionId, SessionPendingInteractionBase> | undefined,
  t: WorkspaceBrowserProps['t'],
): { dot: 'warn' | 'run' | 'done'; label: string } | undefined {
  const p = pendingMap?.get(s.id)
  if (p !== undefined) {
    const kind = p.kind as SessionPendingInteractionStatus
    if (kind === 'approval') return { dot: 'warn', label: t('status.waitingApproval') }
    if (kind === 'plan-review') return { dot: 'warn', label: t('status.planReview') }
    if (kind === 'question') return { dot: 'warn', label: t('status.waitingAnswer') }
  }
  if (s.running) return { dot: 'run', label: t('status.running') }
  if (s.completed === true) return { dot: 'done', label: t('status.completed') }
  return undefined
}

/** Localized compact relative time ("5min"/"5分钟" buckets; "now"/"刚刚" under a minute). */
export function relativeTimeLabel(
  updatedAt: number,
  now: number,
  t: WorkspaceBrowserProps['t'],
): string {
  const diff = now - updatedAt
  if (diff < 60 * 1000) return t('time.now')
  const mins = Math.floor(diff / (60 * 1000))
  if (mins < 60) return t('time.minutes', { n: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('time.hours', { n: hrs })
  const days = Math.floor(hrs / 24)
  if (days < 30) return t('time.days', { n: days })
  const months = Math.floor(days / 30)
  if (months < 12) return t('time.months', { n: months })
  return t('time.years', { n: Math.floor(months / 12) })
}
