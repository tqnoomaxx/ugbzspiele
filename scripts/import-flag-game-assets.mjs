import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const countrySource = process.env.FLAG_COUNTRY_SOURCE
const subdivisionSource = process.env.FLAG_SUBDIVISION_SOURCE
const skipImageProcessing = process.env.FLAG_SKIP_IMAGE_PROCESSING === '1'

if (!countrySource || !subdivisionSource) {
  console.error('FLAG_COUNTRY_SOURCE und FLAG_SUBDIVISION_SOURCE müssen auf die entpackten Quelldaten zeigen.')
  process.exit(1)
}

const countrySvgDir = path.join(countrySource, '3x2')
const subdivisionDataDir = path.join(subdivisionSource, 'data')
const outputRoot = path.join(root, 'public/assets/flags')
const countryOutput = path.join(outputRoot, 'countries')
const regionOutput = path.join(outputRoot, 'regions')
const generatedOutput = path.join(root, 'src/games/flaggenkunde/catalog.generated.js')

for (const required of [countrySvgDir, subdivisionDataDir]) {
  if (!existsSync(required)) throw new Error(`Quelldaten fehlen: ${required}`)
}

mkdirSync(countryOutput, { recursive: true })
mkdirSync(regionOutput, { recursive: true })
mkdirSync(path.dirname(generatedOutput), { recursive: true })

const countryModule = readFileSync(path.join(countrySource, 'modules/countries.json.js'), 'utf8')
const countryCodes = JSON.parse(countryModule.match(/\[[^;]+\]/)?.[0] ?? '[]')
  .filter((code) => /^[A-Z]{2}$/.test(code) && !['XA', 'XC', 'XO'].includes(code))
  .sort()

const displayNames = new Intl.DisplayNames(['de'], { type: 'region' })
const continentByRegion = {
  Africa: 'africa',
  Antarctica: 'other',
  Asia: 'asia',
  Europe: 'europe',
  Oceania: 'oceania',
}

function readSourceFlag(code) {
  return JSON.parse(readFileSync(path.join(subdivisionDataDir, `${code}.json`), 'utf8'))
}

function fileHash(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16)
}

function continentFor(source) {
  for (const region of source.region ?? []) {
    if (region === 'South America') return 'south-america'
    if (continentByRegion[region]) return continentByRegion[region]
  }
  if ((source.region ?? []).includes('Americas')) return 'north-america'
  return 'other'
}

const countryNameOverrides = {
  EU: 'Europäische Union',
  PS: 'Palästina',
  XK: 'Kosovo',
}

const flags = countryCodes.map((code) => {
  const sourceFile = path.join(subdivisionDataDir, `${code}.json`)
  const source = existsSync(sourceFile) ? readSourceFlag(code) : { region: [] }
  copyFileSync(path.join(countrySvgDir, `${code}.svg`), path.join(countryOutput, `${code}.svg`))
  return {
    id: `country-${code}`,
    code,
    name: countryNameOverrides[code] ?? displayNames.of(code),
    kind: 'country',
    collection: 'countries',
    continent: continentFor(source),
    image: `/assets/flags/countries/${code}.svg`,
    visualKey: fileHash(path.join(countryOutput, `${code}.svg`)),
  }
})

