import { promises as fs } from 'node:fs'
import { basename, extname } from 'node:path'
import chardet from 'chardet'
import iconv from 'iconv-lite'
import JSZip from 'jszip'
import { SUPPORTED_BOOK_FORMATS } from '@shared/constants'
import type { BookFormat, BookRecord } from '@shared/types'

const SUPPORTED_EXTENSION_SET = new Set<string>(SUPPORTED_BOOK_FORMATS)

function normalizeEncoding(encoding: string | null | undefined) {
  const candidate = encoding?.trim().toLowerCase() || 'utf-8'
  return iconv.encodingExists(candidate) ? candidate : 'utf-8'
}

function resolveBookFormat(filePath: string): BookFormat {
  const extension = extname(filePath).toLowerCase()
  if (extension === '.txt') return 'txt'
  if (extension === '.epub') return 'epub'
  throw new Error(`Unsupported book format for path: ${filePath}`)
}

export function pickSupportedPaths(paths: string[]) {
  return paths.filter((filePath) => SUPPORTED_EXTENSION_SET.has(extname(filePath).toLowerCase()))
}

export function decodeTxtBuffer(buffer: Buffer, encoding = 'utf-8') {
  return iconv.decode(buffer, normalizeEncoding(encoding))
}

export async function readTxtFile(filePath: string) {
  const buffer = await fs.readFile(filePath)
  const detected = chardet.detect(buffer)
  const encoding = typeof detected === 'string' ? detected : 'utf-8'
  return decodeTxtBuffer(buffer, encoding)
}

// 统计文本字数（去除空白字符）
function countCharacters(text: string) {
  return text.replace(/\s/g, '').length
}

// 从 HTML/XHTML 内容中提取纯文本
function stripHtmlTags(html: string) {
  return html.replace(/<[^>]*>/g, '')
}

async function countEpubCharacters(filePath: string) {
  try {
    const buffer = await fs.readFile(filePath)
    const zip = await JSZip.loadAsync(buffer)
    let total = 0

    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue
      if (!/\.(xhtml|html|htm)$/i.test(name)) continue
      const content = await entry.async('string')
      total += countCharacters(stripHtmlTags(content))
    }

    return total
  } catch {
    return undefined
  }
}

async function countTxtCharacters(filePath: string) {
  try {
    const content = await readTxtFile(filePath)
    return countCharacters(content)
  } catch {
    return undefined
  }
}

export async function readEpubFile(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath)
}

// MIME 类型映射
const IMAGE_MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

// 从 EPUB 中提取封面图片为 data URL
async function extractEpubCover(filePath: string): Promise<string | undefined> {
  try {
    const buffer = await fs.readFile(filePath)
    const zip = await JSZip.loadAsync(buffer)

    // 1. 解析 META-INF/container.xml 找到 OPF 路径
    const containerXml = await zip.file('META-INF/container.xml')?.async('string')
    if (!containerXml) return undefined

    const opfPathMatch = containerXml.match(/full-path="([^"]+)"/)
    if (!opfPathMatch) return undefined
    const opfPath = opfPathMatch[1]
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : ''

    // 2. 解析 OPF
    const opfXml = await zip.file(opfPath)?.async('string')
    if (!opfXml) return undefined

    // 解析所有 <item> 为 id → href 映射
    const itemMap = new Map<string, string>()
    const itemPropsMap = new Map<string, string>()
    const itemRegex = /<item\b([^>]*)\/?\s*>/g
    let itemExec: RegExpExecArray | null
    while ((itemExec = itemRegex.exec(opfXml)) !== null) {
      const attrs = itemExec[1]
      const id = attrs.match(/\bid="([^"]+)"/)
      const href = attrs.match(/\bhref="([^"]+)"/)
      const props = attrs.match(/\bproperties="([^"]+)"/)
      if (id && href) {
        itemMap.set(id[1], href[1])
        if (props) itemPropsMap.set(id[1], props[1])
      }
    }

    let coverHref: string | undefined

    // 策略 1: EPUB 3 — properties="cover-image"
    for (const [id, props] of itemPropsMap) {
      if (props.includes('cover-image')) {
        coverHref = itemMap.get(id)
        break
      }
    }

    // 策略 2: EPUB 2 — <meta name="cover" content="item-id" />
    if (!coverHref) {
      // 兼容 name/content 任意顺序
      const metaRegex = /<meta\b([^>]*)\/?\s*>/g
      let metaExec: RegExpExecArray | null
      while ((metaExec = metaRegex.exec(opfXml)) !== null) {
        const attrs = metaExec[1]
        const nameAttr = attrs.match(/\bname="cover"/)
        const contentAttr = attrs.match(/\bcontent="([^"]+)"/)
        if (nameAttr && contentAttr) {
          coverHref = itemMap.get(contentAttr[1])
          break
        }
      }
    }

    // 策略 3: id 包含 "cover" 且是图片类型的 item
    if (!coverHref) {
      for (const [id, href] of itemMap) {
        const ext = extname(href).toLowerCase()
        if (/cover/i.test(id) && ext in IMAGE_MIME_MAP) {
          coverHref = href
          break
        }
      }
    }

    // 策略 4: 在 ZIP 中搜索常见封面文件名
    if (!coverHref) {
      const commonNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'Cover.jpg', 'Cover.jpeg', 'Cover.png']
      for (const entry of Object.keys(zip.files)) {
        const entryName = entry.includes('/') ? entry.substring(entry.lastIndexOf('/') + 1) : entry
        if (commonNames.includes(entryName)) {
          // 直接用完整 ZIP 路径
          const imageFile = zip.file(entry)
          if (imageFile) {
            const imageBuffer = await imageFile.async('nodebuffer')
            const ext = extname(entry).toLowerCase()
            const mime = IMAGE_MIME_MAP[ext] || 'image/jpeg'
            return `data:${mime};base64,${imageBuffer.toString('base64')}`
          }
        }
      }
    }

    if (!coverHref) return undefined

    // 拼接 ZIP 内路径（始终用 / 分隔符）
    const imagePath = opfDir ? `${opfDir}/${coverHref}` : coverHref
    // 尝试拼接路径和直接路径
    const imageFile = zip.file(imagePath) ?? zip.file(coverHref)
    if (!imageFile) return undefined

    const imageBuffer = await imageFile.async('nodebuffer')
    const ext = extname(coverHref).toLowerCase()
    const mime = IMAGE_MIME_MAP[ext] || 'image/jpeg'
    return `data:${mime};base64,${imageBuffer.toString('base64')}`
  } catch {
    return undefined
  }
}

export async function buildBookRecord(filePath: string): Promise<BookRecord> {
  const format = resolveBookFormat(filePath)
  const baseTitle = basename(filePath, extname(filePath))
  const timestamp = Date.now()

  const wordCount =
    format === 'txt' ? await countTxtCharacters(filePath) : await countEpubCharacters(filePath)

  const coverDataUrl = format === 'epub' ? await extractEpubCover(filePath) : undefined

  return {
    id: `${format}:${filePath}`,
    title: baseTitle,
    author: 'Unknown',
    format,
    filePath,
    coverDataUrl,
    wordCount,
    importedAt: timestamp,
    updatedAt: timestamp,
  }
}
