/**
 * Sidebar session browser with an Active state. Sessions are Active by
 * default; the session-row context menu's leading "Toggle Active" entry flips
 * a session active/inactive. Inactive rows and folders whose sessions are all
 * inactive render dimmed through the theme's label-dimmed token, and the view
 * options gain a "Filter by Active" section that hides Workspaces holding
 * only inactive sessions. Folder collapse always closes the folder entirely
 * (zero session rows), independent of how many sessions it holds; inside an
 * open folder an overflow control folds long lists to
 * {@link COLLAPSED_LIMIT} ordinary rows (blank rows exempt).
 *
 * The component is presentation-only: all data arrives through the
 * framework's global hooks and the injected actions; the Active set is local
 * view state and resets with the browser.
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import {
  Button,
  IconEllipsisOutline16,
  IconFolderClose16,
  IconFolderOpen16,
  IconPersonalizationOutline16,
  IconPlusOutline16,
  IconSearchOutline16,
  IconTriangleRightFill14,
  Menu,
  Modal,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceBrowserProps } from './contract/slots.ts'
import {
  UNGROUPED_KEY,
  buildGroups,
  collapsedRows,
  flatRows,
  relativeTimeLabel,
  statusOf,
  type SessionGroup,
} from './tree.ts'
import css from './WorkspaceBrowser.module.css'

/** View-options seats (Group by / Order by / Filter by), persisted per mount. */
type GroupByMode = 'workspace' | 'flat'
type OrderByMode = 'manual' | 'updated'
type FilterByMode = 'all' | 'active'

/** Which popover is open; the primitive Menu list follows the same state. */
type MenuState =
  | { kind: 'view' }
  | { kind: 'session'; id: SessionId }
  | { kind: 'workspace'; id: WorkspaceId }
  | null

/** One open dialog: rename workspace/session (input) or workspace delete (confirmation). */
type DialogState =
  | { kind: 'rename-workspace'; id: WorkspaceId }
  | { kind: 'rename-session'; id: SessionId }
  | { kind: 'delete-workspace'; id: WorkspaceId; title: string }
  | null

/** Flip one Set membership. */
function toggled<T>(set: ReadonlySet<T>, member: T): Set<T> {
  const next = new Set(set)
  if (next.has(member)) next.delete(member)
  else next.add(member)
  return next
}

/** Group sessions for the folder header: ungrouped bucket gets localized copy. */
function groupLabel(g: SessionGroup, t: WorkspaceBrowserProps['t']): string {
  return g.workspaceId === undefined ? t('group.ungrouped') : g.label
}

/**
 * Render the browsing region.
 * @param props - composed slot props (shell owner share + injected actions + locale seat).
 * @returns the region element tree.
 */
