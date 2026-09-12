import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '@deepseek-ai/dsh-client-ui-active-session/client'
import type { WorkspaceBrowserInjected } from '@deepseek-ai/dsh-client-ui-active-session/client'
import { WorkspaceBrowser } from '../src/client/WorkspaceBrowser.tsx'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const create = vi.fn(async (input: { path: string }) => ({
    workspaceId: 'ws-new' as never,
    path: input.path,
    title: 'new', sessionIds: [], createdAt: '0', updatedAt: '0',
  }))
  const rename = vi.fn(async () => ({}))
  const deleteWorkspace = vi.fn(async () => undefined)
  const archiveSession = vi.fn(async () => undefined)
  const open = vi.fn()
  const renameSession = vi.fn(async (title: string) => ({ ok: true, value: { title, seq: 1 } }))
  const binding = vi.fn(() => ({ session: { rename: renameSession } }))
  const fork = vi.fn(async () => 'forked' as never)
  const subscribe = () => () => {}
  ctx.provide('workspaces', {
    list: {
      getSnapshot: () => ({
        items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
      }),
      subscribe,
    },
    create,
    rename,
    delete: deleteWorkspace,
    insertBefore: vi.fn(async () => undefined),
    archiveSession,
    insertSessionBefore: vi.fn(async () => undefined),
  } as never)
  ctx.provide('sessions', {
    list: {
      getSnapshot: () => ({
        ids: [], byId: {}, current: undefined, phase: 'ready',
        subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
      }),
      subscribe,
    },
    create: vi.fn(async () => 'created' as never),
    open,
    clear: vi.fn(),
    search: vi.fn(async () => ({ ok: true as const, value: { items: [], hasMore: false } })),
    searchResultLimit: 20,
    binding,
    fork,
  } as never)
  const startSession = vi.fn()
  const pickDirectory = vi.fn(() => Promise.resolve('/projects/picked'))
  ctx.provide('uiWorkspace', {
    startSession,
    archiveSession: vi.fn(async () => undefined),
    pickDirectory,
    connectWorkspace: vi.fn(async () => 'connected' as never),
    listDirectory: vi.fn(),
    createDirectory: vi.fn(),
  } as never)
  const locale = new LocaleRuntime(ctx)
  // These specs assert the shipped Chinese copy. There is no jsdom `window`
  // in this lane, so browser-language detection never runs and the locale
  // comes from FALLBACK_LOCALE (en): state the asserted locale explicitly.
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  return {
    ctx, slots: ctx.get('slots') as SlotRegistry, locale, create, rename,
    deleteWorkspace, archiveSession, open, renameSession, binding, fork,
    startSession, pickDirectory,
  }
}

/** Declare the sidebar browsing hole with a single root registration ('root' is a single slot). */
function declare(slots: SlotRegistry): () => void {
  return slots.register(
    { name: 'root', children: { 'sidebar.workspaces': { kind: 'single', scope: 'root' } } } as never,
    () => null,
  )
}

