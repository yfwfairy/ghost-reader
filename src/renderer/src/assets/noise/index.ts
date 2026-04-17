import type { ColorTheme } from '@shared/types'

import obsidian from './noise-obsidian.png'
import parchment from './noise-parchment.png'
import midnight from './noise-midnight.png'
import onyx from './noise-onyx.png'
import ember from './noise-ember.png'
import forest from './noise-forest.png'
import ocean from './noise-ocean.png'
import slate from './noise-slate.png'

// 每个阅读器主题色对应一张噪点纹理图
export const NOISE_MAP: Record<ColorTheme, string> = {
  obsidian,
  parchment,
  midnight,
  onyx,
  ember,
  forest,
  ocean,
  slate,
}
