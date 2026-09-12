import { describe, expect, it } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { zh } from '../src/client/locales.ts'
import {
  COLLAPSED_LIMIT,
  UNGROUPED_KEY,
  buildGroups,
  collapsedRows,
  flatRows,
  relativeTimeLabel,
  statusOf,
} from '../src/client/tree.ts'

const t = makeTranslate(zh, commonZh)
const sid = (id: string) => id as SessionId
const wid = (id: string) => id as WorkspaceId
const summary = (id: string, updatedAt: number, overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: sid(id), displayTitle: id, running: false, blank: false, updatedAt, ...overrides,
})
const state = (items: readonly SessionSummary[], overrides: Partial<SessionListState> = {}): SessionListState => ({
  ids: items.map(item => item.id),
  byId: Object.fromEntries(items.map(item => [item.id, item])),
  current: undefined,
  phase: 'ready',
  subagentsByParent: {}, jobsBySession: {},
  currentAddress: undefined,
  ...overrides,
})
const workspace = (id: string, sessionIds: string[], title = id): WorkspaceView => ({
  workspaceId: wid(id), path: `/projects/${id}`, title,
  sessionIds: sessionIds.map(sid), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
})
const archived = (ids: readonly string[]): Set<SessionId> => new Set(ids.map(sid))

describe('buildGroups', () => {
  it('groups by workspace in Host order with stored membership order', () => {
    const list = state([summary('a1', 1), summary('b1', 2), summary('a2', 3)])
    const groups = buildGroups(list, [
      workspace('alpha', ['a1', 'a2']),
      workspace('beta', ['b1']),
    ], new Set(), 'manual')
    expect(groups.map(g => g.key)).toEqual(['alpha', 'beta'])
    expect(groups[0]!.sessions.map(s => s.id)).toEqual([sid('a1'), sid('a2')])
    expect(groups[0]!.workspaceId).toBe('alpha')
    expect(groups[0]!.label).toBe('alpha')
  })

  it('sorts members by recency newest-first when orderBy is updated', () => {
    const list = state([summary('old', 1), summary('new', 9)])
    const groups = buildGroups(list, [workspace('ws', ['old', 'new'])], new Set(), 'updated')
    expect(groups[0]!.sessions.map(s => s.id)).toEqual([sid('new'), sid('old')])
  })

  it('trails ungrouped sessions under the UNGROUPED bucket, recency-sorted', () => {
    const list = state([summary('in-ws', 1), summary('loose', 5), summary('loose-2', 3)])
    const groups = buildGroups(list, [workspace('ws', ['in-ws'])], new Set(), 'updated')
    expect(groups.map(g => g.key)).toEqual(['ws', UNGROUPED_KEY])
    const ungrouped = groups[1]!
    expect(ungrouped.workspaceId).toBeUndefined()
    expect(ungrouped.label).toBe('')
    expect(ungrouped.sessions.map(s => s.id)).toEqual([sid('loose'), sid('loose-2')])
  })

  it('excludes archived, subagent-origin sessions and blank rows other than the current one', () => {
    const blank = summary('blank', 1, { blank: true })
    const list = state([
      summary('archived-s', 1),
      summary('sub', 2, { origin: 'subagent' }),
      blank,
      summary('current-blank', 3, { blank: true }),
    ], { current: sid('current-blank') })
    const groups = buildGroups(list, [workspace('ws', ['archived-s', 'sub', 'blank', 'current-blank'])], archived(['archived-s']), 'manual')
    expect(groups[0]!.sessions.map(s => s.id)).toEqual([sid('current-blank')])
  })

  it('skips ids absent from the list snapshot and deduplicates across workspaces', () => {
    const list = state([summary('doubled', 1)])
    const groups = buildGroups(list, [
      workspace('first', ['missing', 'doubled']),
      workspace('second', ['doubled']),
    ], new Set(), 'manual')
    expect(groups.map(g => g.key)).toEqual(['first', 'second'])
    expect(groups[0]!.sessions.map(s => s.id)).toEqual([sid('doubled')])
    expect(groups[1]!.sessions).toEqual([])
  })

  it('emits no ungrouped bucket when every session is accounted for', () => {
    const list = state([summary('a1', 1)])
    const groups = buildGroups(list, [workspace('alpha', ['a1'])], new Set(), 'manual')
    expect(groups).toHaveLength(1)
  })
})

