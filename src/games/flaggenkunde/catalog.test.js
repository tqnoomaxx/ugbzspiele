import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { flagCatalog, getFlagsForCollection } from './catalog.js'

describe('Flaggenkunde-Katalog', () => {
  it('enthält 576 eindeutige und vollständig lokale Flaggen', () => {
    expect(flagCatalog).toHaveLength(576)
    expect(new Set(flagCatalog.map((flag) => flag.id)).size).toBe(576)
    for (const flag of flagCatalog) {
      expect(flag.name).toBeTruthy()
      expect(flag.image).toMatch(/^\/assets\/flags\//)
      expect(flag.visualKey).toMatch(/^[a-f0-9]{16}$/)
      expect(existsSync(path.join(process.cwd(), 'public', flag.image.replace(/^\//, ''))), flag.image).toBe(true)
    }
  })

  it('deckt die gewünschten regionalen Sammlungen vollständig ab', () => {
    expect(getFlagsForCollection('countries')).toHaveLength(254)
    expect(getFlagsForCollection('us-states')).toHaveLength(51)
    expect(getFlagsForCollection('germany')).toHaveLength(16)
    expect(getFlagsForCollection('austria')).toHaveLength(9)
    expect(getFlagsForCollection('netherlands')).toHaveLength(12)
    expect(getFlagsForCollection('switzerland')).toHaveLength(26)
    expect(getFlagsForCollection('japan')).toHaveLength(47)
  })
})
