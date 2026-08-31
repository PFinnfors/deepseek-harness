/**
 * The folke/tokyonight.nvim `night` palette mapped onto the DSH alias tokens.
 * Light and dark hold the same values so the override wins regardless of the
 * user's light/dark/system preference.
 */
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Tokyo Night token overrides, one layer for both color-scheme modes. */
export const TOKYO_NIGHT: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': { light: '#1a1b26', dark: '#1a1b26' },
  '--dsw-alias-bg-layer-1': { light: '#16161e', dark: '#16161e' },
  '--dsw-alias-bg-layer-2': { light: '#292e42', dark: '#292e42' },
  '--dsw-alias-bg-overlay': { light: '#16161e', dark: '#16161e' },
  '--dsw-alias-border-l1': { light: '#292e42', dark: '#292e42' },
  '--dsw-alias-border-l2': { light: '#414868', dark: '#414868' },
  '--dsw-alias-brand-primary': { light: '#7aa2f7', dark: '#7aa2f7' },
  '--dsw-alias-label-primary': { light: '#c0caf5', dark: '#c0caf5' },
  '--dsw-alias-label-secondary': { light: '#a9b1d6', dark: '#a9b1d6' },
  '--dsw-alias-state-error-primary': { light: '#f7768e', dark: '#f7768e' },
  '--dsw-alias-state-success-primary': { light: '#9ece6a', dark: '#9ece6a' },
  '--dsw-alias-state-warn-primary': { light: '#e0af68', dark: '#e0af68' },
  '--dsw-specific-sidebar-fill': { light: '#16161e', dark: '#16161e' },
}
