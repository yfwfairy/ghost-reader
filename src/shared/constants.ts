import type { ColorTheme } from './types'

export const SUPPORTED_BOOK_FORMATS = ['.txt', '.epub'] as const

export const DEFAULT_WINDOW_SIZE = {
  width: 1100,
  height: 800,
} as const

export const DEFAULT_APP_CONFIG = {
  fontSize: 16,
  lineHeight: 1.8,
  fontFamily: 'Newsreader',
  glassIntensity: 85,
  colorTheme: 'obsidian',
  appearance: 'dark',
  appearanceFollowSystem: false,
  currentBookId: null,
  alwaysOnTop: false,
  language: 'en',
} as const

// 主题色定义：bg=背景, text=文字, accent=强调色
export interface ThemeColors {
  bg: string
  text: string
  accent: string
}

export const THEME_MAP: Record<ColorTheme, ThemeColors> = {
  obsidian: { bg: '#121212', text: '#e7e5e4', accent: '#c6c6c7' },

  parchment: {
    bg: '#c6beb1',      // RGB(50, 47, 42) 深米灰，约原色 25% 明度
    text: '#342924ff',    // RGB(232, 228, 220) 浅米灰，柔和阅读色
    accent: '#ac9f8a'   // RGB(198, 190, 177) 原色作为强调色
  },

  midnight: {
    bg: '#2a2d3a',      // 灰蓝黑，比纯黑柔和
    text: '#a8aeb8',    // 冷灰，降低蓝紫感
    accent: '#8e9aaf'   // 雾霾蓝灰，低调高级
  },

  onyx: {
    bg: '#363a40',      // 暖石墨灰
    text: '#aeb2b8',    // 中性浅灰
    accent: '#9aa4b0'   // 钢蓝灰，内敛冷静
  },

  ember: {
    bg: '#3d322e',      // 深褐灰，像陶土
    text: '#d4c8c0',    // 米灰，温暖不跳
    accent: '#c4a88c'   // 奶茶棕，莫兰迪暖调
  },

  forest: {
    bg: '#2a332e',      // 深橄榄灰绿
    text: '#b8c4b8',    // 灰薄荷，自然柔和
    accent: '#8fa88f'   // 灰豆绿，像 dried sage
  },

  ocean: {
    bg: '#2a343d',      // 深海灰蓝
    text: '#b0c0c8',    // 雾蓝灰，沉静
    accent: '#8fa8b0'   // 灰青，像褪色的海
  },

  slate: {
    bg: '#3a3d42',      // 暖石板灰
    text: '#c0c4c8',    // 珍珠灰
    accent: '#a0a8b0'   // 银灰，最中性
  }
}

// hex → RGB 三元组字符串，用于 CSS 变量
export function hexToRgbTriplet(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
