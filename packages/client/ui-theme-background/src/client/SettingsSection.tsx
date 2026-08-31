/** Custom theme & background settings page: title, theme picker, background. */

import type {
  InjectFace, PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type {
  ThemeChoice, ThemeSettingsActions, ThemeSettingsSource,
} from './theme-settings.ts'
import css from './SettingsSection.module.css'

/** Registration-side business face for the section. */
export interface SettingsSectionInjected {
  hooks: {
    /** The shared panel source. */
    settings: ThemeSettingsSource
  }
  /** Panel write verbs. */
  actions: ThemeSettingsActions
}

/** Props the renderer binds for the section. */
export type SettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'customTheme'>
  & InjectFace<SettingsSectionInjected>

/** Longest image edge kept when persisting a background (data-URL budget). */
const MAX_IMAGE_EDGE = 1920

/**
 * Re-encode an image file to a downscaled WebP data URL (PNG fallback) so a
 * persisted background always fits the localStorage quota.
 * @param file - the picked image file.
 * @returns the data URL, or null when the image cannot be read.
 */
function downscaleImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
      const width = Math.max(1, Math.round(img.naturalWidth * scale))
      const height = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl)
        if (blob === null) { resolve(null); return }
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      }, 'image/webp', 0.85)
    }
    /* v8 ignore next -- a malformed pick is a user-input error path. */
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null) }
    img.src = objectUrl
  })
}

const THEME_OPTIONS: readonly ThemeChoice[] = ['none', 'tokyo-night']

/** Render one Theme page whose live values arrive from the shared source. */
export function SettingsSection({ t, useSettings, actions }: SettingsSectionProps) {
  const snap = useSettings(s => s)
  const onFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    void downscaleImage(file).then((url) => { if (url !== null) actions.setBackground(url) })
  }
  return (
    <div className={css.section}>
      <h3 className={css.heading}>{t('title.heading')}</h3>
      <input
        type="text"
        className={css.input}
        placeholder={t('title.placeholder')}
        value={snap.title}
        onChange={(event) => { actions.setTitle(event.target.value) }}
      />
      <p className={css.hint}>{t('title.hint')}</p>

      <h3 className={css.heading}>{t('theme.heading')}</h3>
      <div className={css.options}>
        {THEME_OPTIONS.map(choice => (
          <button
            key={choice}
            type="button"
            className={css.option}
            aria-pressed={snap.theme === choice}
            onClick={() => { actions.setTheme(choice) }}
          >
            <span className={css.dot} />
            <span>{choice === 'none' ? t('theme.none') : t('theme.tokyoNight')}</span>
          </button>
        ))}
      </div>
      <p className={css.hint}>{t('theme.hint')}</p>

      <h3 className={css.heading}>{t('background.heading')}</h3>
      <p className={css.hint}>{t('background.hint')}</p>
      {snap.background === null
        ? <p className={css.hint}>{t('background.empty')}</p>
        : <img className={css.preview} src={snap.background} alt={t('background.previewAlt')} />}
      <div className={css.buttons}>
        <label className={css.button}>
          {snap.background === null ? t('background.set') : t('background.update')}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        </label>
        <button
          type="button"
          className={css.button}
          disabled={snap.background === null}
          onClick={() => { actions.clearBackground() }}
        >
          {t('background.clear')}
        </button>
      </div>
    </div>
  )
}
