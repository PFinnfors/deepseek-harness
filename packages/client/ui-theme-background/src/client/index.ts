/**
 * Custom theme & background plugin, browser half: one `settings.section`
 * page (brand title field, None/Tokyo Night/Osaka Jade picker, background
 * controls) plus the apply-side effects the page drives — the theme token
 * override, the center-column chat background layer, and the conditional
 * sidebar brand-name occupant. All three read the one transient source
 * created here, which also persists to localStorage, so the choices survive
 * a refresh and this plugin's next run. Cross-plugin collaboration stays
 * type-only; copy rides the standard locale seat. Export discipline:
 * packages/client/AGENTS.md.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the renderer-owned slots service.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the settings shell's SlotMap merge ('settings.section').
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the sidebar's SlotMap merge ('sidebar.brand.name').
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the theme plugin's Context merge (ctx.theme).
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { BrandTitle, type BrandTitleInjected } from './BrandTitle.tsx'
import { SettingsSection, type SettingsSectionInjected } from './SettingsSection.tsx'
import { en, zh, type CustomThemeKey } from './locales.ts'
import { OSAKA_JADE } from './osaka-jade.ts'
import { createThemeSettingsSource } from './theme-settings.ts'
import { TOKYO_NIGHT } from './tokyo-night.ts'

export type { ThemeChoice, ThemeSettingsSnapshot, ThemeSettingsActions } from './theme-settings.ts'
export type { SettingsSectionInjected, SettingsSectionProps } from './SettingsSection.tsx'
export type { BrandTitleInjected, BrandTitleProps } from './BrandTitle.tsx'
export type { CustomThemeKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The custom theme & background panel's copy. */
    customTheme: CustomThemeKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'customTheme'
/** Package identity for style-tag ownership and token-layer source. */
const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-theme-background'
/** overrideTokens layer identity; re-calling with the same source replaces it. */
const OVERRIDE_SOURCE = 'theme-background-settings'

/** Required services: slot registry, copy, and the theme registry. */
export const inject = ['slots', 'locale', 'theme']

/**
 * Client plugin body: register the dictionaries and the settings page, and
 * drive the three apply-side effects from the shared source.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-theme-background: dictionaries')
  const settings = createThemeSettingsSource()

  // Theme token override: one layer while a named theme is selected.
  let disposeOverride: (() => void) | null = null
  const syncTheme = (): void => {
    if (disposeOverride !== null) { disposeOverride(); disposeOverride = null }
    const theme = settings.getSnapshot().theme
    if (theme === 'tokyo-night') {
      disposeOverride = ctx.theme.overrideTokens(OVERRIDE_SOURCE, TOKYO_NIGHT)
    } else if (theme === 'osaka-jade') {
      disposeOverride = ctx.theme.overrideTokens(OVERRIDE_SOURCE, OSAKA_JADE)
    }
  }
  ctx.effect(() => {
    syncTheme()
    const unsubscribe = settings.subscribe(syncTheme)
    return () => {
      unsubscribe()
      if (disposeOverride !== null) disposeOverride()
    }
  }, 'ui-theme-background: theme token override')

  // Center-column chat background: one stylesheet on the documented chat
  // scrollport seam, image scaled cover under a theme-aware base tint so text
  // and the scrollport's own gradient overlays stay readable above it.
  let styleTag: HTMLStyleElement | null = null
  const applyBackground = (): void => {
    if (styleTag !== null) { styleTag.remove(); styleTag = null }
    const url = settings.getSnapshot().background
    /* v8 ignore next -- the node half never runs client code; jsdom has document. */
    if (url === null || typeof document === 'undefined') return
    styleTag = document.createElement('style')
    styleTag.dataset.plugin = PACKAGE_NAME
    styleTag.dataset.pluginCss = `${PACKAGE_NAME}/chat-background`
    styleTag.textContent = [
      '[data-conversation-scroll] {',
      '  background-image: linear-gradient(color-mix(in srgb, var(--dsw-alias-bg-base) 78%, transparent), color-mix(in srgb, var(--dsw-alias-bg-base) 78%, transparent)), url("' + url + '");',
      '  background-size: auto, cover;',
      '  background-position: center, center;',
      '  background-repeat: no-repeat;',
      '}',
    ].join('\n')
    document.head.appendChild(styleTag)
  }
  ctx.effect(() => {
    applyBackground()
    const unsubscribe = settings.subscribe(applyBackground)
    return () => {
      unsubscribe()
      if (styleTag !== null) styleTag.remove()
      styleTag = null
    }
  }, 'ui-theme-background: chat background layer')

  // Brand-title occupant: registered only while a title is set, so an empty
  // field leaves the shipped 'DSH Local Build' fallback untouched.
  let brandDispose: (() => void) | null = null
  let lastTitle: string | null = null
  const syncBrand = (): void => {
    const title = settings.getSnapshot().title
    if (title === lastTitle) return
    lastTitle = title
    if (brandDispose !== null) { brandDispose(); brandDispose = null }
    if (title === '') return
    brandDispose = ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({
      name: 'sidebar.brand.name',
      inject: (): BrandTitleInjected => ({ hooks: { settings } }),
    }, BrandTitle))
  }
  ctx.effect(() => {
    syncBrand()
    const unsubscribe = settings.subscribe(syncBrand)
    return () => {
      unsubscribe()
      if (brandDispose !== null) brandDispose()
    }
  }, 'ui-theme-background: brand-title occupant')

  // The settings page.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'theme',
    order: 5,
    label: () => t('nav'),
    locale: NS,
    inject: (): SettingsSectionInjected => ({ hooks: { settings }, actions: settings.actions }),
  }, SettingsSection))
}
