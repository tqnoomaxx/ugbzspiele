import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'
import { generateFlagLocatorMaps } from './generate-flag-locator-maps.mjs'

const root = path.resolve(import.meta.dirname, '..')
const countrySource = process.env.FLAG_COUNTRY_SOURCE
const subdivisionSource = process.env.FLAG_SUBDIVISION_SOURCE
const skipImageProcessing = process.env.FLAG_SKIP_IMAGE_PROCESSING === '1'
const skipMapProcessing = process.env.FLAG_SKIP_MAP_PROCESSING === '1'

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

function normalizedSvgBuffer(file, targetWidth = 720) {
  const source = readFileSync(file, 'utf8')
  return Buffer.from(source.replace(/<svg\b[^>]*>/i, (tag) => {
    let viewBox = tag.match(/viewBox=["']([^"']+)["']/i)?.[1].trim().split(/[\s,]+/).map(Number)
    const sourceWidth = Number.parseFloat(tag.match(/\swidth=["']([^"']+)["']/i)?.[1])
    const sourceHeight = Number.parseFloat(tag.match(/\sheight=["']([^"']+)["']/i)?.[1])
    if ((!viewBox || viewBox.length !== 4) && sourceWidth > 0 && sourceHeight > 0) viewBox = [0, 0, sourceWidth, sourceHeight]
    const ratio = viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0 ? viewBox[3] / viewBox[2] : 2 / 3
    const withoutDimensions = tag.replace(/\s(?:width|height)=["'][^"']*["']/gi, '')
    const withViewBox = /\sviewBox=/i.test(withoutDimensions) || !viewBox
      ? withoutDimensions
      : withoutDimensions.replace(/<svg\b/i, `<svg viewBox="${viewBox.join(' ')}"`)
    return withViewBox.replace(/<svg\b/i, `<svg width="${targetWidth}" height="${Math.max(1, Math.round(targetWidth * ratio))}"`)
  }))
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
  belgium: ['BE-BRU', 'BE-VAN', 'BE-VBR', 'BE-VLG', 'BE-VLI', 'BE-VOV', 'BE-VWV', 'BE-WAL', 'BE-WBR', 'BE-WHT', 'BE-WLG', 'BE-WLX', 'BE-WNA'],
  czechia: ['CZ-20', 'CZ-31', 'CZ-32', 'CZ-41', 'CZ-42', 'CZ-51', 'CZ-52', 'CZ-53', 'CZ-63', 'CZ-64', 'CZ-71', 'CZ-72', 'CZ-80', 'CZ-PR'],
  croatia: ['HR-01', 'HR-02', 'HR-03', 'HR-04', 'HR-05', 'HR-06', 'HR-07', 'HR-08', 'HR-09', 'HR-10', 'HR-11', 'HR-12', 'HR-13', 'HR-14', 'HR-15', 'HR-16', 'HR-17', 'HR-18', 'HR-19', 'HR-20', 'HR-21'],
  slovakia: ['SK-BC', 'SK-BL', 'SK-KI', 'SK-NI', 'SK-PV', 'SK-TA', 'SK-TC', 'SK-ZI'],
  sweden: ['SE-AB', 'SE-AC', 'SE-BD', 'SE-C', 'SE-D', 'SE-E', 'SE-F', 'SE-G', 'SE-H', 'SE-I', 'SE-K', 'SE-M', 'SE-N', 'SE-O', 'SE-S', 'SE-T', 'SE-U', 'SE-W', 'SE-X', 'SE-Y', 'SE-Z'],
  colombia: ['CO-AMA', 'CO-ANT', 'CO-ARA', 'CO-ATL', 'CO-BOL', 'CO-BOY', 'CO-CAL', 'CO-CAQ', 'CO-CAS', 'CO-CAU', 'CO-CES', 'CO-CHO', 'CO-COR', 'CO-CUN', 'CO-DC', 'CO-GUA', 'CO-GUV', 'CO-HUI', 'CO-LAG', 'CO-MAG', 'CO-MET', 'CO-NAR', 'CO-NSA', 'CO-PUT', 'CO-QUI', 'CO-RIS', 'CO-SAN', 'CO-SAP', 'CO-SUC', 'CO-TOL', 'CO-VAC', 'CO-VAU', 'CO-VID'],
  chile: ['CL-AI', 'CL-AN', 'CL-AP', 'CL-AR', 'CL-AT', 'CL-BI', 'CL-CO', 'CL-LI', 'CL-LL', 'CL-LR', 'CL-MA', 'CL-ML', 'CL-NB', 'CL-RM', 'CL-TA', 'CL-VS'],
  malaysia: ['MY-01', 'MY-02', 'MY-03', 'MY-04', 'MY-05', 'MY-06', 'MY-07', 'MY-08', 'MY-09', 'MY-10', 'MY-11', 'MY-12', 'MY-13', 'MY-14', 'MY-15', 'MY-16'],
}

