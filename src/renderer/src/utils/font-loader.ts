// 字体 CDN 映射 + 按需加载工具
// 用于替代 index.html 中的全量阻塞式字体加载

const FONT_CDN_MAP: Record<string, string> = {
  'Noto Serif SC':
    'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500;600;700&display=swap',
  'Noto Sans SC':
    'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap',
  'LXGW WenKai': 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css',
  'ShangTuDongGuanTi-Xi':
    'https://chinese-fonts-cdn.deno.dev/packages/stdgt/dist/%E4%B8%8A%E5%9B%BE%E4%B8%9C%E8%A7%82%E4%BD%93-%E7%BB%86%E4%BD%93/result.css',
  'Yozai': 'https://chinese-fonts-cdn.deno.dev/packages/yozai/dist/Yozai-Regular/result.css',
  'GuanKiapTsingKhai-W':
    'https://chinese-fonts-cdn.deno.dev/packages/GuanKiapTsingKhai/dist/GuanKiapTsingKhai-W/result.css',
  'Moon Stars Kai T HW':
    'https://chinese-fonts-cdn.deno.dev/packages/moon-stars-kai/dist/MoonStarsKaiTHW-Regular/result.css',
  'LXGW WenKai TC': 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-tc-webfont@1.7.0/style.css',
  Lora: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap',
  Newsreader:
    'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap',
  Merriweather:
    'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap',
  // Manrope：主文档已通过 index.html 加载，但 EPUB iframe 是隔离 document 需要注入
  Manrope:
    'https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;600;700;800&display=swap',
  // Inter 是系统字体，无需 CDN
}

// 已加载到主 document 的字体（幂等）
const loaded = new Set<string>()

/**
 * 向主 document 注入字体样式表（幂等）
 * 用于阅读器页面进入时 / 字体切换时按需加载
 */
export function loadFont(family: string): void {
  const url = FONT_CDN_MAP[family]
  if (!url || loaded.has(family)) return
  loaded.add(family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

/**
 * 向 EPUB iframe document 注入字体样式表（幂等）
 * 通过 querySelector 检查避免重复注入
 */
export function loadFontIntoDocument(doc: Document, family: string): void {
  const url = FONT_CDN_MAP[family]
  if (!url) return
  // 幂等：避免重复注入
  if (doc.querySelector(`link[href="${url}"]`)) return
  const link = doc.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  doc.head.appendChild(link)
}
