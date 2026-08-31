// @vitest-environment jsdom
/** BrandTitle occupant: follows the shared title live. */

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { BrandTitle } from '../src/client/BrandTitle.tsx'
import type { BrandTitleProps } from '../src/client/BrandTitle.tsx'
import { createThemeSettingsSource } from '../src/client/theme-settings.ts'

afterEach(cleanup)
beforeEach(() => { localStorage.clear() })
afterEach(() => { localStorage.clear() })

describe('theme-background brand title', () => {
  it('renders the current title and follows its changes', () => {
    const settings = createThemeSettingsSource()
    const props = {
      useSettings: bindSnapshotSelector(settings),
    } as unknown as BrandTitleProps
    settings.actions.setTitle('My DSH')
    const view = render(<BrandTitle {...props} />)
    expect(view.container.textContent).toBe('My DSH')

    act(() => { settings.actions.setTitle('Renamed') })
    expect(view.container.textContent).toBe('Renamed')
  })
})