const codeGroups = {
  'us-states': Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))
    .flatMap((first) => Array.from({ length: 26 }, (_, index) => `US-${first}${String.fromCharCode(65 + index)}`))
    .filter((code) => existsSync(path.join(subdivisionDataDir, `${code}.json`))),
  germany: ['DE-BW', 'DE-BY', 'DE-BE', 'DE-BB', 'DE-HB', 'DE-HH', 'DE-HE', 'DE-MV', 'DE-NI', 'DE-NW', 'DE-RP', 'DE-SL', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'],
  austria: ['AT-1', 'AT-2', 'AT-3', 'AT-4', 'AT-5', 'AT-6', 'AT-7', 'AT-8', 'AT-9'],
  netherlands: ['NL-DR', 'NL-FL', 'NL-FR', 'NL-GE', 'NL-GR', 'NL-LI', 'NL-NB', 'NL-NH', 'NL-OV', 'NL-UT', 'NL-ZE', 'NL-ZH'],
  canada: ['CA-AB', 'CA-BC', 'CA-MB', 'CA-NB', 'CA-NL', 'CA-NS', 'CA-NT', 'CA-NU', 'CA-ON', 'CA-PE', 'CA-QC', 'CA-SK', 'CA-YT'],
  switzerland: ['CH-AG', 'CH-AI', 'CH-AR', 'CH-BE', 'CH-BL', 'CH-BS', 'CH-FR', 'CH-GE', 'CH-GL', 'CH-GR', 'CH-JU', 'CH-LU', 'CH-NE', 'CH-NW', 'CH-OW', 'CH-SG', 'CH-SH', 'CH-SO', 'CH-SZ', 'CH-TG', 'CH-TI', 'CH-UR', 'CH-VD', 'CH-VS', 'CH-ZG', 'CH-ZH'],
  australia: ['AU-ACT', 'AU-NSW', 'AU-NT', 'AU-QLD', 'AU-SA', 'AU-TAS', 'AU-VIC', 'AU-WA'],
  brazil: ['BR-AC', 'BR-AL', 'BR-AM', 'BR-AP', 'BR-BA', 'BR-CE', 'BR-DF', 'BR-ES', 'BR-GO', 'BR-MA', 'BR-MG', 'BR-MS', 'BR-MT', 'BR-PA', 'BR-PB', 'BR-PE', 'BR-PI', 'BR-PR', 'BR-RJ', 'BR-RN', 'BR-RO', 'BR-RR', 'BR-RS', 'BR-SC', 'BR-SE', 'BR-SP', 'BR-TO'],
  argentina: ['AR-A', 'AR-B', 'AR-C', 'AR-D', 'AR-E', 'AR-F', 'AR-G', 'AR-H', 'AR-J', 'AR-K', 'AR-L', 'AR-M', 'AR-N', 'AR-P', 'AR-Q', 'AR-R', 'AR-S', 'AR-T', 'AR-U', 'AR-V', 'AR-W', 'AR-X', 'AR-Y', 'AR-Z'],
  japan: Array.from({ length: 47 }, (_, index) => `JP-${String(index + 1).padStart(2, '0')}`),
  mexico: ['MX-AGU', 'MX-BCN', 'MX-BCS', 'MX-CHH', 'MX-CHP', 'MX-CMX', 'MX-COA', 'MX-COL', 'MX-DUR', 'MX-GRO', 'MX-GUA', 'MX-JAL', 'MX-MEX', 'MX-MIC', 'MX-MOR', 'MX-NAY', 'MX-NLE', 'MX-OAX', 'MX-PUE', 'MX-QUE', 'MX-ROO', 'MX-SIN', 'MX-SLP', 'MX-SON', 'MX-TAB', 'MX-TAM', 'MX-TLA', 'MX-VER', 'MX-YUC', 'MX-ZAC'],
  spain: ['ES-AN', 'ES-AR', 'ES-AS', 'ES-CB', 'ES-CL', 'ES-CM', 'ES-CT', 'ES-EX', 'ES-GA', 'ES-IB', 'ES-CN', 'ES-MC', 'ES-MD', 'ES-NC', 'ES-PV', 'ES-RI', 'ES-VC', 'ES-CE', 'ES-ML'],
  italy: ['IT-21', 'IT-23', 'IT-25', 'IT-32', 'IT-34', 'IT-36', 'IT-42', 'IT-45', 'IT-52', 'IT-55', 'IT-57', 'IT-62', 'IT-65', 'IT-67', 'IT-72', 'IT-75', 'IT-77', 'IT-78', 'IT-82', 'IT-88'],
  poland: ['PL-02', 'PL-04', 'PL-06', 'PL-08', 'PL-10', 'PL-12', 'PL-14', 'PL-16', 'PL-18', 'PL-20', 'PL-22', 'PL-24', 'PL-26', 'PL-28', 'PL-30', 'PL-32'],
}

const expectedCounts = {
  'us-states': 51,
  germany: 16,
  austria: 9,
  netherlands: 12,
  canada: 13,
  switzerland: 26,
  australia: 8,
  brazil: 27,
  argentina: 24,
  japan: 47,
  mexico: 30,
  spain: 19,
  italy: 20,
  poland: 16,
}

