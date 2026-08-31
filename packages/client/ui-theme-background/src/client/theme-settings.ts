/**
 * Root-scoped transient theme & background settings: one observable source
 * shared by the settings page occupant and the brand-title occupant, with
 * guarded localStorage persistence so choices survive a page refresh and a
 * plugin re-run. Deliberately not a declared store: the source must also
 * drive apply-side effects (token override, background stylesheet, brand
 * occupant presence) outside the render tree, where the framework-owned store
 * instance is not reachable.
 */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'

/** A selectable theme the panel can apply. */
export type ThemeChoice = 'none' | 'tokyo-night'

/** Point-in-time panel state. */
export interface ThemeSettingsSnapshot {
  /** Selected theme; `none` leaves the shipped theme active. */
  theme: ThemeChoice
  /** Background image as a data URL, or null when none is set. */
  background: string | null
  /** Brand-title override; empty keeps the shipped fallback. */
  title: string
}

/** Write verbs for the panel. */
export interface ThemeSettingsActions {
  setTheme(theme: ThemeChoice): void
  setBackground(url: string): void
  clearBackground(): void
  setTitle(value: string): void
}

/** The shared observable source plus its write verbs. */
export interface ThemeSettingsSource extends HostObservable<ThemeSettingsSnapshot> {
  actions: ThemeSettingsActions
}

/** localStorage identity for theme, background, and title. */
export const STORAGE_KEY = 'dsh.theme-bg-settings.v1'

interface PersistedShape {
  theme: ThemeChoice
  background: string | null
  title: string
}

function readStored(): PersistedShape | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as PersistedShape
    if (parsed === null || typeof parsed !== 'object') return null
    return {
      theme: parsed.theme === 'tokyo-night' ? 'tokyo-night' : 'none',
      background: typeof parsed.background === 'string' && parsed.background.startsWith('data:')
        ? parsed.background
        : null,
      title: typeof parsed.title === 'string' ? parsed.title : '',
    }
  } catch {
    return null
  }
}

function writeStored(value: PersistedShape): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* quota or disabled storage: keep the in-memory source only */
  }
}

/**
 * Create the panel source, seeded from localStorage.
 * @returns a stable-until-change snapshot source whose actions persist.
 */
export function createThemeSettingsSource(): ThemeSettingsSource {
  const persisted = readStored()
  let snapshot: ThemeSettingsSnapshot = Object.freeze({
    theme: persisted === null ? 'none' : persisted.theme,
    background: persisted === null ? null : persisted.background,
    title: persisted === null ? '' : persisted.title,
  })
  const listeners = new Set<() => void>()
  const notify = (): void => { for (const fn of listeners) fn() }
  const update = (patch: Partial<ThemeSettingsSnapshot>): void => {
    snapshot = Object.freeze({ ...snapshot, ...patch })
    writeStored(snapshot)
    notify()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    actions: {
      setTheme: (theme) => { if (theme !== snapshot.theme) update({ theme }) },
      setBackground: (url) => { if (url !== snapshot.background) update({ background: url }) },
      clearBackground: () => { if (snapshot.background !== null) update({ background: null }) },
      setTitle: (value) => { if (value !== snapshot.title) update({ title: value }) },
    },
  }
}
