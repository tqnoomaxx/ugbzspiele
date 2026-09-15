import { flagCatalog } from './catalog.generated.js'
import { europeMapTargets } from './mapManifest.generated.js'

export const flagCollections = [
  { id: 'all', title: 'Alle Flaggen', shortTitle: 'Alle', group: 'Komplett', symbol: '◎', description: 'Die komplette Sammlung aus Ländern, Gebieten und Regionen.', featured: true },
  { id: 'random', title: 'Überraschungsmix', shortTitle: 'Zufall', group: 'Komplett', symbol: '✦', description: 'Ein bunter Zufallsmix aus der gesamten Sammlung.', featured: true },
  { id: 'europe-hyper', title: 'Europa-Hypermodus', shortTitle: 'Europa Hyper', group: 'Komplett', symbol: '⚡', description: `${europeMapTargets.length} Gebiete auf einer Europakarte – finde jedes davon.`, featured: true, quizMode: 'europe-map' },
  { id: 'countries', title: 'Länder & Gebiete', shortTitle: 'Weltweit', group: 'Welt', symbol: '◉', description: 'Staaten, Territorien und ausgewählte internationale Flaggen.' },
  { id: 'europe', title: 'Europa', group: 'Welt', symbol: 'EU', continent: 'europe', description: 'Länder und Gebiete Europas.' },
  { id: 'africa', title: 'Afrika', group: 'Welt', symbol: 'AF', continent: 'africa', description: 'Länder und Gebiete Afrikas.' },
  { id: 'asia', title: 'Asien', group: 'Welt', symbol: 'AS', continent: 'asia', description: 'Länder und Gebiete Asiens.' },
  { id: 'north-america', title: 'Nordamerika & Karibik', group: 'Welt', symbol: 'NA', continent: 'north-america', description: 'Nord- und Mittelamerika sowie die Karibik.' },
  { id: 'south-america', title: 'Südamerika', group: 'Welt', symbol: 'SA', continent: 'south-america', description: 'Länder und Gebiete Südamerikas.' },
  { id: 'oceania', title: 'Ozeanien', group: 'Welt', symbol: 'OZ', continent: 'oceania', description: 'Australien, Pazifikstaaten und Inselgebiete.' },
  { id: 'germany', title: 'Deutsche Bundesländer', shortTitle: 'Deutschland', group: 'Europa regional', symbol: 'DE', description: 'Alle 16 Bundesländer.' },
  { id: 'austria', title: 'Österreichische Bundesländer', shortTitle: 'Österreich', group: 'Europa regional', symbol: 'AT', description: 'Alle neun Bundesländer.' },
  { id: 'netherlands', title: 'Niederländische Provinzen', shortTitle: 'Niederlande', group: 'Europa regional', symbol: 'NL', description: 'Alle zwölf Provinzen.' },
  { id: 'switzerland', title: 'Schweizer Kantone', shortTitle: 'Schweiz', group: 'Europa regional', symbol: 'CH', description: 'Alle 26 Kantone.' },
  { id: 'spain', title: 'Spanische Regionen', shortTitle: 'Spanien', group: 'Europa regional', symbol: 'ES', description: 'Autonome Gemeinschaften sowie Ceuta und Melilla.' },
  { id: 'italy', title: 'Italienische Regionen', shortTitle: 'Italien', group: 'Europa regional', symbol: 'IT', description: 'Alle 20 Regionen.' },
  { id: 'poland', title: 'Polnische Woiwodschaften', shortTitle: 'Polen', group: 'Europa regional', symbol: 'PL', description: 'Alle 16 Woiwodschaften.' },
  { id: 'belgium', title: 'Belgische Regionen & Provinzen', shortTitle: 'Belgien', group: 'Europa regional', symbol: 'BE', description: 'Drei Regionen und alle zehn Provinzen.' },
  { id: 'czechia', title: 'Tschechische Regionen', shortTitle: 'Tschechien', group: 'Europa regional', symbol: 'CZ', description: 'Alle 13 Regionen plus Prag.' },
  { id: 'croatia', title: 'Kroatische Gespanschaften', shortTitle: 'Kroatien', group: 'Europa regional', symbol: 'HR', description: 'Alle 20 Gespanschaften plus Zagreb.' },
  { id: 'slovakia', title: 'Slowakische Regionen', shortTitle: 'Slowakei', group: 'Europa regional', symbol: 'SK', description: 'Alle acht Verwaltungsregionen.' },
  { id: 'sweden', title: 'Schwedische Län', shortTitle: 'Schweden', group: 'Europa regional', symbol: 'SE', description: 'Alle 21 Verwaltungsbezirke als Wappenbanner.' },
  { id: 'united-kingdom', title: 'Landesteile des UK', shortTitle: 'Vereinigtes Königreich', group: 'Europa regional', symbol: 'UK', description: 'England, Schottland, Wales und Nordirland.' },
  { id: 'us-states', title: 'US-Bundesstaaten', shortTitle: 'USA', group: 'Amerika regional', symbol: 'US', description: 'Alle 50 Bundesstaaten plus Washington, D.C.' },
  { id: 'canada', title: 'Kanadische Provinzen', shortTitle: 'Kanada', group: 'Amerika regional', symbol: 'CA', description: 'Alle Provinzen und Territorien.' },
  { id: 'mexico', title: 'Mexikanische Bundesstaaten', shortTitle: 'Mexiko', group: 'Amerika regional', symbol: 'MX', description: 'Alle 32 Gliedstaaten – teils als gebräuchlicher Wappenbanner.' },
  { id: 'brazil', title: 'Brasilianische Bundesstaaten', shortTitle: 'Brasilien', group: 'Amerika regional', symbol: 'BR', description: 'Alle 26 Bundesstaaten plus Bundesdistrikt.' },
  { id: 'argentina', title: 'Argentinische Provinzen', shortTitle: 'Argentinien', group: 'Amerika regional', symbol: 'AR', description: 'Alle 23 Provinzen plus Buenos Aires.' },
  { id: 'colombia', title: 'Kolumbianische Departamentos', shortTitle: 'Kolumbien', group: 'Amerika regional', symbol: 'CO', description: 'Alle 32 Departamentos plus Bogotá.' },
  { id: 'chile', title: 'Chilenische Regionen', shortTitle: 'Chile', group: 'Amerika regional', symbol: 'CL', description: 'Alle 16 Regionen des Landes.' },
  { id: 'malaysia', title: 'Malaysische Gliedstaaten', shortTitle: 'Malaysia', group: 'Asien regional', symbol: 'MY', description: '13 Gliedstaaten und drei Bundesterritorien.' },
  { id: 'australia', title: 'Australische Staaten', shortTitle: 'Australien', group: 'Pazifik regional', symbol: 'AU', description: 'Bundesstaaten und große Territorien.' },
  { id: 'japan', title: 'Japanische Präfekturen', shortTitle: 'Japan', group: 'Pazifik regional', symbol: 'JP', description: 'Alle 47 Präfekturen.' },
]

const collectionById = new Map(flagCollections.map((collection) => [collection.id, collection]))
export const flagById = new Map([...europeMapTargets, ...flagCatalog].map((flag) => [flag.id, flag]))

export function getCollection(id) {
  return collectionById.get(id) ?? collectionById.get('countries')
}

export function getFlagsForCollection(id) {
  const collection = getCollection(id)
  if (collection.id === 'all' || collection.id === 'random') return flagCatalog
  if (collection.id === 'europe-hyper') return europeMapTargets.map((target) => flagById.get(target.id))
  if (collection.continent) {
    return flagCatalog.filter((flag) => flag.kind === 'country' && flag.continent === collection.continent)
  }
  return flagCatalog.filter((flag) => flag.collection === collection.id)
}

export function getCollectionCount(id) {
  return getFlagsForCollection(id).length
}

export { flagCatalog }
