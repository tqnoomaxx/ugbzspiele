import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { flagCatalog, getFlagsForCollection } from './catalog.js'
import { cityCatalog, landmarkCatalog } from './geographyCatalog.js'
import { europeMapTargets, mapSetByFlagId } from './mapManifest.generated.js'

const loadMap = (id) => JSON.parse(readFileSync(path.join(process.cwd(), 'public/assets/flags/interactive', `${id}.json`), 'utf8'))

describe('Flaggenkunde-Katalog', () => {
  it('enthält 997 eindeutige und vollständig lokale Flaggen', () => {
    expect(flagCatalog).toHaveLength(997)
    expect(new Set(flagCatalog.map((flag) => flag.id)).size).toBe(997)
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
    expect(getFlagsForCollection('europe-hyper').length).toBeGreaterThan(800)
    expect(getFlagsForCollection('europe-fr')).toHaveLength(13)
    expect(getFlagsForCollection('europe-bg')).toHaveLength(1)
  })

  it('liefert Städte, Hauptstädte und Welterbe mit vollständig lokalen Quizbildern', async () => {
    expect(cityCatalog.filter((city) => city.capital).length).toBeGreaterThan(75)
    expect(cityCatalog.filter((city) => city.image)).toHaveLength(38)
    expect(landmarkCatalog).toHaveLength(34)
    expect(getFlagsForCollection('heritage-country-es')).toHaveLength(5)
    for (const item of [...cityCatalog.filter((city) => city.image), ...landmarkCatalog]) {
      const imagePath = path.join(process.cwd(), 'public', item.image.replace(/^\//, ''))
      expect(existsSync(imagePath), item.image).toBe(true)
      const metadata = await sharp(imagePath).metadata()
      expect(metadata.width, item.id).toBe(1200)
      expect(metadata.height, item.id).toBe(750)
    }
  })

  it('stellt für jede Regionalflagge und den Europa-Hypermodus anklickbare Geometrie bereit', () => {
    const regionMaps = [...new Set(Object.values(mapSetByFlagId))].map(loadMap)
    const europeHyperMap = loadMap('europe')
    const interactiveRegionIds = new Set(regionMaps.flatMap((map) => map.shapes.map((shape) => shape.flagId)))
    const regionalFlagIds = new Set(flagCatalog.filter((flag) => flag.kind === 'region').map((flag) => flag.id))
    expect(Object.keys(mapSetByFlagId)).toHaveLength(743)
    expect(new Set(Object.keys(mapSetByFlagId))).toEqual(regionalFlagIds)
    expect(interactiveRegionIds).toEqual(regionalFlagIds)
    expect(new Set(europeHyperMap.shapes.map((shape) => shape.flagId)).size).toBe(europeMapTargets.length)
    expect(europeHyperMap.shapes.map((shape) => shape.flagId).sort()).toEqual(europeMapTargets.map((target) => target.id).sort())
    for (const parent of ['Deutschland', 'Frankreich', 'Portugal', 'Norwegen', 'Ukraine', 'Rumänien', 'Griechenland', 'Ungarn']) {
      expect(europeMapTargets.filter((target) => target.parent === parent).length, parent).toBeGreaterThan(4)
    }
    expect(europeMapTargets.some((target) => target.name === 'Budapest')).toBe(true)
    expect(europeMapTargets.filter((target) => target.parent === 'Finnland')).toHaveLength(19)
    expect(europeMapTargets.some((target) => target.parent === 'Åland')).toBe(false)
    expect(europeHyperMap.backgroundPath.length).toBeGreaterThan(1000)
    for (const shape of [...regionMaps.flatMap((map) => map.shapes), ...europeHyperMap.shapes]) {
      expect(shape.d.length, shape.flagId).toBeGreaterThan(5)
      expect(shape.d, shape.flagId).not.toMatch(/NaN|Infinity/)
      expect(shape.bounds.every(Number.isFinite), shape.flagId).toBe(true)
      expect(shape.bounds[2] * shape.bounds[3], shape.flagId).toBeGreaterThan(0)
      const areas = shape.d.split('M').filter(Boolean).map((ring) => {
        const points = ring.replace(/Z$/, '').split('L').map((point) => point.split(' ').map(Number))
        return Math.abs(points.reduce((sum, [x, y], index) => {
          const [nextX, nextY] = points[(index + 1) % points.length]
          return sum + x * nextY - nextX * y
        }, 0)) / 2
      })
      expect(Math.max(...areas), `${shape.flagId}: anklickbare Fläche`).toBeGreaterThan(0.000001)
    }
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
