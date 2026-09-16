const continentNames = {
  europe: 'Europa',
  africa: 'Afrika',
  asia: 'Asien',
  'north-america': 'Nordamerika',
  'south-america': 'Südamerika',
  oceania: 'Ozeanien',
}

const picturedCityCountries = new Set(['ES', 'DE', 'FR', 'IT', 'GB', 'US', 'JP', 'AU'])
const cityImageSlug = (name) => name.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const cityImageReferences = {
  Paris: ['Eiffelturm', 'de'], Berlin: ['Brandenburger Tor', 'de'], Rom: ['Kolosseum', 'de'], Madrid: ['Plaza Mayor (Madrid)', 'de'], London: ['Tower Bridge', 'de'], Tokio: ['Tokyo Tower', 'en'],
  'Washington, D.C.': ['United States Capitol', 'en'], Canberra: ['Parliament House, Canberra', 'en'], Barcelona: ['Park Güell', 'de'], Sevilla: ['Plaza de España (Sevilla)', 'de'], Valencia: ['Palau de les Arts Reina Sofía', 'en'], Bilbao: ['Guggenheim-Museum Bilbao', 'de'], Granada: ['Alhambra', 'en'],
  Hamburg: ['Hamburger Hafen', 'de'], München: ['Frauenkirche (München)', 'de'], Köln: ['Kölner Dom', 'de'], 'Frankfurt am Main': ['Main Tower', 'de'], Dresden: ['Frauenkirche (Dresden)', 'de'],
  Lyon: ['Notre-Dame de Fourvière', 'de'], Marseille: ['Alter Hafen (Marseille)', 'de'], Bordeaux: ['Place de la Bourse, Bordeaux', 'en'], Nizza: ['Promenade des Anglais', 'de'],
  Mailand: ['Mailänder Dom', 'de'], Venedig: ['Markusplatz', 'de'], Florenz: ['Kathedrale von Florenz', 'de'], Neapel: ["Castel dell'Ovo", 'de'], Edinburgh: ['Edinburgh Castle', 'de'], Manchester: ['Manchester Town Hall', 'en'], Liverpool: ['Royal Liver Building', 'en'], Birmingham: ['Library of Birmingham', 'en'],
  'New York City': ['Empire State Building', 'de'], 'Los Angeles': ['Downtown Los Angeles', 'en'], Chicago: ['Chicago River', 'en'], 'San Francisco': ['Golden Gate Bridge', 'de'], Osaka: ['Burg Ōsaka', 'de'], Kyoto: ['Kiyomizu-dera', 'de'], Sydney: ['Sydney Opera House', 'en'], Melbourne: ['Flinders Street railway station', 'en'],
}

