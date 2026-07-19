import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildMemoryManifest,
  generateMemoryManifest,
  serializeMemoryManifest,
} from '../../../scripts/generate-memory-manifest.js'

const temporaryDirectories = []

function fakePng(width, height, uniqueByte) {
  const buffer = Buffer.alloc(40)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0)
  buffer.writeUInt32BE(13, 8)
  buffer.write('IHDR', 12, 'ascii')
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  buffer[39] = uniqueByte
  return buffer
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ugbz-memory-manifest-'))
  temporaryDirectories.push(root)
  const pairsDirectory = path.join(root, 'pairs')
  await mkdir(pairsDirectory)
  return { root, pairsDirectory, labelsPath: path.join(root, 'labels.json') }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('memory manifest generator', () => {
  it('remains hidden with five images and becomes ready at six', async () => {
    const files = await fixture()
    for (let index = 1; index <= 5; index += 1) await writeFile(path.join(files.pairsDirectory, `motiv-${index}.png`), fakePng(512, 512, index))
    expect((await buildMemoryManifest(files)).manifest.ready).toBe(false)

    await writeFile(path.join(files.pairsDirectory, 'motiv-6.png'), fakePng(640, 640, 6))
    const result = await buildMemoryManifest(files)
    expect(result.manifest.ready).toBe(true)
    expect(result.manifest.schemaVersion).toBe(2)
    expect(result.manifest.sets[0].id).toBe('_root')
    expect(result.manifest.sets[0].cards).toHaveLength(6)
    expect(result.manifest.sets[0].availablePairCounts).toEqual([6])
  })

  it('accepts camera filenames but excludes duplicates, HEIC, small and extreme images deterministically', async () => {
    const files = await fixture()
    await writeFile(path.join(files.labelsPath), JSON.stringify({ 'motiv-1': 'Mein Motiv' }))
    await writeFile(path.join(files.pairsDirectory, 'IMG_9001.PNG'), fakePng(700, 512, 9))
    await writeFile(path.join(files.pairsDirectory, 'motiv-1.png'), fakePng(512, 512, 1))
    await writeFile(path.join(files.pairsDirectory, 'motiv-2.png'), fakePng(512, 512, 1))
    await writeFile(path.join(files.pairsDirectory, 'IMG_1234.heic'), Buffer.from('not-a-browser-image'))
    await writeFile(path.join(files.pairsDirectory, 'motiv-4.png'), fakePng(200, 200, 4))
    await writeFile(path.join(files.pairsDirectory, 'motiv-5.png'), fakePng(1200, 512, 5))

    const first = await buildMemoryManifest(files)
    const second = await buildMemoryManifest(files)
    expect(first).toEqual(second)
    expect(first.manifest.sets[0].cards).toHaveLength(2)
    expect(first.manifest.sets[0].cards.find((card) => card.id === 'motiv-1')?.label).toBe('Mein Motiv')
    expect(first.manifest.sets[0].cards.find((card) => card.id === 'img-9001')?.label).toBe('Foto 1')
    expect(first.warnings).toHaveLength(4)
    expect(serializeMemoryManifest(first.manifest)).not.toContain('generatedAt')
  })

  it('turns every direct subfolder into an independently playable set', async () => {
    const files = await fixture()
    for (const folder of ['familie', 'urlaub-2026']) await mkdir(path.join(files.pairsDirectory, folder))
    for (let index = 1; index <= 6; index += 1) {
      await writeFile(path.join(files.pairsDirectory, 'familie', `foto-${index}.png`), fakePng(512, 700, index))
      await writeFile(path.join(files.pairsDirectory, 'urlaub-2026', `foto-${index}.png`), fakePng(700, 512, index))
    }

    const result = await buildMemoryManifest(files)
    expect(result.manifest.sets.map((set) => set.id)).toEqual(['familie', 'urlaub-2026'])
    expect(result.manifest.sets.map((set) => set.label)).toEqual(['Familie', 'Urlaub 2026'])
    expect(result.manifest.sets.every((set) => set.ready)).toBe(true)
    expect(result.manifest.sets[0].cards[0].src).toMatch(/^\/assets\/memory\/pairs\/familie\//)
    expect(result.manifest.sets[0].fingerprint).not.toBe(result.manifest.sets[1].fingerprint)
  })

  it('writes matching bundled and public manifests', async () => {
    const files = await fixture()
    for (let index = 1; index <= 6; index += 1) await writeFile(path.join(files.pairsDirectory, `motiv-${index}.png`), fakePng(512, 512, index))
    const outputFile = path.join(files.root, 'generatedManifest.js')
    const publicOutputFile = path.join(files.root, 'manifest.json')
    const result = await generateMemoryManifest({ ...files, outputFile, publicOutputFile })
    const publicManifest = JSON.parse(await readFile(publicOutputFile, 'utf8'))
    const bundledManifest = await readFile(outputFile, 'utf8')

    expect(publicManifest).toEqual(result.manifest)
    expect(bundledManifest).toContain(result.manifest.fingerprint)
    expect(publicManifest.ready).toBe(true)
  })
})