codeGroups.mexico.splice(3, 0, 'MX-CAM')
codeGroups.mexico.splice(12, 0, 'MX-HID')

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
  mexico: 32,
  spain: 19,
  italy: 20,
  poland: 16,
  belgium: 13,
  czechia: 14,
  croatia: 21,
  slovakia: 8,
  sweden: 21,
  colombia: 33,
  chile: 16,
  malaysia: 16,
}

const parentNames = {
  'us-states': 'USA', germany: 'Deutschland', austria: 'Österreich', netherlands: 'Niederlande', canada: 'Kanada', switzerland: 'Schweiz', australia: 'Australien', brazil: 'Brasilien', argentina: 'Argentinien', japan: 'Japan', mexico: 'Mexiko', spain: 'Spanien', italy: 'Italien', poland: 'Polen', belgium: 'Belgien', czechia: 'Tschechien', croatia: 'Kroatien', slovakia: 'Slowakei', sweden: 'Schweden', colombia: 'Kolumbien', chile: 'Chile', malaysia: 'Malaysia',
}

const continentByCollection = {
  'us-states': 'north-america', germany: 'europe', austria: 'europe', netherlands: 'europe', canada: 'north-america', switzerland: 'europe', australia: 'oceania', brazil: 'south-america', argentina: 'south-america', japan: 'asia', mexico: 'north-america', spain: 'europe', italy: 'europe', poland: 'europe', belgium: 'europe', czechia: 'europe', croatia: 'europe', slovakia: 'europe', sweden: 'europe', colombia: 'south-america', chile: 'south-america', malaysia: 'asia',
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
  'MX-CAM': 'Campeche', 'MX-CMX': 'Mexiko-Stadt', 'MX-HID': 'Hidalgo', 'MX-MEX': 'México', 'MX-MIC': 'Michoacán', 'MX-NLE': 'Nuevo León',
  'BR-AP': 'Amapá', 'BR-CE': 'Ceará', 'BR-ES': 'Espírito Santo', 'BR-GO': 'Goiás', 'BR-MA': 'Maranhão', 'BR-PA': 'Pará', 'BR-PB': 'Paraíba', 'BR-PR': 'Paraná', 'BR-PI': 'Piauí', 'BR-RO': 'Rondônia', 'BR-RJ': 'Rio de Janeiro', 'BR-SP': 'São Paulo',
  'AR-C': 'Buenos Aires (Stadt)', 'AR-X': 'Córdoba', 'AR-E': 'Entre Ríos', 'AR-Q': 'Neuquén', 'AR-R': 'Río Negro', 'AR-T': 'Tucumán',
  'BE-BRU': 'Brüssel-Hauptstadt', 'BE-VAN': 'Antwerpen', 'BE-VBR': 'Flämisch-Brabant', 'BE-VLG': 'Flandern', 'BE-VLI': 'Limburg', 'BE-VOV': 'Ostflandern', 'BE-VWV': 'Westflandern', 'BE-WAL': 'Wallonien', 'BE-WBR': 'Wallonisch-Brabant', 'BE-WHT': 'Hennegau', 'BE-WLG': 'Lüttich', 'BE-WLX': 'Luxemburg', 'BE-WNA': 'Namur',
  'CZ-20': 'Mittelböhmen', 'CZ-31': 'Südböhmen', 'CZ-32': 'Plzeň', 'CZ-41': 'Karlovy Vary', 'CZ-42': 'Ústí nad Labem', 'CZ-51': 'Liberec', 'CZ-52': 'Hradec Králové', 'CZ-53': 'Pardubice', 'CZ-63': 'Vysočina', 'CZ-64': 'Südmähren', 'CZ-71': 'Olomouc', 'CZ-72': 'Zlín', 'CZ-80': 'Mährisch-Schlesien', 'CZ-PR': 'Prag',
  'HR-01': 'Gespanschaft Zagreb', 'HR-02': 'Krapina-Zagorje', 'HR-03': 'Sisak-Moslavina', 'HR-04': 'Karlovac', 'HR-05': 'Varaždin', 'HR-06': 'Koprivnica-Križevci', 'HR-07': 'Bjelovar-Bilogora', 'HR-08': 'Primorje-Gorski kotar', 'HR-09': 'Lika-Senj', 'HR-10': 'Virovitica-Podravina', 'HR-11': 'Požega-Slawonien', 'HR-12': 'Brod-Posavina', 'HR-13': 'Zadar', 'HR-14': 'Osijek-Baranja', 'HR-15': 'Šibenik-Knin', 'HR-16': 'Vukovar-Syrmien', 'HR-17': 'Split-Dalmatien', 'HR-18': 'Istrien', 'HR-19': 'Dubrovnik-Neretva', 'HR-20': 'Međimurje', 'HR-21': 'Stadt Zagreb',
  'SK-BC': 'Banská Bystrica', 'SK-BL': 'Bratislava', 'SK-KI': 'Košice', 'SK-NI': 'Nitra', 'SK-PV': 'Prešov', 'SK-TA': 'Trnava', 'SK-TC': 'Trenčín', 'SK-ZI': 'Žilina',
  'SE-AC': 'Västerbotten', 'SE-BD': 'Norrbotten', 'SE-D': 'Södermanland', 'SE-E': 'Östergötland', 'SE-F': 'Jönköping', 'SE-M': 'Skåne', 'SE-O': 'Västra Götaland', 'SE-S': 'Värmland', 'SE-T': 'Örebro', 'SE-U': 'Västmanland', 'SE-X': 'Gävleborg', 'SE-Y': 'Västernorrland', 'SE-Z': 'Jämtland',
  'CO-ATL': 'Atlántico', 'CO-BOL': 'Bolívar', 'CO-BOY': 'Boyacá', 'CO-CAQ': 'Caquetá', 'CO-CHO': 'Chocó', 'CO-COR': 'Córdoba', 'CO-DC': 'Bogotá', 'CO-GUA': 'Guainía', 'CO-NAR': 'Nariño', 'CO-QUI': 'Quindío', 'CO-SAP': 'San Andrés und Providencia', 'CO-VAU': 'Vaupés',
  'CL-AI': 'Aysén', 'CL-AP': 'Arica und Parinacota', 'CL-AR': 'Araucanía', 'CL-BI': 'Biobío', 'CL-LI': "O’Higgins", 'CL-LL': 'Los Lagos', 'CL-LR': 'Los Ríos', 'CL-MA': 'Magallanes und Chilenische Antarktis', 'CL-ML': 'Maule', 'CL-NB': 'Ñuble', 'CL-RM': 'Metropolregion Santiago', 'CL-TA': 'Tarapacá', 'CL-VS': 'Valparaíso',
  'MY-04': 'Malakka', 'MY-07': 'Penang',
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
  'MX-CAM': ['https://upload.wikimedia.org/wikipedia/commons/3/37/Flag_of_Campeche.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Campeche.svg'],
  'MX-HID': ['https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Hidalgo.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Hidalgo.svg'],
  'HR-03': ['https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Sisak-Moslavina_County.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Sisak-Moslavina_County.svg'],
  'HR-11': ['https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Po%C5%BEega-Slavonia_County.svg', 'https://commons.wikimedia.org/wiki/File:Flag_of_Po%C5%BEega-Slavonia_County.svg'],
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

// Every European map region for which the source repository contains a real
// flag becomes a normal flag item as well. The checked-in map manifest keeps
// this import reproducible and lets the map generator replace map-only targets
// with their flag-backed counterparts on the next pass.
const mapManifest = readFileSync(path.join(root, 'src/games/flaggenkunde/mapManifest.generated.js'), 'utf8')
const targetMatch = mapManifest.match(/export const europeMapTargets = (\[[^\n]+\])/)
const europeanTargets = targetMatch ? JSON.parse(targetMatch[1]) : []
const existingRegionalCodes = new Set(Object.values(codeGroups).flat())
for (const code of ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']) existingRegionalCodes.add(code)
const flagBackedTargets = europeanTargets.filter((target) => (
  !existingRegionalCodes.has(target.code)
  && existsSync(path.join(subdivisionDataDir, `${target.code}.json`))
  && existsSync(path.join(subdivisionDataDir, `${target.code}.svg`))
))
const europeTargetByCode = new Map(flagBackedTargets.map((target) => [target.code, target]))

for (const [prefix, targets] of Map.groupBy(flagBackedTargets, (target) => target.code.split('-')[0])) {
  const collection = `europe-${prefix.toLowerCase()}`
  const codes = [...new Set(targets.map((target) => target.code))]
  codeGroups[collection] = codes
  expectedCounts[collection] = codes.length
  parentNames[collection] = targets[0].parent
  continentByCollection[collection] = 'europe'
  for (const target of targets) nameOverrides[target.code] ??= target.name
}

for (const [collection, codes] of Object.entries(codeGroups)) {
  if (codes.length !== expectedCounts[collection]) {
    throw new Error(`${collection}: ${codes.length} statt ${expectedCounts[collection]} erwarteten Flaggen`)
  }
  await Promise.all(codes.map(async (code) => {
    const sourceFile = path.join(subdivisionDataDir, `${code}.json`)
    const source = existsSync(sourceFile) ? readSourceFlag(code) : { name: nameOverrides[code] ?? code, sources: [] }
    const assetOverride = regionalAssetOverrides[code]
    let svg = path.join(subdivisionDataDir, `${code}.svg`)
    if (assetOverride && !skipImageProcessing) {
      svg = path.join(regionOutput, `.${code}-source.svg`)
      execFileSync('curl', ['-sS', '-L', assetOverride[0], '-o', svg])
    }
    const webp = path.join(regionOutput, `${code}.webp`)
    if (!skipImageProcessing) {
      if (!existsSync(svg)) throw new Error(`Flaggenbild fehlt: ${svg}`)
      await sharp(normalizedSvgBuffer(svg), { density: 192 })
        .resize({ width: 720, withoutEnlargement: false })
        .webp({ quality: 88, effort: 4 })
        .toFile(webp)
      if (assetOverride) rmSync(svg)
    } else if (!existsSync(webp)) {
      throw new Error(`Bereits verarbeitetes Flaggenbild fehlt: ${webp}`)
    }
    flags.push({
      id: `region-${code}`,
      code,
      name: nameOverrides[code] ?? europeTargetByCode.get(code)?.name ?? cleanSubdivisionName(source.name),
      kind: 'region',
      collection,
      continent: continentByCollection[collection] ?? continentFor(source),
      image: `/assets/flags/regions/${code}.webp`,
      visualKey: fileHash(webp),
      source: assetOverride?.[1] ?? source.sources?.[0] ?? null,
      parent: parentNames[collection],
    })
  }))
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
    parent: 'Vereinigtes Königreich',
  })
}

