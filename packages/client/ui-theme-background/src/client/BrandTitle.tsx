/** Sidebar brand-name occupant while a custom title is set. */

import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { ThemeSettingsSource } from './theme-settings.ts'
import css from './BrandTitle.module.css'

/** Registration-side business face for the brand occupant. */
export interface BrandTitleInjected {
  hooks: {
    /** The shared panel source. */
    settings: ThemeSettingsSource
  }
}

/** Props the renderer binds for the brand occupant. */
export type BrandTitleProps = InjectFace<BrandTitleInjected>

/** Render the custom brand title, replacing the shipped fallback. */
export function BrandTitle({ useSettings }: BrandTitleProps) {
  return <span className={css.title}>{useSettings(s => s.title)}</span>
}
