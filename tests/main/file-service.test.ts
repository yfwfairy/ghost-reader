import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildBookRecord,
  decodeTxtBuffer,
  pickSupportedPaths,
  readTxtFile,
} from '../../src/main/file-service'

describe('file service helpers', () => {
  it('decodes gbk buffers to unicode', () => {
    const content = decodeTxtBuffer(Buffer.from([0xc4, 0xe3, 0xba, 0xc3]), 'gbk')
    expect(content).toBe('你好')
  })

  it('filters unsupported extensions', () => {
    const paths = pickSupportedPaths([
      '/tmp/demo.txt',
      '/tmp/demo.epub',
      '/tmp/demo.pdf',
      '/tmp/UPPER.TXT',
    ])

    expect(paths).toEqual(['/tmp/demo.txt', '/tmp/demo.epub', '/tmp/UPPER.TXT'])
  })
})

describe('buildBookRecord', () => {
  it('builds baseline txt and epub records from file paths', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)

    const txtRecord = await buildBookRecord('/tmp/hello-world.txt')
    const epubRecord = await buildBookRecord('/tmp/novel.epub')

    expect(txtRecord).toMatchObject({
      id: 'txt:/tmp/hello-world.txt',
      title: 'hello-world',
      author: 'Unknown',
      format: 'txt',
      filePath: '/tmp/hello-world.txt',
      importedAt: 1700000000000,
      updatedAt: 1700000000000,
    })

    expect(epubRecord).toMatchObject({
      id: 'epub:/tmp/novel.epub',
      title: 'novel',
      author: 'Unknown',
      format: 'epub',
      filePath: '/tmp/novel.epub',
      importedAt: 1700000000000,
      updatedAt: 1700000000000,
    })
  })
})

describe('readTxtFile', () => {
  it('reads utf-8 text files from disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ghost-reader-'))
    const filePath = join(dir, 'utf8-sample.txt')
    await writeFile(filePath, 'Ghost Reader sample')

    const content = await readTxtFile(filePath)
    expect(content).toContain('Ghost Reader')
  })
})