const mappedCodes = await generateFlagLocatorMaps(flags, { skipGeneration: skipMapProcessing })
for (const flag of flags) {
  if (mappedCodes.has(flag.code)) flag.locationMap = `/assets/flags/maps/${flag.code}.svg`
}

flags.sort((a, b) => a.name.localeCompare(b.name, 'de'))

const banner = `// Automatisch erzeugt durch scripts/import-flag-game-assets.mjs.\n// Die Datei ist vollständig lokal und benötigt zur Laufzeit keine externe API.\n\n`
writeFileSync(generatedOutput, `${banner}export const flagCatalog = ${JSON.stringify(flags, null, 2)}\n`)

cpSync(path.join(countrySource, 'LICENSE'), path.join(outputRoot, 'LICENSE-country-flag-icons.txt'))
cpSync(path.join(subdivisionSource, 'LICENSE'), path.join(outputRoot, 'LICENSE-niemela-flags.txt'))

const attribution = `# Quellen und Lizenzen der Flaggen\n\n` +
  `Die ${countryCodes.length} Länder- und Gebietsflaggen stammen aus **country-flag-icons 1.6.20** und stehen unter der MIT-Lizenz. ` +
  `Die Lizenz liegt vollständig in \`LICENSE-country-flag-icons.txt\`.\n\n` +
  `Die ${flags.length - countryCodes.length - 4} regionalen Flaggen wurden überwiegend aus dem Repository **niemela/flags** (Commit fee56aa5527e813b37c37f616b1bab0068f23963) übernommen, ` +
  `mit Sharp zuverlässig aus den Vektordateien gerendert, lokal auf 720 Pixel Breite gerastert und als WebP optimiert. Die Metadaten des Quell-Repositories stehen unter CC BY-SA 4.0; ` +
  `die einzelnen Flaggen behalten ihre jeweilige Ursprungslizenz. Die Quellseite jeder Regionalflagge ist im lokalen Katalog \`src/games/flaggenkunde/catalog.generated.js\` im Feld \`source\` vermerkt. ` +
  `Die vollständigen Lizenzhinweise des Quellbestands liegen in \`LICENSE-niemela-flags.txt\`.\n\n` +
  `Für die neun österreichischen Bundesländer werden die amtlichen Varianten mit Landeswappen von Wikimedia Commons verwendet, damit ähnlichfarbige Länder im Quiz eindeutig unterscheidbar sind. ` +
  `Diese Dateien sind nach österreichischem Urheberrecht gemeinfrei; ihre Commons-Beschreibungsseiten sind ebenfalls im lokalen Katalog vermerkt.\n\n` +
  `Vier zusätzlich ergänzte Regionalflaggen (Campeche, Hidalgo, Sisak-Moslavina und Požega-Slawonien) stammen von Wikimedia Commons; ihre Beschreibungsseiten sind im Katalog vermerkt.\n\n` +
  `Die vier Flaggen der Landesteile des Vereinigten Königreichs stammen ebenfalls aus country-flag-icons.\n\n` +
  `Die lokalen Lagekarten wurden aus den vereinfachten gbOpen-Grenzen von **geoBoundaries** (CC BY 4.0) erzeugt. Für einzelne fehlende oder abweichend codierte Grenzen dient **Natural Earth** (Public Domain) als Fallback.\n\n` +
  `Auch die interaktiven Karten verwenden [geoBoundaries gbOpen](https://www.geoboundaries.org/) und [Natural Earth](https://www.naturalearthdata.com/). Die Geometrien wurden vereinfacht, projiziert und für den Europa-Hypermodus auf den Kartenausschnitt begrenzt. Quellenlinks, Bezugsjahre und ursprüngliche Lizenzangaben je Datensatz stehen in [interactive/SOURCES.json](interactive/SOURCES.json). Verwaltungsstände und Ebenen unterscheiden sich je Land; die Lernkarte ist keine tagesaktuelle amtliche Grenzkarte.\n`
writeFileSync(path.join(outputRoot, 'ATTRIBUTION.md'), attribution)

// Cloud-synchronisierte Arbeitsordner können beim schnellen Neuimport Konfliktkopien
// wie "DE-BY 2.webp" erzeugen. Sie gehören nicht zum Katalog und werden entfernt.
for (const directory of [countryOutput, regionOutput]) {
  for (const filename of readdirSync(directory)) {
    if (/ \d+\.(?:svg|webp)$/.test(filename)) rmSync(path.join(directory, filename))
  }
}

console.log(`${flags.length} Flaggen importiert (${countryCodes.length} Länder/Gebiete, ${flags.length - countryCodes.length} Regionen).`)
