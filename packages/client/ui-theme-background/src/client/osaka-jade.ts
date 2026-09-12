/**
 * The ReallySnazzy/osaka-jade `dark` palette mapped onto the DSH alias tokens.
 * Light and dark hold the same values so the override wins regardless of the
 * user's light/dark/system preference.
 */
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Osaka Jade token overrides, one layer for both color-scheme modes. */
export const OSAKA_JADE: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': { light: '#111c18', dark: '#111c18' },
  '--dsw-alias-bg-layer-1': { light: '#23372b', dark: '#23372b' },
  '--dsw-alias-bg-layer-2': { light: '#53685b', dark: '#53685b' },
  '--dsw-alias-bg-overlay': { light: '#23372b', dark: '#23372b' },
  '--dsw-alias-border-l1': { light: '#53685b', dark: '#53685b' },
  '--dsw-alias-border-l2': { light: '#8cd3cb', dark: '#8cd3cb' },
  '--dsw-alias-brand-primary': { light: '#2dd5b7', dark: '#2dd5b7' },
  '--dsw-alias-label-primary': { light: '#c1c497', dark: '#c1c497' },
  '--dsw-alias-label-secondary': { light: '#8cd3cb', dark: '#8cd3cb' },
  '--dsw-alias-state-error-primary': { light: '#ff5345', dark: '#ff5345' },
  '--dsw-alias-state-success-primary': { light: '#549e6a', dark: '#549e6a' },
  '--dsw-alias-state-warn-primary': { light: '#e5c736', dark: '#e5c736' },
  '--dsw-specific-sidebar-fill': { light: '#23372b', dark: '#23372b' },
}
