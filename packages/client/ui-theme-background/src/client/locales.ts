/** `customTheme` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': '主题',
  'title.heading': '品牌标题',
  'title.placeholder': 'DSH Local Build',
  'title.hint': '输入文字后覆盖侧边栏品牌标题；留空保持默认。',
  'theme.heading': '主题',
  'theme.none': '无',
  'theme.tokyoNight': 'Tokyo Night',
  'theme.hint': 'Tokyo Night 无视浅色/深色/跟随系统设置；选择“无”恢复默认主题。',
  'background.heading': '背景',
  'background.hint': '以低透明度铺满聊天区，独立于主题，保存于本浏览器。',
  'background.empty': '未设置背景。',
  'background.set': '设置背景',
  'background.update': '更新背景',
  'background.clear': '清除背景',
  'background.previewAlt': '背景预览',
} satisfies Record<string, string>

/** The custom theme & background panel key union. */
export type CustomThemeKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'nav': 'Theme',
  'title.heading': 'Title',
  'title.placeholder': 'DSH Local Build',
  'title.hint': 'Overrides the sidebar brand title while text is entered; empty keeps the default.',
  'theme.heading': 'Theme',
  'theme.none': 'None',
  'theme.tokyoNight': 'Tokyo Night',
  'theme.hint': 'Tokyo Night overrides the light/dark/system appearance; None keeps the default theme.',
  'background.heading': 'Background',
  'background.hint': 'Fills the chat area of the center column at low opacity, independent of the theme. Saved in this browser.',
  'background.empty': 'No background image set.',
  'background.set': 'Set background',
  'background.update': 'Update background',
  'background.clear': 'Clear background',
  'background.previewAlt': 'Background image preview',
} satisfies Record<CustomThemeKey, string>