const nameOverrides = {
  'DE-BW': 'Baden-Württemberg', 'DE-BY': 'Bayern', 'DE-BE': 'Berlin', 'DE-BB': 'Brandenburg', 'DE-HB': 'Bremen', 'DE-HH': 'Hamburg', 'DE-HE': 'Hessen', 'DE-MV': 'Mecklenburg-Vorpommern', 'DE-NI': 'Niedersachsen', 'DE-NW': 'Nordrhein-Westfalen', 'DE-RP': 'Rheinland-Pfalz', 'DE-SL': 'Saarland', 'DE-SN': 'Sachsen', 'DE-ST': 'Sachsen-Anhalt', 'DE-SH': 'Schleswig-Holstein', 'DE-TH': 'Thüringen',
  'AT-1': 'Burgenland', 'AT-2': 'Kärnten', 'AT-3': 'Niederösterreich', 'AT-4': 'Oberösterreich', 'AT-5': 'Salzburg', 'AT-6': 'Steiermark', 'AT-7': 'Tirol', 'AT-8': 'Vorarlberg', 'AT-9': 'Wien',
  'NL-NB': 'Noord-Brabant', 'NL-NH': 'Noord-Holland', 'NL-ZH': 'Zuid-Holland',
  'CA-BC': 'Britisch-Kolumbien', 'CA-NB': 'New Brunswick', 'CA-NL': 'Neufundland und Labrador', 'CA-NS': 'Nova Scotia', 'CA-NT': 'Nordwest-Territorien', 'CA-PE': 'Prince Edward Island',
  'CH-FR': 'Freiburg', 'CH-GE': 'Genf', 'CH-NE': 'Neuenburg', 'CH-TI': 'Tessin', 'CH-VD': 'Waadt', 'CH-VS': 'Wallis',
  'AU-ACT': 'Australian Capital Territory', 'AU-NSW': 'New South Wales', 'AU-NT': 'Northern Territory', 'AU-QLD': 'Queensland', 'AU-SA': 'South Australia', 'AU-TAS': 'Tasmanien', 'AU-VIC': 'Victoria', 'AU-WA': 'Western Australia',
  'ES-AN': 'Andalusien', 'ES-AR': 'Aragón', 'ES-AS': 'Asturien', 'ES-CB': 'Kantabrien', 'ES-CL': 'Kastilien und León', 'ES-CM': 'Kastilien-La Mancha', 'ES-CT': 'Katalonien', 'ES-EX': 'Extremadura', 'ES-GA': 'Galicien', 'ES-IB': 'Balearische Inseln', 'ES-CN': 'Kanarische Inseln', 'ES-MC': 'Murcia', 'ES-MD': 'Madrid', 'ES-NC': 'Navarra', 'ES-PV': 'Baskenland', 'ES-RI': 'La Rioja', 'ES-VC': 'Valencianische Gemeinschaft', 'ES-CE': 'Ceuta', 'ES-ML': 'Melilla',
  'IT-21': 'Piemont', 'IT-23': 'Aostatal', 'IT-25': 'Lombardei', 'IT-32': 'Trentino-Südtirol', 'IT-34': 'Venetien', 'IT-36': 'Friaul-Julisch Venetien', 'IT-42': 'Ligurien', 'IT-45': 'Emilia-Romagna', 'IT-52': 'Toskana', 'IT-55': 'Umbrien', 'IT-57': 'Marken', 'IT-62': 'Latium', 'IT-65': 'Abruzzen', 'IT-67': 'Molise', 'IT-72': 'Kampanien', 'IT-75': 'Apulien', 'IT-77': 'Basilikata', 'IT-78': 'Kalabrien', 'IT-82': 'Sizilien', 'IT-88': 'Sardinien',
  'PL-02': 'Niederschlesien', 'PL-04': 'Kujawien-Pommern', 'PL-06': 'Lublin', 'PL-08': 'Lebus', 'PL-10': 'Łódź', 'PL-12': 'Kleinpolen', 'PL-14': 'Masowien', 'PL-16': 'Oppeln', 'PL-18': 'Karpatenvorland', 'PL-20': 'Podlachien', 'PL-22': 'Pommern', 'PL-24': 'Schlesien', 'PL-26': 'Heiligkreuz', 'PL-28': 'Ermland-Masuren', 'PL-30': 'Großpolen', 'PL-32': 'Westpommern',
  'MX-CMX': 'Mexiko-Stadt', 'MX-MEX': 'México', 'MX-MIC': 'Michoacán', 'MX-NLE': 'Nuevo León',
  'BR-AP': 'Amapá', 'BR-CE': 'Ceará', 'BR-ES': 'Espírito Santo', 'BR-GO': 'Goiás', 'BR-MA': 'Maranhão', 'BR-PA': 'Pará', 'BR-PB': 'Paraíba', 'BR-PR': 'Paraná', 'BR-PI': 'Piauí', 'BR-RO': 'Rondônia', 'BR-RJ': 'Rio de Janeiro', 'BR-SP': 'São Paulo',
  'AR-C': 'Buenos Aires (Stadt)', 'AR-X': 'Córdoba', 'AR-E': 'Entre Ríos', 'AR-Q': 'Neuquén', 'AR-R': 'Río Negro', 'AR-T': 'Tucumán',
}

