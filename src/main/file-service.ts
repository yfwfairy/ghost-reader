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

export async function buildBookRecord(filePath: string): Promise<BookRecord> {
  const format = resolveBookFormat(filePath)
  const baseTitle = basename(filePath, extname(filePath))
  const timestamp = Date.now()

  const wordCount =
    format === 'txt' ? await countTxtCharacters(filePath) : await countEpubCharacters(filePath)

  return {
    id: `${format}:${filePath}`,
    title: baseTitle,
    author: 'Unknown',
    format,
    filePath,
    wordCount,
    importedAt: timestamp,
    updatedAt: timestamp,
  }
}
