// 10 种占位封面，浅色（小清新）+ 深色（莫兰迪）各一套
// 基于 book id 确定性选择，每本书始终显示同一封面

import { useConfig } from '../../hooks/useConfig'

type CoverPalette = {
  bg: string
  accent: string
}

// 暗色主题
const DARK_PALETTES: CoverPalette[] = [
  // 0 — 石墨青（对应你的 surface-variant）
  { bg: 'linear-gradient(145deg, #252626 0%, #1f2020 50%, #191a1a 100%)', accent: 'rgba(198, 198, 199, 0.4)' },
  // 1 — 暗夜蓝（对应你的 tertiary）
  { bg: 'linear-gradient(145deg, #2a3038 0%, #222830 50%, #1a2028 100%)', accent: 'rgba(176, 212, 240, 0.35)' },
  // 2 — 灰烬褐（暖灰调）
  { bg: 'linear-gradient(145deg, #2d2a28 0%, #252220 50%, #1d1a18 100%)', accent: 'rgba(200, 180, 160, 0.35)' },
  // 3 — 深海绿（低饱和）
  { bg: 'linear-gradient(145deg, #262d2a 0%, #1e2522 50%, #161d1a 100%)', accent: 'rgba(160, 200, 180, 0.35)' },
  // 4 — 紫晶灰（对应你的 secondary-dim）
  { bg: 'linear-gradient(145deg, #2e2c30 0%, #262428 50%, #1e1c20 100%)', accent: 'rgba(180, 160, 200, 0.35)' },
  // 5 — 铁锈棕（莫兰迪暖调）
  { bg: 'linear-gradient(145deg, #322e2c 0%, #2a2624 50%, #221e1c 100%)', accent: 'rgba(200, 160, 140, 0.35)' },
  // 6 — 雾蓝灰（冷调）
  { bg: 'linear-gradient(145deg, #2a2e32 0%, #22262a 50%, #1a1e22 100%)', accent: 'rgba(160, 180, 200, 0.35)' },
  // 7 — 墨玉绿（深邃）
  { bg: 'linear-gradient(145deg, #243028 0%, #1c2820 50%, #142018 100%)', accent: 'rgba(140, 180, 160, 0.35)' },
  // 8 — 砂岩灰（中性）
  { bg: 'linear-gradient(145deg, #303030 0%, #282828 50%, #202020 100%)', accent: 'rgba(180, 180, 180, 0.4)' },
  // 9 — 暗绛红（极低调）
  { bg: 'linear-gradient(145deg, #32282a 0%, #2a2022 50%, #22181a 100%)', accent: 'rgba(200, 140, 150, 0.3)' },
]

// 浅色主题
const LIGHT_PALETTES: CoverPalette[] = [
  // 0 — 宣纸白（主背景）
  { bg: 'linear-gradient(145deg, #f5f5f5 0%, #ebebeb 50%, #e0e0e0 100%)', accent: 'rgba(80, 80, 80, 0.25)' },
  // 1 — 雾蓝（冷灰）
  { bg: 'linear-gradient(145deg, #e8ecef 0%, #dde2e6 50%, #d2d8dd 100%)', accent: 'rgba(100, 120, 140, 0.25)' },
  // 2 — 米灰（暖调）
  { bg: 'linear-gradient(145deg, #f0ede8 0%, #e6e3de 50%, #dcd9d4 100%)', accent: 'rgba(140, 130, 120, 0.25)' },
  // 3 — 薄荷灰（极淡）
  { bg: 'linear-gradient(145deg, #e8f0ec 0%, #dde8e2 50%, #d2e0d8 100%)', accent: 'rgba(100, 130, 120, 0.25)' },
  // 4 — 薰衣草灰（淡紫）
  { bg: 'linear-gradient(145deg, #ece8f0 0%, #e2dde8 50%, #d8d2e0 100%)', accent: 'rgba(130, 120, 150, 0.25)' },
  // 5 — 烟粉（极淡）
  { bg: 'linear-gradient(145deg, #f0e8e8 0%, #e8dde0 50%, #e0d2d8 100%)', accent: 'rgba(150, 120, 130, 0.25)' },
  // 6 — 珍珠灰（中性）
  { bg: 'linear-gradient(145deg, #e8e8e8 0%, #dedede 50%, #d4d4d4 100%)', accent: 'rgba(100, 100, 100, 0.3)' },
  // 7 — 麦秆黄（淡暖）
  { bg: 'linear-gradient(145deg, #f0ece0 0%, #e6e2d6 50%, #dcd8cc 100%)', accent: 'rgba(140, 130, 100, 0.25)' },
  // 8 — 青石灰（冷绿）
  { bg: 'linear-gradient(145deg, #e0e8e4 0%, #d6e0da 50%, #ccd8d0 100%)', accent: 'rgba(100, 130, 120, 0.25)' },
  // 9 — 暮光灰（淡蓝紫）
  { bg: 'linear-gradient(145deg, #e4e6ec 0%, #d8dae2 50%, #ccced8 100%)', accent: 'rgba(120, 130, 160, 0.25)' },
]

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function truncateTitle(title: string, max = 8): string {
  return title.length > max ? title.slice(0, max) + '…' : title
}

type PlaceholderCoverProps = {
  bookId: string
  title: string
  className?: string
}

export function PlaceholderCover({ bookId, title, className = '' }: PlaceholderCoverProps) {
  const { config } = useConfig()
  const dark = config?.appearance !== 'light'
  const palettes = dark ? DARK_PALETTES : LIGHT_PALETTES
  const index = hashCode(bookId) % palettes.length
  const palette = palettes[index]

  return (
    <div className={`placeholder-cover ${className}`} style={{ background: palette.bg }}>
      <div className="placeholder-cover__glass" />
      <span className="placeholder-cover__title" style={{ color: palette.accent }}>
        {truncateTitle(title)}
      </span>
    </div>
  )
}