// Die einfachen österreichischen Landesfarben sind mehrfach identisch. Für ein
// eindeutig lösbares Lernspiel verwenden wir deshalb die ebenfalls amtlichen,
// mit dem Landeswappen versehenen Varianten von Wikimedia Commons.
const regionalAssetOverrides = {
  'AT-1': ['https://upload.wikimedia.org/wikipedia/commons/9/95/Flag_of_Burgenland_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Burgenland_(state).svg'],
  'AT-2': ['https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Carinthia_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Carinthia_(state).svg'],
  'AT-3': ['https://upload.wikimedia.org/wikipedia/commons/b/b1/Flag_of_Lower_Austria_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Lower_Austria_(state).svg'],
  'AT-4': ['https://upload.wikimedia.org/wikipedia/commons/5/58/Flag_of_Upper_Austria_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Upper_Austria_(state).svg'],
  'AT-5': ['https://upload.wikimedia.org/wikipedia/commons/b/b5/Flag_of_Salzburg_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Salzburg_(state).svg'],
  'AT-6': ['https://upload.wikimedia.org/wikipedia/commons/5/57/Flag_of_Styria_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Styria_(state).svg'],
  'AT-7': ['https://upload.wikimedia.org/wikipedia/commons/2/25/Flag_of_Tirol_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Tirol_(state).svg'],
  'AT-8': ['https://upload.wikimedia.org/wikipedia/commons/a/a7/Flag_of_Vorarlberg_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Vorarlberg_(state).svg'],
  'AT-9': ['https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Vienna_%28state%29.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Vienna_(state).svg'],
}

const regionalRasterOverrides = {
  'MX-MIC': ['https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Flag_of_Michoacan.svg/960px-Flag_of_Michoacan.svg.png', 'https://commons.wikimedia.org/wiki/File:Flag_of_Michoacan.svg'],
  'MX-NAY': ['https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Flag_of_Nayarit.svg/960px-Flag_of_Nayarit.svg.png', 'https://commons.wikimedia.org/wiki/File:Flag_of_Nayarit.svg'],
}

function cleanSubdivisionName(name) {
  return name
    .replace(/ \([^)]*\)$/, '')
    .replace(/ Prefecture$/, '')
    .replace(/ Province$/, '')
    .replace(/ Region$/, '')
    .replace(/ Voivodeship$/, '')
    .replace(/ Metropolis$/, '')
}

for (const [collection, codes] of Object.entries(codeGroups)) {
  if (codes.length !== expectedCounts[collection]) {
    throw new Error(`${collection}: ${codes.length} statt ${expectedCounts[collection]} erwarteten Flaggen`)
  }
  for (const code of codes) {
    const source = readSourceFlag(code)
    const assetOverride = regionalAssetOverrides[code]
    const rasterOverride = regionalRasterOverrides[code]
    let svg = path.join(subdivisionDataDir, `${code}.svg`)
    if (assetOverride && !skipImageProcessing) {
      svg = path.join(regionOutput, `.${code}-source.svg`)
      execFileSync('curl', ['-sS', '-L', assetOverride[0], '-o', svg])
    }
    const png = path.join(regionOutput, `${code}.png`)
    const webp = path.join(regionOutput, `${code}.webp`)
    if (!skipImageProcessing) {
      if (rasterOverride) {
        execFileSync('curl', ['-sS', '-L', rasterOverride[0], '-o', png])
      } else {
        if (!existsSync(svg)) throw new Error(`Flaggenbild fehlt: ${svg}`)
        execFileSync('sips', ['-s', 'format', 'png', '--resampleWidth', '720', svg, '--out', png], { stdio: 'ignore' })
      }
      execFileSync('cwebp', ['-quiet', '-q', '84', '-m', '6', png, '-o', webp])
      rmSync(png)
      if (assetOverride) rmSync(svg)
    } else if (!existsSync(webp)) {
      throw new Error(`Bereits verarbeitetes Flaggenbild fehlt: ${webp}`)
    }
    flags.push({
      id: `region-${code}`,
      code,
      name: nameOverrides[code] ?? cleanSubdivisionName(source.name),
      kind: 'region',
      collection,
      continent: continentFor(source),
      image: `/assets/flags/regions/${code}.webp`,
      visualKey: fileHash(webp),
      source: assetOverride?.[1] ?? rasterOverride?.[1] ?? source.sources?.[0] ?? null,
    })
  }
}