describe('flatRows', () => {
  it('lists every visible session strictly newest-first', () => {
    const list = state([summary('older', 1), summary('newer', 5), summary('mid', 3)])
    expect(flatRows(list, new Set()).map(s => s.id)).toEqual([sid('newer'), sid('mid'), sid('older')])
  })

  it('honors the visibility rules (archived/subagent/blank-except-current)', () => {
    const list = state([
      summary('archived-s', 1),
      summary('sub', 2, { origin: 'subagent' }),
      summary('blank', 3, { blank: true }),
      summary('current-blank', 4, { blank: true }),
    ], { current: sid('current-blank') })
    expect(flatRows(list, archived(['archived-s'])).map(s => s.id)).toEqual([sid('current-blank')])
  })
})

describe('collapsedRows', () => {
  it('keeps only COLLAPSED_LIMIT ordinary rows and counts the overflow', () => {
    const sessions = Array.from({ length: COLLAPSED_LIMIT + 3 }, (_, i) => summary(`s${i}`, i))
    const { rows, hiddenCount } = collapsedRows(sessions)
    expect(rows).toHaveLength(COLLAPSED_LIMIT)
    expect(hiddenCount).toBe(3)
  })

  it('exempts blank rows from the cap and never hides them', () => {
    const sessions = [
      ...Array.from({ length: COLLAPSED_LIMIT + 2 }, (_, i) => summary(`s${i}`, i)),
      summary('blank-a', 1, { blank: true }),
      summary('blank-b', 2, { blank: true }),
    ]
    const { rows, hiddenCount } = collapsedRows(sessions)
    expect(rows.filter(s => s.blank)).toHaveLength(2)
    expect(rows).toHaveLength(COLLAPSED_LIMIT + 2)
    expect(hiddenCount).toBe(2)
  })
})

describe('statusOf', () => {
  const interactions = new Map<SessionId, { key: string; kind: string; sessionId: SessionId }>()

  it('maps pending kinds to warning labels', () => {
    for (const [kind, label] of [
      ['approval', '等待审批'],
      ['plan-review', '计划待审'],
      ['question', '等待回答'],
    ] as const) {
      interactions.set(sid('s'), { key: 'k', kind, sessionId: sid('s') })
      const s = summary('s', 1)
      expect(statusOf(s, interactions, t)).toEqual({ dot: 'warn', label })
    }
  })

  it('falls through an unknown pending kind to the activity state', () => {
    const s = summary('s', 1)
    interactions.set(sid('s'), { key: 'k', kind: 'unseen', sessionId: sid('s') })
    expect(statusOf(s, interactions, t)).toBeUndefined()
    expect(statusOf({ ...s, running: true }, interactions, t)).toEqual({ dot: 'run', label: '进行中' })
  })

  it('reports running then the completed reminder, and nothing otherwise', () => {
    const s = summary('s', 1)
    expect(statusOf(s, new Map(), t)).toBeUndefined()
    expect(statusOf({ ...s, completed: true }, new Map(), t)).toEqual({ dot: 'done', label: '已完成' })
    expect(statusOf({ ...s, running: true, completed: true }, new Map(), t)).toEqual({ dot: 'run', label: '进行中' })
  })

  it('tolerates an absent pending map', () => {
    const s = summary('s', 1, { running: true })
    expect(statusOf(s, undefined, t)).toEqual({ dot: 'run', label: '进行中' })
  })
})

describe('relativeTimeLabel', () => {
  const now = 1_000_000_000_000

  it('buckets by elapsed time with localized units', () => {
    expect(relativeTimeLabel(now - 10_000, now, t)).toBe('刚刚')
    expect(relativeTimeLabel(now - 5 * 60 * 1000, now, t)).toBe('5分钟')
    expect(relativeTimeLabel(now - 3 * 60 * 60 * 1000, now, t)).toBe('3小时')
    expect(relativeTimeLabel(now - 4 * 24 * 60 * 60 * 1000, now, t)).toBe('4天')
    expect(relativeTimeLabel(now - 45 * 24 * 60 * 60 * 1000, now, t)).toBe('1个月')
    expect(relativeTimeLabel(now - 400 * 24 * 60 * 60 * 1000, now, t)).toBe('1年')
  })

  it('passes interpolation parameters through the seat', () => {
    const en = makeTranslate({ 'time.minutes': '{n}min' })
    expect(relativeTimeLabel(now - 9 * 60 * 1000, now, en as never)).toBe('9min')
  })
})