const cityRows = `
AL|Tirana|Albanien|europe|1
AD|Andorra la Vella|Andorra|europe|1
AT|Wien|Österreich|europe|1
BY|Minsk|Belarus|europe|1
BE|Brüssel|Belgien|europe|1
BA|Sarajevo|Bosnien und Herzegowina|europe|1
BG|Sofia|Bulgarien|europe|1
HR|Zagreb|Kroatien|europe|1
CY|Nikosia|Zypern|europe|1
CZ|Prag|Tschechien|europe|1
DK|Kopenhagen|Dänemark|europe|1
EE|Tallinn|Estland|europe|1
FI|Helsinki|Finnland|europe|1
FR|Paris|Frankreich|europe|1
DE|Berlin|Deutschland|europe|1
GR|Athen|Griechenland|europe|1
HU|Budapest|Ungarn|europe|1
IS|Reykjavík|Island|europe|1
IE|Dublin|Irland|europe|1
IT|Rom|Italien|europe|1
XK|Pristina|Kosovo|europe|1
LV|Riga|Lettland|europe|1
LI|Vaduz|Liechtenstein|europe|1
LT|Vilnius|Litauen|europe|1
LU|Luxemburg|Luxemburg|europe|1
MT|Valletta|Malta|europe|1
MD|Chișinău|Republik Moldau|europe|1
MC|Monaco|Monaco|europe|1
ME|Podgorica|Montenegro|europe|1
NL|Amsterdam|Niederlande|europe|1
MK|Skopje|Nordmazedonien|europe|1
NO|Oslo|Norwegen|europe|1
PL|Warschau|Polen|europe|1
PT|Lissabon|Portugal|europe|1
RO|Bukarest|Rumänien|europe|1
RU|Moskau|Russland|europe|1
SM|San Marino|San Marino|europe|1
RS|Belgrad|Serbien|europe|1
SK|Bratislava|Slowakei|europe|1
SI|Ljubljana|Slowenien|europe|1
ES|Madrid|Spanien|europe|1
SE|Stockholm|Schweden|europe|1
CH|Bern|Schweiz|europe|1
TR|Ankara|Türkei|europe|1
UA|Kyjiw|Ukraine|europe|1
GB|London|Vereinigtes Königreich|europe|1
VA|Vatikanstadt|Vatikanstadt|europe|1
EG|Kairo|Ägypten|africa|1
KE|Nairobi|Kenia|africa|1
MA|Rabat|Marokko|africa|1
ZA|Pretoria|Südafrika|africa|1
TZ|Dodoma|Tansania|africa|1
NG|Abuja|Nigeria|africa|1
ET|Addis Abeba|Äthiopien|africa|1
GH|Accra|Ghana|africa|1
SN|Dakar|Senegal|africa|1
JP|Tokio|Japan|asia|1
CN|Peking|China|asia|1
IN|Neu-Delhi|Indien|asia|1
TH|Bangkok|Thailand|asia|1
KR|Seoul|Südkorea|asia|1
VN|Hanoi|Vietnam|asia|1
KH|Phnom Penh|Kambodscha|asia|1
ID|Jakarta|Indonesien|asia|1
MY|Kuala Lumpur|Malaysia|asia|1
SG|Singapur|Singapur|asia|1
AE|Abu Dhabi|Vereinigte Arabische Emirate|asia|1
CA|Ottawa|Kanada|north-america|1
US|Washington, D.C.|USA|north-america|1
MX|Mexiko-Stadt|Mexiko|north-america|1
CU|Havanna|Kuba|north-america|1
CR|San José|Costa Rica|north-america|1
PA|Panama-Stadt|Panama|north-america|1
AR|Buenos Aires|Argentinien|south-america|1
BR|Brasília|Brasilien|south-america|1
CL|Santiago de Chile|Chile|south-america|1
CO|Bogotá|Kolumbien|south-america|1
PE|Lima|Peru|south-america|1
EC|Quito|Ecuador|south-america|1
AU|Canberra|Australien|oceania|1
NZ|Wellington|Neuseeland|oceania|1
ES|Barcelona|Spanien|europe|0
ES|Sevilla|Spanien|europe|0
ES|Valencia|Spanien|europe|0
ES|Bilbao|Spanien|europe|0
ES|Granada|Spanien|europe|0
DE|Hamburg|Deutschland|europe|0
DE|München|Deutschland|europe|0
DE|Köln|Deutschland|europe|0
DE|Frankfurt am Main|Deutschland|europe|0
DE|Dresden|Deutschland|europe|0
FR|Lyon|Frankreich|europe|0
FR|Marseille|Frankreich|europe|0
FR|Bordeaux|Frankreich|europe|0
FR|Nizza|Frankreich|europe|0
IT|Mailand|Italien|europe|0
IT|Venedig|Italien|europe|0
IT|Florenz|Italien|europe|0
IT|Neapel|Italien|europe|0
GB|Edinburgh|Vereinigtes Königreich|europe|0
GB|Manchester|Vereinigtes Königreich|europe|0
GB|Liverpool|Vereinigtes Königreich|europe|0
GB|Birmingham|Vereinigtes Königreich|europe|0
US|New York City|USA|north-america|0
US|Los Angeles|USA|north-america|0
US|Chicago|USA|north-america|0
US|San Francisco|USA|north-america|0
CA|Toronto|Kanada|north-america|0
CA|Vancouver|Kanada|north-america|0
MX|Guadalajara|Mexiko|north-america|0
BR|Rio de Janeiro|Brasilien|south-america|0
BR|São Paulo|Brasilien|south-america|0
PE|Cusco|Peru|south-america|0
CN|Shanghai|China|asia|0
CN|Hongkong|China|asia|0
JP|Osaka|Japan|asia|0
JP|Kyoto|Japan|asia|0
IN|Mumbai|Indien|asia|0
AE|Dubai|Vereinigte Arabische Emirate|asia|0
MA|Marrakesch|Marokko|africa|0
ZA|Kapstadt|Südafrika|africa|0
EG|Alexandria|Ägypten|africa|0
AU|Sydney|Australien|oceania|0
AU|Melbourne|Australien|oceania|0
NZ|Auckland|Neuseeland|oceania|0
`.trim().split('\n').map((row, index) => {
  const [countryCode, name, parent, continent, capital] = row.split('|')
  const image = picturedCityCountries.has(countryCode) ? `/assets/geography/cities/${cityImageSlug(name)}.webp` : undefined
  const imageReference = cityImageReferences[name]
  return {
    id: `city-${countryCode}-${index + 1}`,
    code: `${countryCode}-${index + 1}`,
    name,
    parent,
    countryCode,
    continent,
    capital: capital === '1',
    kind: 'city',
    topic: 'cities',
    ...(image ? { image, wikipediaTitle: imageReference?.[0] ?? name, wikiLanguage: imageReference?.[1] ?? 'de' } : {}),
  }
})

