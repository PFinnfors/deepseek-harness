// @vitest-environment jsdom
/** What the browser half registers, and that it all leaves with the fiber. */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { TOKYO_NIGHT } from '../src/client/tokyo-night.ts'
import type { SettingsSectionInjected } from '../src/client/SettingsSection.tsx'

// These specs assert the shipped Chinese copy: a fresh LocaleRuntime opens on
// FALLBACK_LOCALE (en) without a jsdom `window`, so the bench stages zh.

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const disposeOverride = vi.fn()
  const overrideTokens = vi.fn(() => disposeOverride)
  ctx.provide('theme', { overrideTokens } as never)
  const slots = ctx.get('slots') as SlotRegistry
  const declareRoot = slots.register({
    name: 'root',
    children: {
      'settings.section': { kind: 'list', scope: 'root' },
      'sidebar.brand.name': { kind: 'single', scope: 'root' },
    },
  } as never, () => null)
  return { ctx, slots, overrideTokens, disposeOverride, declareRoot }
}

describe('ui-theme-background apply', () => {
  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'theme'])
  })

  it('registers one Theme settings section with a locale-following label', async () => {
    const { ctx, slots } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()

    const section = slots.entries('settings.section')[0]!
    expect(section.options).toMatchObject({ id: 'theme', order: 5 })
    expect(resolveSlotLabel(section.options.label)).toBe('主题')
  })

  it('leaves the brand slot empty while the title is empty, then fills and empties it with the title', async () => {
    const { ctx, slots } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()

    expect(slots.entries('sidebar.brand.name')).toHaveLength(0)

    const section = slots.entries('settings.section')[0]!
    const face = (section.inject as unknown as () => SettingsSectionInjected)()
    face.actions.setTitle('My DSH')
    expect(slots.entries('sidebar.brand.name')).toHaveLength(1)

    face.actions.setTitle('')
    expect(slots.entries('sidebar.brand.name')).toHaveLength(0)
  })

  it('stacks the token override while Tokyo Night is selected and withdraws it otherwise', async () => {
    const { ctx, slots, overrideTokens, disposeOverride } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()

    const section = slots.entries('settings.section')[0]!
    const face = (section.inject as unknown as () => SettingsSectionInjected)()
    face.actions.setTheme('tokyo-night')
    expect(overrideTokens).toHaveBeenCalledWith('theme-background-settings', TOKYO_NIGHT)

    face.actions.setTheme('none')
    expect(disposeOverride).toHaveBeenCalled()
  })

  it('paints and clears the chat background stylesheet', async () => {
    const { ctx, slots } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()

    const section = slots.entries('settings.section')[0]!
    const face = (section.inject as unknown as () => SettingsSectionInjected)()
    face.actions.setBackground('data:image/png;base64,AAAA')
    const tag = document.head.querySelector('style[data-plugin-css="@deepseek-ai/dsh-client-ui-theme-background/chat-background"]')
    expect(tag?.textContent).toContain('[data-conversation-scroll]')
    expect(tag?.textContent).toContain('data:image/png;base64,AAAA')

    face.actions.clearBackground()
    expect(document.head.querySelector('style[data-plugin-css="@deepseek-ai/dsh-client-ui-theme-background/chat-background"]')).toBeNull()
  })

  it('withdraws every occupant and stylesheet with the fiber', async () => {
    const { ctx, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const section = slots.entries('settings.section')[0]!
    const face = (section.inject as unknown as () => SettingsSectionInjected)()
    face.actions.setTitle('My DSH')
    face.actions.setTheme('tokyo-night')
    face.actions.setBackground('data:image/png;base64,AAAA')
    expect(slots.entries('sidebar.brand.name')).toHaveLength(1)

    await fiber.dispose()
    expect(slots.entries('settings.section')).toHaveLength(0)
    expect(slots.entries('sidebar.brand.name')).toHaveLength(0)
    expect(document.head.querySelector('style[data-plugin="@deepseek-ai/dsh-client-ui-theme-background"]')).toBeNull()
  })
})
