// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type {
  WorkspaceId, WorkspaceSnapshot, WorkspaceView,
} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionPendingInteractionSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { WorkspaceBrowserProps } from '../src/client/contract/slots.ts'
import { WorkspaceBrowser } from '../src/client/WorkspaceBrowser.tsx'
import { zh } from '../src/client/locales.ts'
import { COLLAPSED_LIMIT } from '../src/client/tree.ts'

afterEach(cleanup)

// The seat's key domain is uiActiveSession ∪ common; the stub mirrors the real
// lookup chain (namespace, then common vocabulary, then the key).
const t: WorkspaceBrowserProps['t'] = makeTranslate(zh, commonZh)

const sid = (id: string) => id as SessionId
const wid = (id: string) => id as WorkspaceId
const now = Date.now()
const summary = (id: string, updatedAt: number = now, overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: sid(id), displayTitle: id, running: false, blank: false, updatedAt, ...overrides,
})
const sessionState = (items: readonly SessionSummary[], overrides: Partial<SessionListState> = {}): SessionListState => ({
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
const workspaceState = (
  items: readonly WorkspaceView[],
  archivedSessionIds: readonly SessionId[] = [],
): WorkspaceSnapshot => ({ items, archivedSessionIds, state: 'idle', phase: 'ready', error: null })
const noPendingInteraction: SessionPendingInteractionSnapshot = new Map()
// The component reads only the pending `.kind` discriminator; the snapshot
// values are otherwise private-field domain instances we must not construct.
const pending = (kind: string): SessionPendingInteractionSnapshot =>
  new Map([[sid('s'), { key: 'k', kind, sessionId: sid('s') }]]) as unknown as SessionPendingInteractionSnapshot
function hook<T>(snapshot: T) {
  return function select<S>(selector: (state: T) => S): S { return selector(snapshot) }
}

function mount(overrides: Partial<WorkspaceBrowserProps> = {}) {
  const props: WorkspaceBrowserProps = {
    wide: true,
    expandSidebar: vi.fn(),
    useSessions: hook(sessionState([])),
    useSessionPendingInteraction: hook(noPendingInteraction),
    useWorkspaces: hook(workspaceState([])),
    startSession: vi.fn(),
    open: vi.fn(),
    addWorkspace: vi.fn(),
    renameSession: vi.fn(async () => {}),
    forkSession: vi.fn(),
    renameWorkspace: vi.fn(async () => {}),
    deleteWorkspace: vi.fn(async () => {}),
    archiveSession: vi.fn(),
    t,
    ...overrides,
  }
  const view = render(<WorkspaceBrowser {...props} />)
  return { view, props }
}

/** Re-render with (possibly) changed props — WorkspaceBrowser has no side channel. */
function rerender(b: ReturnType<typeof mount>, overrides: Partial<WorkspaceBrowserProps>) {
  Object.assign(b.props, overrides)
  b.view.rerender(<WorkspaceBrowser {...b.props} />)
}

/** Open the view-options menu (single seat for Group by / Order by / Filter by). */
function openViewMenu() {
  fireEvent.click(screen.getByRole('button', { name: '视图选项' }))
}

/** The folder glyph span of a workspace row (folder / folderActive / folderDim classes live there). */
function folderGlyph(title: string): HTMLElement {
  const item = screen.getByText(title).closest('[role="treeitem"]') as HTMLElement
  const glyph = item.querySelector('span')
  if (glyph === null) throw new Error(`no glyph span under folder "${title}"`)
  return glyph as HTMLElement
}

describe('WorkspaceBrowser', () => {
  it('renders the grouped tree; folders stay closed with zero session rows until toggled', () => {
    mount({
      useSessions: hook(sessionState([summary('alpha-s'), summary('beta-s')])),
      useWorkspaces: hook(workspaceState([
        workspace('alpha', ['alpha-s']), workspace('beta', ['beta-s']),
      ])),
    })
    expect(screen.getByText('工作区')).toBeTruthy()
    expect(screen.getByText('alpha')).toBeTruthy()
    expect(screen.getByText('beta')).toBeTruthy()
    // Sessions hidden while their group is folded.
    expect(screen.queryByText('alpha-s')).toBeNull()
    expect(screen.queryByText('beta-s')).toBeNull()

    // Folder click expands; a second click fully collapses again.
    fireEvent.click(screen.getByText('alpha'))
    expect(screen.getByText('alpha-s')).toBeTruthy()
    expect(screen.queryByText('beta-s')).toBeNull()
    fireEvent.click(screen.getByText('alpha'))
    expect(screen.queryByText('alpha-s')).toBeNull()
  })

  it('auto-expands the folder holding the current session, once and not after a manual collapse', () => {
    const b = mount({
      useSessions: hook(sessionState([summary('current-s')], { current: sid('current-s') })),
      useWorkspaces: hook(workspaceState([workspace('home', ['current-s'])])),
    })
    // First sight: the current-session folder opens itself.
    expect(screen.getByText('current-s')).toBeTruthy()

    // Manual collapse marks the group touched; a current change must not
    // re-expand it.
    fireEvent.click(screen.getByText('home'))
    expect(screen.queryByText('current-s')).toBeNull()
    rerender(b, { useSessions: hook(sessionState([summary('current-s')], { current: sid('current-s') })) })
    expect(screen.queryByText('current-s')).toBeNull()

    // A different folder gets its own first-sight expansion; the new current
    // row lives outside every workspace account.
    rerender(b, {
      useSessions: hook(sessionState([summary('other-s')], { current: sid('other-s') })),
      useWorkspaces: hook(workspaceState([workspace('home', ['current-s'])])),
    })
    expect(screen.getByText('未分组')).toBeTruthy()
    expect(screen.getByText('other-s')).toBeTruthy()
  })

  it('falls back to the ungrouped bucket for sessions outside every workspace', () => {
    const b = mount({ useSessions: hook(sessionState([summary('loose-s')])) })
    expect(screen.getByText('未分组')).toBeTruthy()
    expect(screen.queryByText('loose-s')).toBeNull()
    fireEvent.click(screen.getByText('未分组'))
    expect(screen.getByText('loose-s')).toBeTruthy()
    // No workspace id backs the ungrouped bucket: its New Session trigger is
    // a no-op rather than a startSession call.
    fireEvent.click(screen.getByRole('button', { name: '在“未分组”中新建会话' }))
    expect(b.props.startSession).not.toHaveBeenCalled()
  })

  it('folds an open folder after COLLAPSED_LIMIT ordinary rows, exempting blank rows', () => {
    const many = Array.from({ length: COLLAPSED_LIMIT + 4 }, (_, i) => summary(`s${i}`))
    // Only the current blank session renders (New Session); it also makes its
    // folder auto-expand on first sight.
    const blank = summary('provisional', now, { blank: true })
    mount({
      useSessions: hook(sessionState([...many, blank], { current: blank.id })),
      useWorkspaces: hook(workspaceState([workspace('ws', [...many.map(s => s.id), blank.id])])),
    })
    // The first COLLAPSED_LIMIT ordinary rows plus the exempt blank row show.
    expect(screen.getByText('s0')).toBeTruthy()
    expect(screen.queryByText(`s${COLLAPSED_LIMIT + 1}`)).toBeNull()
    expect(screen.getByText('新会话')).toBeTruthy()

    const overflow = screen.getByRole('button', { name: '展开其余 4 个会话' })
    expect(overflow.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(overflow)
    expect(screen.getByText(`s${COLLAPSED_LIMIT + 1}`)).toBeTruthy()
    const showLess = screen.getByRole('button', { name: '收起' })
    expect(showLess.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(showLess)
    expect(screen.queryByText(`s${COLLAPSED_LIMIT + 1}`)).toBeNull()

    // Collapsing the folder resets its overflow so re-opening starts at the
    // first-5 state again.
    fireEvent.click(screen.getByText('ws'))
    expect(screen.queryByText('s0')).toBeNull()
    fireEvent.click(screen.getByText('ws'))
    expect(screen.queryByText(`s${COLLAPSED_LIMIT + 1}`)).toBeNull()
    expect(screen.getByRole('button', { name: '展开其余 4 个会话' })).toBeTruthy()
  })

  it('dims a folder only when every visible session inside is inactive', () => {
    mount({
      useSessions: hook(sessionState([summary('active-s'), summary('quiet-s')])),
      useWorkspaces: hook(workspaceState([workspace('ws', ['active-s', 'quiet-s'])])),
    })
    fireEvent.click(screen.getByText('ws'))
    // With an active session inside, the folder keeps its default tint.
    expect(folderGlyph('ws').className).not.toContain('folderDim')

    // Dim the quiet session; the folder must stay bright because the other
    // session is still active.
    fireEvent.click(screen.getByRole('button', { name: '会话“quiet-s”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '切换活跃状态' }))
    expect(folderGlyph('ws').className).not.toContain('folderDim')

    // Once the last active session dims, the folder dims with it.
    fireEvent.click(screen.getByRole('button', { name: '会话“active-s”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '切换活跃状态' }))
    expect(folderGlyph('ws').className).toContain('folderDim')
  })

  it('session rows show status dots and relative time; blank rows render localized and inert', () => {
    const running = summary('running-s', now - 5 * 60 * 1000, { running: true })
    const done = summary('done-s', now - 3 * 60 * 60 * 1000, { completed: true })
    const awaiting = summary('s', now - 60 * 1000)
    // The blank row renders only while it is the current session, and its
    // folder again opens itself on first sight.
    const blank = summary('provisional', now, { blank: true })
    const b = mount({
      useSessions: hook(sessionState([running, done, awaiting, blank], { current: blank.id })),
      useSessionPendingInteraction: hook(pending('approval')),
      useWorkspaces: hook(workspaceState([workspace('ws', [running.id, done.id, awaiting.id, blank.id])])),
    })

    expect(screen.getByText('5分钟')).toBeTruthy()
    expect(screen.getByText('3小时')).toBeTruthy()
    expect(screen.getByText('进行中')).toBeTruthy()
    expect(screen.getByText('已完成')).toBeTruthy()
    expect(screen.getByText('等待审批')).toBeTruthy()
    // Blank rows show the localized New Session title and neither a time nor
    // a row menu (nothing has happened in them yet).
    expect(screen.getByText('新会话')).toBeTruthy()
    expect(screen.queryByLabelText('会话“新会话”的操作')).toBeNull()

    fireEvent.click(screen.getByText('running-s'))
    expect(b.props.open).toHaveBeenCalledWith(running.id)
  })

  it('session menu: Toggle Active flips the dimmed state with its check mark; rename/fork/archive delegate', () => {
    const b = mount({
      useSessions: hook(sessionState([summary('alpha-s')])),
      useWorkspaces: hook(workspaceState([workspace('alpha', ['alpha-s'])])),
    })
    fireEvent.click(screen.getByText('alpha'))
    const menuButton = screen.getByRole('button', { name: '会话“alpha-s”的操作' })
    fireEvent.click(menuButton)
    const toggle = screen.getByRole('menuitem', { name: '切换活跃状态' })
    // Active by default: the leading Toggle Active row carries the check.
    expect(toggle.querySelector('svg')).toBeTruthy()

    // Toggling dims the row (and moves the check off the menu row).
    fireEvent.click(toggle)
    const row = screen.getByText('alpha-s').closest('[role="treeitem"]') as HTMLElement
    expect(row.className).toContain('rowInactive')
    expect(screen.getByText('alpha-s').className).toContain('titleDim')
    fireEvent.click(menuButton)
    expect(screen.getByRole('menuitem', { name: '切换活跃状态' }).querySelector('svg')).toBeNull()

    // Toggle back re-activates.
    fireEvent.click(screen.getByRole('menuitem', { name: '切换活跃状态' }))
    expect(screen.getByText('alpha-s').closest('[role="treeitem"]')?.className).not.toContain('rowInactive')

    // Fork and archive delegate; rename opens the session rename dialog.
    fireEvent.click(menuButton)
    fireEvent.click(screen.getByRole('menuitem', { name: '分叉会话' }))
    expect(b.props.forkSession).toHaveBeenCalledWith('alpha-s')
    fireEvent.click(menuButton)
    fireEvent.click(screen.getByRole('menuitem', { name: '归档会话' }))
    expect(b.props.archiveSession).toHaveBeenCalledWith('alpha-s')
    fireEvent.click(menuButton)
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('view menu switches Group by, Order by, and Filter by with check marks', () => {
    mount({
      useSessions: hook(sessionState([summary('a-s'), summary('b-s')])),
      useWorkspaces: hook(workspaceState([
        workspace('alpha', ['a-s']), workspace('beta', ['b-s']),
      ])),
    })
    openViewMenu()
    expect(screen.getByText('分组方式')).toBeTruthy()
    expect(screen.getByText('排序方式')).toBeTruthy()
    // The new Filter by section sits after Order by.
    expect(screen.getByText('筛选')).toBeTruthy()
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      '按工作区', '单列表', '手动排序', '最近更新', '全部会话', '活跃会话',
    ])
    expect(screen.getByRole('menuitem', { name: '按工作区' }).querySelector('svg')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: '最近更新' }).querySelector('svg')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: '全部会话' }).querySelector('svg')).toBeTruthy()

    // Flat list: every session becomes one row under the Sessions label.
    fireEvent.click(screen.getByRole('menuitem', { name: '单列表' }))
    expect(screen.getByText('会话')).toBeTruthy()
    expect(screen.getByText('a-s')).toBeTruthy()
    expect(screen.getByText('b-s')).toBeTruthy()

    // Manual ordering adopts a flat order too; the check follows the pick.
    openViewMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '手动排序' }))
    expect(screen.getByText('a-s')).toBeTruthy()

    // A second click on the same trigger closes the view menu again.
    openViewMenu()
    expect(screen.getByRole('menuitem', { name: '手动排序' }).querySelector('svg')).toBeTruthy()
    expect(screen.getByText('筛选')).toBeTruthy()
    openViewMenu()
    expect(screen.queryByText('筛选')).toBeNull()

    openViewMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '按工作区' }))
    expect(screen.getByText('工作区')).toBeTruthy()
  })

  it('Filter by Active hides Workspaces holding only inactive sessions', () => {
    mount({
      useSessions: hook(sessionState([summary('active-s'), summary('quiet-s')])),
      useWorkspaces: hook(workspaceState([
        workspace('busy', ['active-s']), workspace('quiet', ['quiet-s']),
      ])),
    })
    // Mark the quiet folder's session inactive.
    fireEvent.click(screen.getByText('quiet'))
    fireEvent.click(screen.getByRole('button', { name: '会话“quiet-s”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '切换活跃状态' }))
    expect(screen.getByText('quiet-s').closest('[role="treeitem"]')?.className).toContain('rowInactive')

    openViewMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '活跃会话' }))
    expect(screen.queryByText('quiet')).toBeNull()
    expect(screen.getByText('busy')).toBeTruthy()

    // Switching back to All surfaces every workspace again.
    openViewMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '全部会话' }))
    expect(screen.getByText('quiet')).toBeTruthy()
  })

  it('empty workspaces hide under the active filter but stay in the all view', () => {
    mount({
      useSessions: hook(sessionState([summary('alpha-s')])),
      useWorkspaces: hook(workspaceState([workspace('alpha', ['alpha-s']), workspace('ghost', [])])),
    })
    expect(screen.getByText('ghost')).toBeTruthy()
    openViewMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '活跃会话' }))
    expect(screen.queryByText('ghost')).toBeNull()
    expect(screen.getByText('alpha')).toBeTruthy()
  })

  it('search narrows rows by session and workspace title; Escape clears', () => {
    mount({
      useSessions: hook(sessionState([summary('alpha-s'), summary('beta-s')])),
      useWorkspaces: hook(workspaceState([
        workspace('alpha', ['alpha-s'], 'Alpha Project'),
        workspace('beta', ['beta-s']),
      ])),
    })
    fireEvent.click(screen.getByRole('button', { name: '搜索会话' }))
    const box = screen.getByPlaceholderText('搜索会话…')

    // Session-title match.
    fireEvent.change(box, { target: { value: 'alpha' } })
    expect(screen.getByText('alpha-s')).toBeTruthy()
    expect(screen.queryByText('beta-s')).toBeNull()

    // Workspace-title-only match keeps the row.
    fireEvent.change(box, { target: { value: 'project' } })
    expect(screen.getByText('alpha-s')).toBeTruthy()

    // No match anywhere → the no-matches empty copy.
    fireEvent.change(box, { target: { value: 'beta-workspace' } })
    expect(screen.getByText('无匹配结果')).toBeTruthy()

    // Escape clears the query and closes the input; non-Escape keys are inert
    // (the grouped view stays in search mode with the value untouched). The
    // grouped view then returns with every folder collapsed again.
    fireEvent.keyDown(box, { key: 'Enter' })
    expect((box as HTMLInputElement).value).toBe('beta-workspace')
    expect(screen.getByText('无匹配结果')).toBeTruthy()
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('搜索会话…')).toBeNull()
    expect(screen.getByText('Alpha Project')).toBeTruthy()
    expect(screen.getByText('beta')).toBeTruthy()
    expect(screen.queryByText('alpha-s')).toBeNull()
  })

  it('keeps the first-listed Workspace title for a session under several', () => {
    mount({
      useSessions: hook(sessionState([summary('shared-s')])),
      useWorkspaces: hook(workspaceState([
        workspace('alpha', ['shared-s'], 'Alpha Project'),
        workspace('beta', ['shared-s'], 'Beta Project'),
      ])),
    })
    fireEvent.click(screen.getByRole('button', { name: '搜索会话' }))
    const box = screen.getByPlaceholderText('搜索会话…')
    // The first-listed Alpha title owns the shared session; the duplicate
    // Beta listing never overwrites it.
    fireEvent.change(box, { target: { value: 'project' } })
    expect(screen.getByText('shared-s')).toBeTruthy()
    fireEvent.change(box, { target: { value: 'Gamma' } })
    expect(screen.getByText('无匹配结果')).toBeTruthy()
  })

  it('shows the empty state when no sessions exist', () => {
    mount()
    expect(screen.getByText('暂无会话')).toBeTruthy()
  })

  it('renames a workspace from its row menu with busy, cancel, and error handling', async () => {
    const renameWorkspace = vi.fn(async () => {})
    mount({
      useSessions: hook(sessionState([summary('alpha-s')])),
      useWorkspaces: hook(workspaceState([workspace('alpha', ['alpha-s'])])),
      renameWorkspace,
    })
    const renameOpen = () => {
      fireEvent.click(screen.getByRole('button', { name: '工作区“alpha”的操作' }))
      fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    }

    renameOpen()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toBe('重命名工作区')
    const input = screen.getByRole('textbox', { name: '工作区名称' })
    expect((input as HTMLInputElement).value).toBe('alpha')

    // Blank drafts disable the confirm button.
    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '重命名' })).toHaveProperty('disabled', true)

    fireEvent.change(input, { target: { value: 'renamed' } })
    fireEvent.click(screen.getByRole('button', { name: '重命名' }))
    await waitFor(() => {
      expect(renameWorkspace).toHaveBeenCalledWith('alpha', 'renamed')
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    // Error path keeps the dialog open with the wire message.
    renameWorkspace.mockRejectedValueOnce(new Error('rename refused'))
    renameOpen()
    fireEvent.change(screen.getByRole('textbox', { name: '工作区名称' }), { target: { value: 'again' } })
    fireEvent.click(screen.getByRole('button', { name: '重命名' }))
    expect((await screen.findByRole('alert')).textContent).toBe('rename refused')
    expect(screen.getByRole('dialog')).toBeTruthy()

    // Cancel closes without calling the action.
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('holds the rename dialog busy while confirming and ignores the mask during it', async () => {
    const renameWorkspace = vi.fn(async () => {})
    mount({
      useSessions: hook(sessionState([summary('alpha-s')])),
      useWorkspaces: hook(workspaceState([workspace('alpha', ['alpha-s'])])),
      renameWorkspace,
    })
    let resolveRename!: () => void
    renameWorkspace.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveRename = resolve
    }))
    fireEvent.click(screen.getByRole('button', { name: '工作区“alpha”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    fireEvent.click(screen.getByRole('button', { name: '重命名' }))
    // Busy: both buttons disable and the mask click cannot dismiss.
    expect(screen.getByRole('button', { name: '重命名' })).toHaveProperty('disabled', true)
    expect(await screen.findByRole('textbox', { name: '工作区名称' })).toHaveProperty('disabled', true)
    act(() => {
      fireEvent.click(document.querySelector('[aria-hidden="true"]') as HTMLElement)
    })
    expect(screen.getByRole('dialog')).toBeTruthy()

    await act(async () => { resolveRename() })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(renameWorkspace).toHaveBeenCalledTimes(1)
  })

  it('renames a session by Enter and confirms workspace deletion with its description', async () => {
    const b = mount({
      useSessions: hook(sessionState([summary('alpha-s')])),
      useWorkspaces: hook(workspaceState([workspace('alpha', ['alpha-s'])])),
    })
    // Session rename via the row menu; the draft is prefilled from the row.
    fireEvent.click(screen.getByText('alpha'))
    fireEvent.click(screen.getByRole('button', { name: '会话“alpha-s”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    expect(screen.getByRole('textbox', { name: '会话名称' })).toHaveProperty('value', 'alpha-s')
    // Escape (Modal's own keydown) dismisses through onClose when not busy.
    fireEvent.keyDown(screen.getByRole('textbox', { name: '会话名称' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    // Reopen and confirm with Enter.
    fireEvent.click(screen.getByRole('button', { name: '会话“alpha-s”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: '会话名称' }), { key: 'Enter' })
    await waitFor(() => {
      expect(b.props.renameSession).toHaveBeenCalledWith('alpha-s', 'alpha-s')
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    // Workspace delete confirmation carries the description copy.
    fireEvent.click(screen.getByRole('button', { name: '工作区“alpha”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除工作区' }))
    const deleteDialog = screen.getByRole('dialog')
    expect(deleteDialog.getAttribute('aria-label')).toBe('删除工作区')
    expect(screen.getByText('将把“alpha”从工作区列表中移除。文件夹与会话记录会保留，其会话将显示在“未分组”下。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '删除工作区' }))
    await waitFor(() => {
      expect(b.props.deleteWorkspace).toHaveBeenCalledWith('alpha')
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('reports a non-Error rename failure as its text', async () => {
    const renameWorkspace = vi.fn(async () => { throw 'denied' })
    mount({
      useSessions: hook(sessionState([summary('alpha-s')])),
      useWorkspaces: hook(workspaceState([workspace('alpha', ['alpha-s'])])),
      renameWorkspace,
    })
    fireEvent.click(screen.getByRole('button', { name: '工作区“alpha”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    fireEvent.change(screen.getByRole('textbox', { name: '工作区名称' }), { target: { value: 'Other' } })
    fireEvent.click(screen.getByRole('button', { name: '重命名' }))
    expect((await screen.findByRole('alert')).textContent).toBe('denied')
  })

  it('reports a delete failure inside the confirmation dialog', async () => {
    const deleteWorkspace = vi.fn(async () => {})
    mount({
      useSessions: hook(sessionState([])),
      useWorkspaces: hook(workspaceState([workspace('alpha', [])])),
      deleteWorkspace,
    })
    deleteWorkspace.mockRejectedValueOnce(new Error('delete refused'))
    fireEvent.click(screen.getByRole('button', { name: '工作区“alpha”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除工作区' }))
    fireEvent.click(screen.getByRole('button', { name: '删除工作区' }))
    expect((await screen.findByRole('alert')).textContent).toBe('delete refused')
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('rails: the narrow region renders only expand-and-land triggers', () => {
    const b = mount({ wide: false })
    expect(screen.getByRole('button', { name: '搜索会话' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '添加工作区' })).toBeTruthy()
    expect(screen.queryByText('工作区')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '搜索会话' }))
    expect(b.props.expandSidebar).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '添加工作区' }))
    expect(b.props.expandSidebar).toHaveBeenCalledTimes(2)
  })

  it('row menus toggle on a repeat click and switch directly between rows', () => {
    mount({
      useSessions: hook(sessionState([summary('a-s'), summary('b-s')])),
      useWorkspaces: hook(workspaceState([
        workspace('alpha', ['a-s']), workspace('beta', ['b-s']),
      ])),
    })
    fireEvent.click(screen.getByText('alpha'))
    fireEvent.click(screen.getByText('beta'))
    const aButton = screen.getByRole('button', { name: '会话“a-s”的操作' })
    const bButton = screen.getByRole('button', { name: '会话“b-s”的操作' })
    const alphaButton = screen.getByRole('button', { name: '工作区“alpha”的操作' })
    const betaButton = screen.getByRole('button', { name: '工作区“beta”的操作' })

    // Session menu: open, then a repeat click on the same trigger closes it.
    fireEvent.click(aButton)
    expect(screen.getByRole('menuitem', { name: '切换活跃状态' })).toBeTruthy()
    fireEvent.click(aButton)
    expect(screen.queryByRole('menuitem', { name: '切换活跃状态' })).toBeNull()

    // Opening another row's menu while one is open re-anchors the menu; the
    // pick then affects the new row (rows share identical item labels).
    fireEvent.click(aButton)
    fireEvent.click(bButton)
    fireEvent.click(screen.getByRole('menuitem', { name: '切换活跃状态' }))
    expect(screen.getByText('b-s').closest('[role="treeitem"]')?.className).toContain('rowInactive')
    expect(screen.getByText('a-s').closest('[role="treeitem"]')?.className).not.toContain('rowInactive')

    // Same toggle contract on the workspace rows.
    fireEvent.click(alphaButton)
    expect(screen.getByRole('menuitem', { name: '重命名' })).toBeTruthy()
    fireEvent.click(alphaButton)
    expect(screen.queryByRole('menuitem', { name: '重命名' })).toBeNull()
    fireEvent.click(alphaButton)
    fireEvent.click(betaButton)
    expect(screen.getByRole('menuitem', { name: '重命名' })).toBeTruthy()
    fireEvent.click(betaButton)
    expect(screen.queryByRole('menuitem', { name: '重命名' })).toBeNull()
  })

  it('header add delegates and the workspace row New Session button targets its workspace', () => {
    const b = mount({
      useSessions: hook(sessionState([summary('alpha-s')])),
      useWorkspaces: hook(workspaceState([workspace('alpha', ['alpha-s'])])),
    })
    fireEvent.click(screen.getByRole('button', { name: '添加工作区' }))
    expect(b.props.addWorkspace).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '在“alpha”中新建会话' }))
    expect(b.props.startSession).toHaveBeenCalledWith('alpha')
  })
})