for (const [code, name] of Object.entries({
  'GB-ENG': 'England',
  'GB-NIR': 'Nordirland',
  'GB-SCT': 'Schottland',
  'GB-WLS': 'Wales',
})) {
  copyFileSync(path.join(countrySvgDir, `${code}.svg`), path.join(regionOutput, `${code}.svg`))
  flags.push({
    id: `region-${code}`,
    code,
    name,
    kind: 'region',
    collection: 'united-kingdom',
    continent: 'europe',
    image: `/assets/flags/regions/${code}.svg`,
    visualKey: fileHash(path.join(regionOutput, `${code}.svg`)),
  })
}

flags.sort((a, b) => a.name.localeCompare(b.name, 'de'))

const banner = `// Automatisch erzeugt durch scripts/import-flag-game-assets.mjs.\n// Die Datei ist vollständig lokal und benötigt zur Laufzeit keine externe API.\n\n`
writeFileSync(generatedOutput, `${banner}export const flagCatalog = ${JSON.stringify(flags, null, 2)}\n`)

cpSync(path.join(countrySource, 'LICENSE'), path.join(outputRoot, 'LICENSE-country-flag-icons.txt'))
cpSync(path.join(subdivisionSource, 'LICENSE'), path.join(outputRoot, 'LICENSE-niemela-flags.txt'))

const attribution = `# Quellen und Lizenzen der Flaggen\n\n` +
  `Die ${countryCodes.length} Länder- und Gebietsflaggen stammen aus **country-flag-icons 1.6.20** und stehen unter der MIT-Lizenz. ` +
  `Die Lizenz liegt vollständig in \`LICENSE-country-flag-icons.txt\`.\n\n` +
  `Die ${flags.length - countryCodes.length - 4} regionalen Flaggen wurden aus dem Repository **niemela/flags** (Commit fee56aa5527e813b37c37f616b1bab0068f23963) übernommen, ` +
  `lokal auf 720 Pixel Breite gerastert und als WebP optimiert. Die Metadaten des Quell-Repositories stehen unter CC BY-SA 4.0; ` +
  `die einzelnen Flaggen behalten ihre jeweilige Ursprungslizenz. Die Quellseite jeder Regionalflagge ist im lokalen Katalog \`src/games/flaggenkunde/catalog.generated.js\` im Feld \`source\` vermerkt. ` +
  `Die vollständigen Lizenzhinweise des Quellbestands liegen in \`LICENSE-niemela-flags.txt\`.\n\n` +
  `Für die neun österreichischen Bundesländer werden die amtlichen Varianten mit Landeswappen von Wikimedia Commons verwendet, damit ähnlichfarbige Länder im Quiz eindeutig unterscheidbar sind. ` +
  `Diese Dateien sind nach österreichischem Urheberrecht gemeinfrei; ihre Commons-Beschreibungsseiten sind ebenfalls im lokalen Katalog vermerkt.\n\n` +
  `Die vier Flaggen der Landesteile des Vereinigten Königreichs stammen ebenfalls aus country-flag-icons.\n`
writeFileSync(path.join(outputRoot, 'ATTRIBUTION.md'), attribution)

// Cloud-synchronisierte Arbeitsordner können beim schnellen Neuimport Konfliktkopien
// wie "DE-BY 2.webp" erzeugen. Sie gehören nicht zum Katalog und werden entfernt.
for (const directory of [countryOutput, regionOutput]) {
  for (const filename of readdirSync(directory)) {
    if (/ \d+\.(?:svg|webp)$/.test(filename)) rmSync(path.join(directory, filename))
  }
}

console.log(`${flags.length} Flaggen importiert (${countryCodes.length} Länder/Gebiete, ${flags.length - countryCodes.length} Regionen).`)