const landmarkRows = [
  ['alhambra', 'Alhambra', 'Granada', 'Spanien', 'ES', 'europe', 'Alhambra, Generalife und Albayzín', 'Alhambra'],
  ['sagrada-familia', 'Sagrada Família', 'Barcelona', 'Spanien', 'ES', 'europe', 'Werke von Antoni Gaudí', 'Sagrada Família'],
  ['segovia', 'Aquädukt von Segovia', 'Segovia', 'Spanien', 'ES', 'europe', 'Altstadt von Segovia und ihr Aquädukt', 'Aqueduct of Segovia'],
  ['santiago', 'Kathedrale von Santiago de Compostela', 'Santiago de Compostela', 'Spanien', 'ES', 'europe', 'Altstadt von Santiago de Compostela', 'Santiago de Compostela Cathedral'],
  ['cordoba', 'Mezquita-Catedral de Córdoba', 'Córdoba', 'Spanien', 'ES', 'europe', 'Historisches Zentrum von Córdoba', 'Mosque–Cathedral of Córdoba'],
  ['mont-saint-michel', 'Mont-Saint-Michel', 'Normandie', 'Frankreich', 'FR', 'europe', 'Mont-Saint-Michel und seine Bucht', 'Mont-Saint-Michel'],
  ['versailles', 'Schloss Versailles', 'Versailles', 'Frankreich', 'FR', 'europe', 'Schloss und Park von Versailles', 'Palace of Versailles'],
  ['colosseum', 'Kolosseum', 'Rom', 'Italien', 'IT', 'europe', 'Historisches Zentrum von Rom', 'Colosseum'],
  ['venice', 'Venedig und seine Lagune', 'Venedig', 'Italien', 'IT', 'europe', 'Venedig und seine Lagune', 'Venice'],
  ['pisa', 'Schiefer Turm von Pisa', 'Pisa', 'Italien', 'IT', 'europe', 'Piazza del Duomo, Pisa', 'Leaning Tower of Pisa'],
  ['cologne', 'Kölner Dom', 'Köln', 'Deutschland', 'DE', 'europe', 'Kölner Dom', 'Cologne Cathedral'],
  ['sanssouci', 'Schloss Sanssouci', 'Potsdam', 'Deutschland', 'DE', 'europe', 'Schlösser und Parks von Potsdam und Berlin', 'Sanssouci'],
  ['speicherstadt', 'Speicherstadt', 'Hamburg', 'Deutschland', 'DE', 'europe', 'Speicherstadt und Kontorhausviertel', 'Speicherstadt'],
  ['stonehenge', 'Stonehenge', 'Wiltshire', 'Vereinigtes Königreich', 'GB', 'europe', 'Stonehenge, Avebury und zugehörige Stätten', 'Stonehenge'],
  ['tower-london', 'Tower of London', 'London', 'Vereinigtes Königreich', 'GB', 'europe', 'Tower of London', 'Tower of London'],
  ['acropolis', 'Akropolis von Athen', 'Athen', 'Griechenland', 'GR', 'europe', 'Akropolis von Athen', 'Acropolis of Athens'],
  ['meteora', 'Meteora-Klöster', 'Thessalien', 'Griechenland', 'GR', 'europe', 'Meteora', 'Meteora'],
  ['belem', 'Torre de Belém', 'Lissabon', 'Portugal', 'PT', 'europe', 'Hieronymitenkloster und Turm von Belém', 'Belém Tower'],
  ['porto', 'Historisches Zentrum von Porto', 'Porto', 'Portugal', 'PT', 'europe', 'Historisches Zentrum von Porto', 'Porto'],
  ['hagia-sophia', 'Hagia Sophia', 'Istanbul', 'Türkei', 'TR', 'europe', 'Historische Gebiete von Istanbul', 'Hagia Sophia'],
  ['cappadocia', 'Kappadokien', 'Anatolien', 'Türkei', 'TR', 'europe', 'Göreme-Nationalpark und Felsendenkmäler von Kappadokien', 'Cappadocia'],
  ['pyramids', 'Pyramiden von Gizeh', 'Gizeh', 'Ägypten', 'EG', 'africa', 'Memphis und seine Nekropole', 'Giza pyramid complex'],
  ['serengeti', 'Serengeti-Nationalpark', 'Serengeti', 'Tansania', 'TZ', 'africa', 'Serengeti-Nationalpark', 'Serengeti National Park'],
  ['marrakesh', 'Medina von Marrakesch', 'Marrakesch', 'Marokko', 'MA', 'africa', 'Medina von Marrakesch', 'Marrakesh'],
  ['taj-mahal', 'Taj Mahal', 'Agra', 'Indien', 'IN', 'asia', 'Taj Mahal', 'Taj Mahal'],
  ['great-wall', 'Chinesische Mauer', 'Nordchina', 'China', 'CN', 'asia', 'Chinesische Mauer', 'Great Wall of China'],
  ['himeji', 'Burg Himeji', 'Himeji', 'Japan', 'JP', 'asia', 'Burg Himeji', 'Himeji Castle'],
  ['angkor', 'Angkor Wat', 'Siem Reap', 'Kambodscha', 'KH', 'asia', 'Angkor', 'Angkor Wat'],
  ['machu-picchu', 'Machu Picchu', 'Cusco', 'Peru', 'PE', 'south-america', 'Historisches Heiligtum von Machu Picchu', 'Machu Picchu'],
  ['chichen-itza', 'Chichén Itzá', 'Yucatán', 'Mexiko', 'MX', 'north-america', 'Präkolumbische Stadt Chichén Itzá', 'Chichen Itza'],
  ['christ-redeemer', 'Cristo Redentor', 'Rio de Janeiro', 'Brasilien', 'BR', 'south-america', 'Rio de Janeiro: Carioca-Landschaften', 'Christ the Redeemer (statue)'],
  ['opera-house', 'Sydney Opera House', 'Sydney', 'Australien', 'AU', 'oceania', 'Sydney Opera House', 'Sydney Opera House'],
  ['liberty', 'Freiheitsstatue', 'New York City', 'USA', 'US', 'north-america', 'Freiheitsstatue', 'Statue of Liberty'],
  ['grand-canyon', 'Grand Canyon', 'Arizona', 'USA', 'US', 'north-america', 'Grand-Canyon-Nationalpark', 'Grand Canyon'],
]