describe('ui-active-session apply', () => {
  it('declares the services it drives', () => {
    expect(inject).toEqual([
      'slots', 'sessions', 'workspaces', 'uiWorkspace', 'locale',
    ])
  })

  it('registers the browser shadow at the lowest priority for declarations arriving before or after apply', async () => {
    const before = await bench()
    declare(before.slots)
    await before.ctx.plugin({ inject: [...inject], apply }).await()
    const entry = before.slots.entries('sidebar.workspaces')[0]!
    expect(entry.component).toBe(WorkspaceBrowser)
    expect(entry.options.priority).toBe(-1)
    // Copy rides the standard locale seat: the entry declares the namespace
    // and apply registered both dictionaries.
    expect(entry.locale).toBe('uiActiveSession')
    expect(before.locale.bind('uiActiveSession')('toggleActive')).toBe('切换活跃状态')
    expect(before.locale.bind('uiActiveSession')('filterBy.active')).toBe('活跃会话')

    const after = await bench()
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    declare(after.slots)
    await Promise.resolve()
    expect(after.slots.entries('sidebar.workspaces')[0]!.component).toBe(WorkspaceBrowser)
  })

  it('routes browser actions to the services', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    const browser = (b.slots.entries('sidebar.workspaces')[0]!.inject as () => WorkspaceBrowserInjected)()
    browser.startSession('ws' as never)
    expect(b.startSession).toHaveBeenCalledWith('ws')
    browser.open('session' as never)
    expect(b.open).toHaveBeenCalledWith('session')
    await browser.renameSession('session' as never, 'renamed session')
    expect(b.binding).toHaveBeenCalledWith('session')
    expect(b.renameSession).toHaveBeenCalledWith('renamed session')
    browser.forkSession('session' as never)
    await vi.waitFor(() => {
      expect(b.open).toHaveBeenCalledWith('forked')
    })
    expect(b.fork).toHaveBeenCalledWith({ sessionId: 'session', increaseTitle: true })
    await browser.renameWorkspace('ws' as never, 'renamed')
    expect(b.rename).toHaveBeenCalledWith('ws', 'renamed')
    await browser.deleteWorkspace('ws' as never)
    expect(b.deleteWorkspace).toHaveBeenCalledWith('ws')
    browser.archiveSession('session' as never)
    expect(b.archiveSession).toHaveBeenCalledWith('session')
  })

  it('addWorkspace adopts a picked directory as a real Workspace and starts a session', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const browser = (b.slots.entries('sidebar.workspaces')[0]!.inject as () => WorkspaceBrowserInjected)()

    browser.addWorkspace()
    await vi.waitFor(() => {
      expect(b.startSession).toHaveBeenCalledWith('ws-new')
    })
    expect(b.pickDirectory).toHaveBeenCalled()
    expect(b.create).toHaveBeenCalledWith({ path: '/projects/picked' })
  })

  it('addWorkspace ignores the host picker cancel', async () => {
    const b = await bench()
    b.pickDirectory.mockResolvedValueOnce(null as never)
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const browser = (b.slots.entries('sidebar.workspaces')[0]!.inject as () => WorkspaceBrowserInjected)()

    browser.addWorkspace()
    await vi.waitFor(() => {
      expect(b.pickDirectory).toHaveBeenCalled()
    })
    expect(b.create).not.toHaveBeenCalled()
    expect(b.startSession).not.toHaveBeenCalled()
  })

  it('addWorkspace swallows a Workspace-create failure without touching the session seat', async () => {
    const b = await bench()
    b.create.mockRejectedValueOnce(new Error('create refused'))
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const browser = (b.slots.entries('sidebar.workspaces')[0]!.inject as () => WorkspaceBrowserInjected)()

    expect(() => browser.addWorkspace()).not.toThrow()
    await vi.waitFor(() => {
      expect(b.create).toHaveBeenCalledWith({ path: '/projects/picked' })
    })
    expect(b.startSession).not.toHaveBeenCalled()
  })

  it('rejects renameSession on an unknown session or a Host business error', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const browser = (b.slots.entries('sidebar.workspaces')[0]!.inject as () => WorkspaceBrowserInjected)()

    b.binding.mockReturnValueOnce(undefined as never)
    await expect(browser.renameSession('missing' as never, 'x')).rejects.toThrow('unknown session "missing"')

    b.renameSession.mockResolvedValueOnce({
      ok: false,
      error: { code: 'gateway/internal', message: 'rename refused' },
    } as never)
    await expect(browser.renameSession('session' as never, 'x')).rejects.toThrow('rename refused')
  })

  it('fork failure keeps the current selection (no throw)', async () => {
    const b = await bench()
    b.fork.mockRejectedValueOnce(new Error('fork refused'))
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const browser = (b.slots.entries('sidebar.workspaces')[0]!.inject as () => WorkspaceBrowserInjected)()

    expect(() => browser.forkSession('session' as never)).not.toThrow()
    await vi.waitFor(() => {
      expect(b.fork).toHaveBeenCalled()
    })
    expect(b.open).not.toHaveBeenCalled()
  })

  it('unregisters every entry on teardown', async () => {
    const b = await bench()
    declare(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await fiber.dispose()
    expect(b.slots.entries('sidebar.workspaces')).toHaveLength(0)
  })
})
