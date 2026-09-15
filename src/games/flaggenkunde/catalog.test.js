import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { flagCatalog, getFlagsForCollection } from './catalog.js'

describe('Flaggenkunde-Katalog', () => {
  it('enthält 720 eindeutige und vollständig lokale Flaggen', () => {
    expect(flagCatalog).toHaveLength(720)
    expect(new Set(flagCatalog.map((flag) => flag.id)).size).toBe(720)
    for (const flag of flagCatalog) {
      expect(flag.name).toBeTruthy()
      expect(flag.image).toMatch(/^\/assets\/flags\//)
      expect(flag.visualKey).toMatch(/^[a-f0-9]{16}$/)
      expect(existsSync(path.join(process.cwd(), 'public', flag.image.replace(/^\//, ''))), flag.image).toBe(true)
      if (flag.kind === 'region') {
        expect(flag.parent).toBeTruthy()
        expect(flag.locationMap).toMatch(/^\/assets\/flags\/maps\//)
        expect(existsSync(path.join(process.cwd(), 'public', flag.locationMap.replace(/^\//, ''))), flag.locationMap).toBe(true)
      }
    }
  })

  it('deckt die gewünschten regionalen Sammlungen vollständig ab', () => {
    expect(getFlagsForCollection('countries')).toHaveLength(254)
    expect(getFlagsForCollection('us-states')).toHaveLength(51)
    expect(getFlagsForCollection('germany')).toHaveLength(16)
    expect(getFlagsForCollection('austria')).toHaveLength(9)
    expect(getFlagsForCollection('netherlands')).toHaveLength(12)
    expect(getFlagsForCollection('switzerland')).toHaveLength(26)
    expect(getFlagsForCollection('belgium')).toHaveLength(13)
    expect(getFlagsForCollection('czechia')).toHaveLength(14)
    expect(getFlagsForCollection('croatia')).toHaveLength(21)
    expect(getFlagsForCollection('slovakia')).toHaveLength(8)
    expect(getFlagsForCollection('sweden')).toHaveLength(21)
    expect(getFlagsForCollection('mexico')).toHaveLength(32)
    expect(getFlagsForCollection('colombia')).toHaveLength(33)
    expect(getFlagsForCollection('chile')).toHaveLength(16)
    expect(getFlagsForCollection('malaysia')).toHaveLength(16)
    expect(getFlagsForCollection('japan')).toHaveLength(47)
  })

  it('rendert die zuvor beschädigten SVG-Quellen als vollwertige Bilddateien', async () => {
    const repairedCodes = ['JP-25', 'BR-MA', 'BR-MT', 'BR-PB', 'BR-PI', 'BR-PR', 'AR-P', 'AR-T', 'AR-W']
    for (const code of repairedCodes) {
      const imagePath = path.join(process.cwd(), 'public', 'assets', 'flags', 'regions', `${code}.webp`)
      const metadata = await sharp(imagePath).metadata()
      const stats = await sharp(imagePath).stats()
      expect(metadata.width, code).toBe(720)
      expect(metadata.height, code).toBeGreaterThan(350)
      expect(stats.entropy, code).toBeGreaterThan(0.9)
    }
  })
})
