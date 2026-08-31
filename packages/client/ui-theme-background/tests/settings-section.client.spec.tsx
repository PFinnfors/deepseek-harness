// @vitest-environment jsdom
/** SettingsSection behavior: title input, theme picker, background controls. */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { SettingsSection } from '../src/client/SettingsSection.tsx'
import type { SettingsSectionProps } from '../src/client/SettingsSection.tsx'
import { en } from '../src/client/locales.ts'
import { createThemeSettingsSource } from '../src/client/theme-settings.ts'

afterEach(cleanup)
beforeEach(() => { localStorage.clear() })
afterEach(() => { localStorage.clear() })

const t = (key: keyof typeof en): string => en[key]

function mount() {
  const settings = createThemeSettingsSource()
  const props = {
    t,
    useSettings: bindSnapshotSelector(settings),
    actions: settings.actions,
  } as unknown as SettingsSectionProps
  render(<SettingsSection {...props} />)
  return settings
}

describe('theme-background settings section', () => {
  it('renders the three blocks with their copy', () => {
    mount()
    expect(screen.getByText('Title')).toBeTruthy()
    expect(screen.getByText('Theme')).toBeTruthy()
    expect(screen.getByText('Background')).toBeTruthy()
    expect(screen.getByText('None')).toBeTruthy()
    expect(screen.getByText('Tokyo Night')).toBeTruthy()
    expect(screen.getByText('Set background')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear background' })).toHaveProperty('disabled', true)
  })

  it('updates the shared title as the field changes', () => {
    const settings = mount()
    const input = screen.getByPlaceholderText('DSH Local Build') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'My DSH' } })
    expect(settings.getSnapshot().title).toBe('My DSH')
    fireEvent.change(input, { target: { value: '' } })
    expect(settings.getSnapshot().title).toBe('')
  })

  it('selects a theme and reflects the press state', () => {
    const settings = mount()
    const tokyo = screen.getByRole('button', { name: 'Tokyo Night' })
    fireEvent.click(tokyo)
    expect(settings.getSnapshot().theme).toBe('tokyo-night')
    expect(tokyo.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'None' }))
    expect(settings.getSnapshot().theme).toBe('none')
  })

  it('switches between empty, set, and cleared background states', async () => {
    const settings = mount()
    expect(screen.getByText('No background image set.')).toBeTruthy()

    act(() => { settings.actions.setBackground('data:image/png;base64,AAAA') })
    expect(screen.getByAltText('Background image preview')).toHaveProperty('src', 'data:image/png;base64,AAAA')
    expect(screen.getByText('Update background')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear background' }))
    expect(settings.getSnapshot().background).toBeNull()
    expect(screen.getByText('No background image set.')).toBeTruthy()
  })
})