export function WorkspaceBrowser(props: WorkspaceBrowserProps): ReactNode {
  const wsState = props.useWorkspaces(s => s)
  const list = props.useSessions(s => s)
  const pendingMap = props.useSessionPendingInteraction(s => s)
  const t = props.t

  const [groupBy, setGroupBy] = useState<GroupByMode>('workspace')
  const [orderBy, setOrderBy] = useState<OrderByMode>('updated')
  const [filterBy, setFilterBy] = useState<FilterByMode>('all')
  const [inactive, setInactive] = useState(() => new Set<SessionId>())
  // Folder open/closed: a closed folder renders no session rows at all.
  const [expandedGroups, setExpandedGroups] = useState(() => new Set<string>())
  // Per-folder overflow: within an open folder, show every session or the
  // first COLLAPSED_LIMIT ordinary rows plus the Show-more control.
  const [showAllGroups, setShowAllGroups] = useState(() => new Set<string>())
  // Keys the user has explicitly toggled: the current-session folder is
  // auto-expanded only on first sight, never re-expanded after a manual
  // collapse (mirrors the shipped groupExpansion hasOwn guard).
  const [touchedGroups, setTouchedGroups] = useState(() => new Set<string>())
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menu, setMenu] = useState<MenuState>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = Date.now()

  const archivedSet = new Set(wsState.archivedSessionIds)

  useEffect(() => {
    if (list.current === undefined) return
    const inWs = wsState.items.find(w => w.sessionIds.includes(list.current as SessionId))
    const key = inWs === undefined ? UNGROUPED_KEY : inWs.workspaceId
    if (!expandedGroups.has(key) && !touchedGroups.has(key)) {
      // First sight of the current-session folder: expand it once. The
      // touched guard keeps a manually collapsed folder collapsed.
      setExpandedGroups(prev => new Set(prev).add(key))
    }
  }, [list.current, wsState, expandedGroups, touchedGroups])

  const q = query.trim().toLowerCase()
  const matches = (s: SessionSummary, workspaceTitle: string | undefined): boolean =>
    q === ''
    || (s.displayTitle !== undefined && s.displayTitle.toLowerCase().includes(q))
    || (workspaceTitle !== undefined && workspaceTitle.toLowerCase().includes(q))

  const groups = buildGroups(list, wsState.items, archivedSet, orderBy)
  const rows = flatRows(list, archivedSet)
  const wsTitleBySession = new Map<SessionId, string>()
  for (const w of wsState.items) {
    for (const sid of w.sessionIds) {
      // A session may be listed under several Workspaces; the first listed
      // title wins for matching and renaming.
      if (!wsTitleBySession.has(sid)) wsTitleBySession.set(sid, w.title)
    }
  }

  const toggleActive = (id: SessionId): void => {
    setInactive(prev => toggled(prev, id))
  }
  const applyFilter = (sessions: readonly SessionSummary[]): SessionSummary[] =>
    filterBy === 'active' ? sessions.filter(s => !inactive.has(s.id)) : [...sessions]
  const filteredGroups = groups
    .map(g => ({ ...g, sessions: applyFilter(g.sessions).filter(s => matches(s, g.label)) }))
    .filter(g => g.sessions.length > 0 || (filterBy !== 'active' && q === ''))
  const filteredRows = applyFilter(rows).filter(s => matches(s, wsTitleBySession.get(s.id)))

  const closeMenu = (): void => setMenu(null)
  const setSessionMenu = (id: SessionId): void => {
    setMenu(menu?.kind === 'session' && menu.id === id ? null : { kind: 'session', id })
  }
  const setWorkspaceMenu = (id: WorkspaceId): void => {
    setMenu(menu?.kind === 'workspace' && menu.id === id ? null : { kind: 'workspace', id })
  }

  const sessionMenuItems = (): Array<{ id: string; label: string } | { type: 'separator'; id: string }> => [
    { id: 'toggle-active', label: t('toggleActive') },
    { type: 'separator' as const, id: 'session-actions-separator' },
    { id: 'rename', label: t('rename') },
    { id: 'fork', label: t('menu.fork') },
    { id: 'archive', label: t('menu.archiveSession') },
  ]
  const sessionMenuPick = (s: SessionSummary, id: string): void => {
    // Closed row-menu id set: the trailing else is exactly the Archive item.
    if (id === 'toggle-active') toggleActive(s.id)
    else if (id === 'rename') {
      setDraft(s.displayTitle)
      setDialog({ kind: 'rename-session', id: s.id })
    } else if (id === 'fork') props.forkSession(s.id)
    else props.archiveSession(s.id)
    closeMenu()
  }

  const workspaceMenuItems = () => [
    { id: 'rename', label: t('rename') },
    { id: 'delete', label: t('delete.workspace'), danger: true },
  ]
  const workspaceMenuPick = (g: SessionGroup, id: string): void => {
    // Closed workspace-menu id set {rename, delete}; the menu renders only
    // for named workspace rows, so the workspace id is always present here.
    if (g.workspaceId === undefined) { closeMenu(); return }
    if (id === 'rename') {
      setDraft(g.label)
      setDialog({ kind: 'rename-workspace', id: g.workspaceId })
    } else {
      setDialog({ kind: 'delete-workspace', id: g.workspaceId, title: g.label })
    }
    closeMenu()
  }

  const viewItems = () => [
    { type: 'label' as const, id: 'group-by', text: t('groupBy.label') },
    { id: 'workspace', label: t('groupBy.workspace') },
    { id: 'flat', label: t('groupBy.flat') },
    { type: 'separator' as const, id: 'order-by-separator' },
    { type: 'label' as const, id: 'order-by', text: t('orderBy.label') },
    { id: 'manual', label: t('orderBy.manual') },
    { id: 'updated', label: t('orderBy.updated') },
    { type: 'separator' as const, id: 'filter-by-separator' },
    { type: 'label' as const, id: 'filter-by', text: t('filterBy.label') },
    { id: 'filter-all', label: t('filterBy.all') },
    { id: 'filter-active', label: t('filterBy.active') },
  ]
  const viewPick = (id: string): void => {
    // Closed view-menu id set; the trailing else is the Filter by All item.
    if (id === 'workspace' || id === 'flat') setGroupBy(id)
    else if (id === 'manual' || id === 'updated') setOrderBy(id)
    else if (id === 'filter-active') setFilterBy('active')
    else setFilterBy('all')
    closeMenu()
  }

  const renderSessionRow = (s: SessionSummary) => {
    const selected = s.id === list.current
    const dim = inactive.has(s.id)
    const st = statusOf(s, pendingMap, t)
    const title = s.blank ? t('session.new') : s.displayTitle
    return (
      <div
        key={s.id}
        role="treeitem"
        aria-selected={selected}
        className={clsx(css.sessionRow, selected && css.rowSelected, dim && css.rowInactive)}
        onClick={() => { props.open(s.id) }}
      >
        <span className={css.slot}>
          {st === undefined ? null : (
            <>
              <StateDot size={8} state={st.dot === 'warn' ? 'warning' : st.dot === 'run' ? 'ongoing' : 'done'} />
              <span className={css.visuallyHidden}>{st.label}</span>
            </>
          )}
        </span>
        <span className={clsx(css.title, dim && css.titleDim)}>{title}</span>
        {!s.blank && <span className={css.time}>{relativeTimeLabel(s.updatedAt, now, t)}</span>}
        {!s.blank && (
          <span className={css.rowActions}>
            <Menu
              open={menu?.kind === 'session' && menu.id === s.id}
              onClose={closeMenu}
              items={sessionMenuItems()}
              // The leading Toggle Active row carries the Active check mark.
              selectedIds={dim ? [] : ['toggle-active']}
              onSelect={(id) => { sessionMenuPick(s, id) }}
              portal
              closeOnPointerLeave
              anchor={(
                <button
                  type="button"
                  className={css.iconButton}
                  aria-label={t('actions.session.aria', { name: title })}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSessionMenu(s.id)
                  }}
                >
                  <IconEllipsisOutline16 />
                </button>
              )}
            />
          </span>
        )}
      </div>
    )
  }

  const renderWorkspaceRow = (g: SessionGroup) => {
    const expanded = expandedGroups.has(g.key)
    const sessionsExpanded = showAllGroups.has(g.key)
    const containsCurrent = list.current !== undefined && g.workspaceId !== undefined
      && wsState.items.some(w => w.workspaceId === g.workspaceId && w.sessionIds.includes(list.current as SessionId))
    // Folder dimming reflects all visible sessions in the folder, not the
    // active/search-filtered rows that happen to be shown right now.
    const anyActive = g.allSessions.some(s => !inactive.has(s.id))
    const allInactive = g.allSessions.length > 0 && !anyActive
    // Shipped model: a closed folder renders no session rows at all. Only
    // inside an open folder does the overflow control kick in.
    const collapsed = collapsedRows(g.sessions)
    const sessionRows = expanded
      ? (sessionsExpanded ? g.sessions : collapsed.rows)
      : []
    const label = groupLabel(g, t)
    const folderClass = (expanded && containsCurrent) ? css.folderActive : (allInactive ? css.folderDim : undefined)
    return (
      <div key={g.key} className={css.group} role="group">
        <div
          role="treeitem"
          aria-expanded={expanded}
          className={css.projectRow}
          onClick={() => {
            // Folder toggle: collapsing also resets this folder's overflow
            // so it reopens at the first-5 state (shipped onToggle).
            if (expandedGroups.has(g.key)) {
              setExpandedGroups(prev => toggled(prev, g.key))
              setShowAllGroups((prev) => {
                const next = new Set(prev)
                next.delete(g.key)
                return next
              })
            } else {
              setExpandedGroups(prev => new Set(prev).add(g.key))
            }
            setTouchedGroups(prev => new Set(prev).add(g.key))
          }}
        >
          <span className={clsx(css.slot, css.folder, folderClass)}>
            {expanded ? <IconFolderOpen16 /> : <IconFolderClose16 />}
          </span>
          <span className={clsx(css.slot, css.chevron)}>
            <IconTriangleRightFill14 className={clsx(css.arrow, expanded && css.arrowOpen)} />
          </span>
          <span className={css.projectText}>
            <span className={css.title}>{label}</span>
          </span>
          <span className={css.rowActions}>
            {g.workspaceId !== undefined && (
              <Menu
                open={menu?.kind === 'workspace' && menu.id === g.workspaceId}
                onClose={closeMenu}
                items={workspaceMenuItems()}
                onSelect={(id) => { workspaceMenuPick(g, id) }}
                portal
                closeOnPointerLeave
                anchor={(
                  <button
                    type="button"
                    className={css.iconButton}
                    aria-label={t('actions.workspace.aria', { name: label })}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (g.workspaceId !== undefined) setWorkspaceMenu(g.workspaceId)
                    }}
                  >
                    <IconEllipsisOutline16 />
                  </button>
                )}
              />
            )}
            <button
              type="button"
              className={css.iconButton}
              aria-label={t('actions.newSession.aria', { name: label })}
              onClick={(e) => {
                e.stopPropagation()
                if (g.workspaceId !== undefined) props.startSession(g.workspaceId)
              }}
            >
              <IconPlusOutline16 />
            </button>
          </span>
        </div>
        {sessionRows.map(s => renderSessionRow(s))}
        {expanded && collapsed.hiddenCount > 0 && (
          <button
            type="button"
            className={css.overflowButton}
            aria-expanded={sessionsExpanded}
            onClick={(e) => {
              e.stopPropagation()
              setShowAllGroups(prev => toggled(prev, g.key))
            }}
          >
            {sessionsExpanded ? t('sessions.collapse') : t('sessions.expand', { n: collapsed.hiddenCount })}
          </button>
        )}
      </div>
    )
  }

  const body = q === ''
    ? (groupBy === 'flat' ? filteredRows.map(renderSessionRow) : filteredGroups.map(renderWorkspaceRow))
    : filteredRows.map(renderSessionRow)

  const showTree = q === '' && (groupBy === 'flat' ? filteredRows.length : filteredGroups.length) > 0
  const empty = q === ''
    ? (showTree ? null : <div className={css.empty}>{t('empty.none')}</div>)
    : (filteredRows.length === 0 ? <div className={css.empty}>{t('empty.noMatches')}</div> : null)

  const header = (
    <div className={css.header}>
      <span className={css.sectionLabel}>
        {groupBy === 'flat' ? t('section.sessions') : t('section.workspaces')}
      </span>
      <span className={css.headerActions}>
        <Menu
          open={menu?.kind === 'view'}
          onClose={closeMenu}
          items={viewItems()}
          selectedIds={[groupBy, orderBy, filterBy === 'active' ? 'filter-active' : 'filter-all']}
          onSelect={viewPick}
          align="end"
          dense
          portal
          anchor={(
            <button
              type="button"
              className={css.iconButton}
              aria-label={t('viewOptions.label')}
              onClick={(e) => {
                e.stopPropagation()
                setMenu(menu?.kind === 'view' ? null : { kind: 'view' })
              }}
            >
              <IconPersonalizationOutline16 />
            </button>
          )}
        />
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('search.sessions.aria')}
          onClick={(e) => {
            e.stopPropagation()
            setSearchOpen(v => !v)
          }}
        >
          <IconSearchOutline16 />
        </button>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('workspace.add')}
          onClick={(e) => {
            e.stopPropagation()
            props.addWorkspace()
          }}
        >
          <IconPlusOutline16 />
        </button>
      </span>
    </div>
  )

  const searchInput = searchOpen && (
    <input
      className={css.searchInput}
      type="text"
      placeholder={t('search.placeholder')}
      value={query}
      onChange={(e) => { setQuery(e.target.value) }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setQuery('')
          setSearchOpen(false)
        }
      }}
    />
  )

  const dialogTitle = (d: Exclude<DialogState, null>): string => d.kind === 'delete-workspace'
    ? t('delete.workspace')
    : d.kind === 'rename-workspace' ? t('rename.workspace.title') : t('rename.session.title')
  const dialogFieldLabel = (d: Exclude<DialogState, null>): string => d.kind === 'rename-workspace'
    ? t('field.workspaceName')
    : t('field.sessionName')
  const confirmDialog = (d: Exclude<DialogState, null>): void => {
    const done = (): void => {
      setDialog(null)
      setError(null)
      setBusy(false)
    }
    const fail = (reason: unknown): void => {
      setBusy(false)
      setError(reason instanceof Error ? reason.message : String(reason))
    }
    setBusy(true)
    setError(null)
    if (d.kind === 'rename-workspace') props.renameWorkspace(d.id, draft.trim()).then(done, fail)
    else if (d.kind === 'rename-session') props.renameSession(d.id, draft.trim()).then(done, fail)
    else props.deleteWorkspace(d.id).then(done, fail)
  }
  const closeDialog = (): void => {
    setDialog(null)
    setError(null)
  }

  const dialogEl = dialog !== null && (
    <Modal
      open
      onClose={() => { if (!busy) closeDialog() }}
      closeLabel={t('close')}
      title={dialogTitle(dialog)}
      {...(dialog.kind === 'delete-workspace'
        ? { description: t('delete.desc', { name: dialog.title }) }
        : {})}
      footer={(
        <>
          <Button variant="outline" disabled={busy} onClick={closeDialog}>{t('cancel')}</Button>
          <Button
            variant="primary"
            disabled={busy || (dialog.kind !== 'delete-workspace' && draft.trim() === '')}
            onClick={() => { confirmDialog(dialog) }}
          >
            {dialog.kind === 'delete-workspace' ? t('delete.workspace') : t('rename')}
          </Button>
        </>
      )}
    >
      {dialog.kind === 'delete-workspace'
        ? (error !== null ? <div className={css.dialogError} role="alert">{error}</div> : null)
        : (
          <>
            <input
              className={css.dialogInput}
              type="text"
              value={draft}
              aria-label={dialogFieldLabel(dialog)}
              autoFocus
              disabled={busy}
              onChange={(e) => {
                setDraft(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy && draft.trim() !== '') confirmDialog(dialog)
              }}
            />
            {error !== null && <div className={css.dialogError} role="alert">{error}</div>}
          </>
        )}
    </Modal>
  )

  const rail = (
    <div className={css.rail}>
      <button
        type="button"
        className={css.railBtn}
        aria-label={t('search.sessions.aria')}
        onClick={(e) => {
          e.stopPropagation()
          props.expandSidebar()
        }}
      >
        <IconSearchOutline16 />
      </button>
      <button
        type="button"
        className={css.railBtn}
        aria-label={t('workspace.add')}
        onClick={(e) => {
          e.stopPropagation()
          props.expandSidebar()
        }}
      >
        <IconPlusOutline16 />
      </button>
    </div>
  )

  const full = (
    <div className={css.root}>
      {header}
      {searchInput}
      <div className={css.listArea} role="tree" aria-label={t('section.sessions')}>
        {empty}
        {body}
      </div>
      {dialogEl}
    </div>
  )
  return props.wide ? full : rail
}
