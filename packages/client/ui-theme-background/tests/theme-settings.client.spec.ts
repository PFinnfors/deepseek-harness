// @vitest-environment jsdom
/** ThemeSettingsSource: seeding, persistence, notification, and no-ops. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, createThemeSettingsSource } from '../src/client/theme-settings.ts'

const EMPTY = { theme: 'none', background: null, title: '' } as const

beforeEach(() => { localStorage.clear() })
afterEach(() => { localStorage.clear() })

describe('theme-background settings source', () => {
  it('starts with the defaults when nothing is stored', () => {
    expect(createThemeSettingsSource().getSnapshot()).toEqual(EMPTY)
  })

  it('persists every write and restores them on a fresh source', () => {
    const first = createThemeSettingsSource()
    first.actions.setTheme('tokyo-night')
    first.actions.setTitle('My Title')
    first.actions.setBackground('data:image/png;base64,AAAA')
    first.actions.clearBackground()
    first.actions.setBackground('data:image/png;base64,BBBB')

    const second = createThemeSettingsSource()
    expect(second.getSnapshot()).toEqual({
      theme: 'tokyo-night',
      background: 'data:image/png;base64,BBBB',
      title: 'My Title',
    })
  })

  it('restores a stored value verbatim, ignoring malformed fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: 'tokyo-night',
      background: 'not-a-data-url',
      title: 42,
    }))
    expect(createThemeSettingsSource().getSnapshot()).toEqual({
      theme: 'tokyo-night',
      background: null,
      title: '',
    })
  })

  it('ignores a corrupt stored document', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(createThemeSettingsSource().getSnapshot()).toEqual(EMPTY)
  })

  it('notifies subscribers once per change and keeps the snapshot stable between changes', () => {
    const source = createThemeSettingsSource()
    const seen = vi.fn()
    const unsubscribe = source.subscribe(seen)
    const before = source.getSnapshot()

    source.actions.setTheme('tokyo-night')
    expect(seen).toHaveBeenCalledTimes(1)
    expect(source.getSnapshot()).not.toBe(before)

    const settled = source.getSnapshot()
    expect(source.getSnapshot()).toBe(settled)

    unsubscribe()
    source.actions.setTitle('x')
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('no-ops repeated writes without notifying', () => {
    const source = createThemeSettingsSource()
    const seen = vi.fn()
    source.subscribe(seen)
    source.actions.setTheme('none')
    source.actions.setTitle('')
    source.actions.clearBackground()
    source.actions.setBackground('data:image/png;base64,AAAA')
    source.actions.setBackground('data:image/png;base64,AAAA')
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('keeps working in memory when storage is unavailable', () => {
    const originalSet = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('quota') }
    try {
      const source = createThemeSettingsSource()
      source.actions.setTheme('tokyo-night')
      expect(source.getSnapshot().theme).toBe('tokyo-night')
    } finally {
      Storage.prototype.setItem = originalSet
    }
  })
})