export const landmarkCatalog = landmarkRows.map(([slug, name, city, parent, countryCode, continent, unescoName, wikipediaTitle]) => ({
  id: `landmark-${slug}`,
  code: countryCode,
  name,
  city,
  parent,
  countryCode,
  continent,
  unescoName,
  wikipediaTitle,
  image: `/assets/geography/landmarks/${slug}.webp`,
  kind: 'landmark',
  topic: 'landmarks',
}))

export const cityCatalog = cityRows
export const geographyCatalog = [...cityCatalog, ...landmarkCatalog]

function groupBy(items, getKey) {
  const groups = new Map()
  for (const item of items) {
    const key = getKey(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return groups
}

const geographyCollections = [
  { id: 'capitals-world', title: 'Hauptstädte der Welt', shortTitle: 'Hauptstädte', topic: 'cities', group: 'Global', symbol: '◎', description: 'Länder und ihre Hauptstädte aus sechs Kontinenten.', filter: (item) => item.kind === 'city' && item.capital, defaultQuizMode: 'country-capital', featured: true },
  { id: 'capitals-europe', title: 'Hauptstädte Europas', shortTitle: 'Europa', topic: 'cities', group: 'Europa', symbol: 'EU', description: 'Von Reykjavík bis Nikosia: Europas Hauptstädte.', continent: 'europe', filter: (item) => item.kind === 'city' && item.capital && item.continent === 'europe', defaultQuizMode: 'capital-country', featured: true },
  { id: 'cities-world', title: 'Städte der Welt', shortTitle: 'Städte', topic: 'cities', group: 'Global', symbol: '⌂', description: 'Bekannte Metropolen dem richtigen Land zuordnen.', filter: (item) => item.kind === 'city', defaultQuizMode: 'city-country' },
  { id: 'city-images-world', title: 'Städte im Bild', shortTitle: 'Städtebilder', topic: 'cities', group: 'Global', symbol: '▣', description: 'Stadtansichten erkennen und den richtigen Namen finden.', filter: (item) => item.kind === 'city' && item.image, defaultQuizMode: 'city-name', featured: true },
  { id: 'heritage-world', title: 'UNESCO-Welterbe weltweit', shortTitle: 'Welterbe', topic: 'landmarks', group: 'Global', symbol: '◇', description: 'Berühmte Kultur- und Naturstätten anhand echter Bilder erkennen.', filter: (item) => item.kind === 'landmark', defaultQuizMode: 'landmark-country', featured: true },
]

for (const [continent, title] of Object.entries(continentNames)) {
  const cities = cityCatalog.filter((item) => item.continent === continent)
  if (cities.length >= 4) geographyCollections.push({
    id: `cities-${continent}`,
    title: `Städte in ${title}`,
    shortTitle: title,
    topic: 'cities',
    group: title,
    symbol: title.slice(0, 2).toUpperCase(),
    description: `${cities.length} Hauptstädte und Metropolen aus ${title}.`,
    continent,
    filter: (item) => item.kind === 'city' && item.continent === continent,
    defaultQuizMode: 'city-country',
  })
  const landmarks = landmarkCatalog.filter((item) => item.continent === continent)
  if (landmarks.length >= 4) geographyCollections.push({
    id: `heritage-${continent}`,
    title: `Welterbe in ${title}`,
    shortTitle: title,
    topic: 'landmarks',
    group: title,
    symbol: title.slice(0, 2).toUpperCase(),
    description: `${landmarks.length} berühmte Orte aus ${title}.`,
    continent,
    filter: (item) => item.kind === 'landmark' && item.continent === continent,
    defaultQuizMode: 'landmark-country',
  })
}

for (const [countryCode, items] of groupBy(cityCatalog.filter((item) => item.image), (item) => item.countryCode)) {
  if (items.length < 4) continue
  const { parent, continent } = items[0]
  geographyCollections.push({
    id: `cities-country-${countryCode.toLowerCase()}`,
    title: `Städte in ${parent}`,
    shortTitle: parent,
    topic: 'cities',
    group: continentNames[continent],
    symbol: countryCode,
    description: `${items.length} Städte anhand schöner Ortsbilder erkennen.`,
    countryCode,
    continent,
    filter: (item) => item.kind === 'city' && item.countryCode === countryCode,
    defaultQuizMode: 'city-name',
  })
}

for (const [countryCode, items] of groupBy(landmarkCatalog, (item) => item.countryCode)) {
  if (items.length < 4) continue
  const { parent, continent } = items[0]
  geographyCollections.push({
    id: `heritage-country-${countryCode.toLowerCase()}`,
    title: `Welterbe in ${parent}`,
    shortTitle: parent,
    topic: 'landmarks',
    group: continentNames[continent],
    symbol: countryCode,
    description: `${items.length} berühmte Orte und UNESCO-Stätten in ${parent}.`,
    countryCode,
    continent,
    image: items[0].image,
    filter: (item) => item.kind === 'landmark' && item.countryCode === countryCode,
    defaultQuizMode: 'landmark-name',
  })
}

export { continentNames, geographyCollections }

export function getGeographyItems(collection) {
  return geographyCatalog.filter(collection.filter)
}
