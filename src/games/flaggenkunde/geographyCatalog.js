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

const regionalCapitalRows = `
DE|europe|germany|DE-BW|Baden-Württemberg|Stuttgart
DE|europe|germany|DE-BY|Bayern|München
DE|europe|germany|DE-BE|Berlin|Berlin
DE|europe|germany|DE-BB|Brandenburg|Potsdam
DE|europe|germany|DE-HB|Bremen|Bremen
DE|europe|germany|DE-HH|Hamburg|Hamburg
DE|europe|germany|DE-HE|Hessen|Wiesbaden
DE|europe|germany|DE-MV|Mecklenburg-Vorpommern|Schwerin
DE|europe|germany|DE-NI|Niedersachsen|Hannover
DE|europe|germany|DE-NW|Nordrhein-Westfalen|Düsseldorf
DE|europe|germany|DE-RP|Rheinland-Pfalz|Mainz
DE|europe|germany|DE-SL|Saarland|Saarbrücken
DE|europe|germany|DE-SN|Sachsen|Dresden
DE|europe|germany|DE-ST|Sachsen-Anhalt|Magdeburg
DE|europe|germany|DE-SH|Schleswig-Holstein|Kiel
DE|europe|germany|DE-TH|Thüringen|Erfurt
AT|europe|austria|AT-1|Burgenland|Eisenstadt
AT|europe|austria|AT-2|Kärnten|Klagenfurt
AT|europe|austria|AT-3|Niederösterreich|St. Pölten
AT|europe|austria|AT-4|Oberösterreich|Linz
AT|europe|austria|AT-5|Salzburg|Salzburg
AT|europe|austria|AT-6|Steiermark|Graz
AT|europe|austria|AT-7|Tirol|Innsbruck
AT|europe|austria|AT-8|Vorarlberg|Bregenz
AT|europe|austria|AT-9|Wien|Wien
NL|europe|netherlands|NL-DR|Drenthe|Assen
NL|europe|netherlands|NL-FL|Flevoland|Lelystad
NL|europe|netherlands|NL-FR|Friesland|Leeuwarden
NL|europe|netherlands|NL-GE|Gelderland|Arnhem
NL|europe|netherlands|NL-GR|Groningen|Groningen
NL|europe|netherlands|NL-LI|Limburg|Maastricht
NL|europe|netherlands|NL-NB|Noord-Brabant|'s-Hertogenbosch
NL|europe|netherlands|NL-NH|Noord-Holland|Haarlem
NL|europe|netherlands|NL-OV|Overijssel|Zwolle
NL|europe|netherlands|NL-UT|Utrecht|Utrecht
NL|europe|netherlands|NL-ZE|Zeeland|Middelburg
NL|europe|netherlands|NL-ZH|Zuid-Holland|Den Haag
CH|europe|switzerland|CH-AG|Aargau|Aarau
CH|europe|switzerland|CH-AI|Appenzell Innerrhoden|Appenzell
CH|europe|switzerland|CH-AR|Appenzell Ausserrhoden|Herisau
CH|europe|switzerland|CH-BE|Bern|Bern
CH|europe|switzerland|CH-BL|Basel-Landschaft|Liestal
CH|europe|switzerland|CH-BS|Basel-Stadt|Basel
CH|europe|switzerland|CH-FR|Freiburg|Freiburg
CH|europe|switzerland|CH-GE|Genf|Genf
CH|europe|switzerland|CH-GL|Glarus|Glarus
CH|europe|switzerland|CH-GR|Graubünden|Chur
CH|europe|switzerland|CH-JU|Jura|Delsberg
CH|europe|switzerland|CH-LU|Luzern|Luzern
CH|europe|switzerland|CH-NE|Neuenburg|Neuenburg
CH|europe|switzerland|CH-NW|Nidwalden|Stans
CH|europe|switzerland|CH-OW|Obwalden|Sarnen
CH|europe|switzerland|CH-SG|St. Gallen|St. Gallen
CH|europe|switzerland|CH-SH|Schaffhausen|Schaffhausen
CH|europe|switzerland|CH-SO|Solothurn|Solothurn
CH|europe|switzerland|CH-SZ|Schwyz|Schwyz
CH|europe|switzerland|CH-TG|Thurgau|Frauenfeld
CH|europe|switzerland|CH-TI|Tessin|Bellinzona
CH|europe|switzerland|CH-UR|Uri|Altdorf
CH|europe|switzerland|CH-VD|Waadt|Lausanne
CH|europe|switzerland|CH-VS|Wallis|Sitten
CH|europe|switzerland|CH-ZG|Zug|Zug
CH|europe|switzerland|CH-ZH|Zürich|Zürich
ES|europe|spain|ES-AN|Andalusien|Sevilla
ES|europe|spain|ES-AR|Aragón|Zaragoza
ES|europe|spain|ES-AS|Asturien|Oviedo
ES|europe|spain|ES-CB|Kantabrien|Santander
ES|europe|spain|ES-CL|Kastilien und León|Valladolid
ES|europe|spain|ES-CM|Kastilien-La Mancha|Toledo
ES|europe|spain|ES-CT|Katalonien|Barcelona
ES|europe|spain|ES-EX|Extremadura|Mérida
ES|europe|spain|ES-GA|Galicien|Santiago de Compostela
ES|europe|spain|ES-IB|Balearische Inseln|Palma
ES|europe|spain|ES-CN|Kanarische Inseln|Las Palmas / Santa Cruz de Tenerife
ES|europe|spain|ES-MC|Murcia|Murcia
ES|europe|spain|ES-MD|Madrid|Madrid
ES|europe|spain|ES-NC|Navarra|Pamplona
ES|europe|spain|ES-PV|Baskenland|Vitoria-Gasteiz
ES|europe|spain|ES-RI|La Rioja|Logroño
ES|europe|spain|ES-VC|Valencianische Gemeinschaft|Valencia
ES|europe|spain|ES-CE|Ceuta|Ceuta
ES|europe|spain|ES-ML|Melilla|Melilla
IT|europe|italy|IT-21|Piemont|Turin
IT|europe|italy|IT-23|Aostatal|Aosta
IT|europe|italy|IT-25|Lombardei|Mailand
IT|europe|italy|IT-32|Trentino-Südtirol|Trient
IT|europe|italy|IT-34|Venetien|Venedig
IT|europe|italy|IT-36|Friaul-Julisch Venetien|Triest
IT|europe|italy|IT-42|Ligurien|Genua
IT|europe|italy|IT-45|Emilia-Romagna|Bologna
IT|europe|italy|IT-52|Toskana|Florenz
IT|europe|italy|IT-55|Umbrien|Perugia
IT|europe|italy|IT-57|Marken|Ancona
IT|europe|italy|IT-62|Latium|Rom
IT|europe|italy|IT-65|Abruzzen|L’Aquila
IT|europe|italy|IT-67|Molise|Campobasso
IT|europe|italy|IT-72|Kampanien|Neapel
IT|europe|italy|IT-75|Apulien|Bari
IT|europe|italy|IT-77|Basilikata|Potenza
IT|europe|italy|IT-78|Kalabrien|Catanzaro
IT|europe|italy|IT-82|Sizilien|Palermo
IT|europe|italy|IT-88|Sardinien|Cagliari
PL|europe|poland|PL-02|Niederschlesien|Wrocław
PL|europe|poland|PL-04|Kujawien-Pommern|Bydgoszcz / Toruń
PL|europe|poland|PL-06|Lublin|Lublin
PL|europe|poland|PL-08|Lebus|Gorzów / Zielona Góra
PL|europe|poland|PL-10|Łódź|Łódź
PL|europe|poland|PL-12|Kleinpolen|Krakau
PL|europe|poland|PL-14|Masowien|Warschau
PL|europe|poland|PL-16|Oppeln|Opole
PL|europe|poland|PL-18|Karpatenvorland|Rzeszów
PL|europe|poland|PL-20|Podlachien|Białystok
PL|europe|poland|PL-22|Pommern|Danzig
PL|europe|poland|PL-24|Schlesien|Katowice
PL|europe|poland|PL-26|Heiligkreuz|Kielce
PL|europe|poland|PL-28|Ermland-Masuren|Olsztyn
PL|europe|poland|PL-30|Großpolen|Poznań
PL|europe|poland|PL-32|Westpommern|Szczecin
US|north-america|us-states|US-AL|Alabama|Montgomery
US|north-america|us-states|US-AK|Alaska|Juneau
US|north-america|us-states|US-AZ|Arizona|Phoenix
US|north-america|us-states|US-AR|Arkansas|Little Rock
US|north-america|us-states|US-CA|Kalifornien|Sacramento
US|north-america|us-states|US-CO|Colorado|Denver
US|north-america|us-states|US-CT|Connecticut|Hartford
US|north-america|us-states|US-DE|Delaware|Dover
US|north-america|us-states|US-FL|Florida|Tallahassee
US|north-america|us-states|US-GA|Georgia|Atlanta
US|north-america|us-states|US-HI|Hawaii|Honolulu
US|north-america|us-states|US-ID|Idaho|Boise
US|north-america|us-states|US-IL|Illinois|Springfield
US|north-america|us-states|US-IN|Indiana|Indianapolis
US|north-america|us-states|US-IA|Iowa|Des Moines
US|north-america|us-states|US-KS|Kansas|Topeka
US|north-america|us-states|US-KY|Kentucky|Frankfort
US|north-america|us-states|US-LA|Louisiana|Baton Rouge
US|north-america|us-states|US-ME|Maine|Augusta
US|north-america|us-states|US-MD|Maryland|Annapolis
US|north-america|us-states|US-MA|Massachusetts|Boston
US|north-america|us-states|US-MI|Michigan|Lansing
US|north-america|us-states|US-MN|Minnesota|Saint Paul
US|north-america|us-states|US-MS|Mississippi|Jackson
US|north-america|us-states|US-MO|Missouri|Jefferson City
US|north-america|us-states|US-MT|Montana|Helena
US|north-america|us-states|US-NE|Nebraska|Lincoln
US|north-america|us-states|US-NV|Nevada|Carson City
US|north-america|us-states|US-NH|New Hampshire|Concord
US|north-america|us-states|US-NJ|New Jersey|Trenton
US|north-america|us-states|US-NM|New Mexico|Santa Fe
US|north-america|us-states|US-NY|New York|Albany
US|north-america|us-states|US-NC|North Carolina|Raleigh
US|north-america|us-states|US-ND|North Dakota|Bismarck
US|north-america|us-states|US-OH|Ohio|Columbus
US|north-america|us-states|US-OK|Oklahoma|Oklahoma City
US|north-america|us-states|US-OR|Oregon|Salem
US|north-america|us-states|US-PA|Pennsylvania|Harrisburg
US|north-america|us-states|US-RI|Rhode Island|Providence
US|north-america|us-states|US-SC|South Carolina|Columbia
US|north-america|us-states|US-SD|South Dakota|Pierre
US|north-america|us-states|US-TN|Tennessee|Nashville
US|north-america|us-states|US-TX|Texas|Austin
US|north-america|us-states|US-UT|Utah|Salt Lake City
US|north-america|us-states|US-VT|Vermont|Montpelier
US|north-america|us-states|US-VA|Virginia|Richmond
US|north-america|us-states|US-WA|Washington|Olympia
US|north-america|us-states|US-WV|West Virginia|Charleston
US|north-america|us-states|US-WI|Wisconsin|Madison
US|north-america|us-states|US-WY|Wyoming|Cheyenne
CA|north-america|canada|CA-AB|Alberta|Edmonton
CA|north-america|canada|CA-BC|Britisch-Kolumbien|Victoria
CA|north-america|canada|CA-MB|Manitoba|Winnipeg
CA|north-america|canada|CA-NB|New Brunswick|Fredericton
CA|north-america|canada|CA-NL|Neufundland und Labrador|St. John’s
CA|north-america|canada|CA-NS|Nova Scotia|Halifax
CA|north-america|canada|CA-NT|Nordwest-Territorien|Yellowknife
CA|north-america|canada|CA-NU|Nunavut|Iqaluit
CA|north-america|canada|CA-ON|Ontario|Toronto
CA|north-america|canada|CA-PE|Prince Edward Island|Charlottetown
CA|north-america|canada|CA-QC|Québec|Québec
CA|north-america|canada|CA-SK|Saskatchewan|Regina
CA|north-america|canada|CA-YT|Yukon|Whitehorse
AU|oceania|australia|AU-ACT|Australian Capital Territory|Canberra
AU|oceania|australia|AU-NSW|New South Wales|Sydney
AU|oceania|australia|AU-NT|Northern Territory|Darwin
AU|oceania|australia|AU-QLD|Queensland|Brisbane
AU|oceania|australia|AU-SA|South Australia|Adelaide
AU|oceania|australia|AU-TAS|Tasmanien|Hobart
AU|oceania|australia|AU-VIC|Victoria|Melbourne
AU|oceania|australia|AU-WA|Western Australia|Perth
`.trim().split('\n').map((row) => {
  const [countryCode, continent, flagCollection, regionCode, region, name] = row.split('|')
  const parentNames = { DE: 'Deutschland', AT: 'Österreich', NL: 'Niederlande', CH: 'Schweiz', ES: 'Spanien', IT: 'Italien', PL: 'Polen', US: 'USA', CA: 'Kanada', AU: 'Australien' }
  return {
    id: `regional-capital-${regionCode}`,
    code: regionCode,
    name,
    region,
    parent: parentNames[countryCode],
    countryCode,
    continent,
    flagCollection,
    regionFlagId: `region-${regionCode}`,
    kind: 'regional-capital',
    topic: 'regional-capitals',
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
  ['eiffel-tower', 'Eiffelturm', 'Paris', 'Frankreich', 'FR', 'europe', 'Paris, Ufer der Seine', 'Eiffel Tower'],
  ['carcassonne', 'Festungsstadt Carcassonne', 'Carcassonne', 'Frankreich', 'FR', 'europe', 'Historische Festungsstadt Carcassonne', 'Cité de Carcassonne'],
  ['pont-du-gard', 'Pont du Gard', 'Okzitanien', 'Frankreich', 'FR', 'europe', 'Pont du Gard', 'Pont du Gard'],
  ['chartres', 'Kathedrale von Chartres', 'Chartres', 'Frankreich', 'FR', 'europe', 'Kathedrale von Chartres', 'Chartres Cathedral'],
  ['pompeii', 'Pompeji', 'Kampanien', 'Italien', 'IT', 'europe', 'Archäologische Stätten von Pompeji, Herculaneum und Torre Annunziata', 'Pompeii'],
  ['florence-cathedral', 'Kathedrale von Florenz', 'Florenz', 'Italien', 'IT', 'europe', 'Historisches Zentrum von Florenz', 'Florence Cathedral'],
  ['castel-del-monte', 'Castel del Monte', 'Apulien', 'Italien', 'IT', 'europe', 'Castel del Monte', 'Castel del Monte, Apulia'],
  ['cinque-terre', 'Cinque Terre', 'Ligurien', 'Italien', 'IT', 'europe', 'Portovenere, Cinque Terre und die Inseln', 'Cinque Terre'],
  ['wartburg', 'Wartburg', 'Eisenach', 'Deutschland', 'DE', 'europe', 'Wartburg', 'Wartburg'],
  ['museum-island', 'Museumsinsel Berlin', 'Berlin', 'Deutschland', 'DE', 'europe', 'Museumsinsel Berlin', 'Museum Island'],
  ['luebeck', 'Lübecker Altstadt', 'Lübeck', 'Deutschland', 'DE', 'europe', 'Hansestadt Lübeck', 'Lübeck'],
  ['aachen-cathedral', 'Aachener Dom', 'Aachen', 'Deutschland', 'DE', 'europe', 'Aachener Dom', 'Aachen Cathedral'],
  ['westminster', 'Westminster Abbey', 'London', 'Vereinigtes Königreich', 'GB', 'europe', 'Palace of Westminster und Westminster Abbey', 'Westminster Abbey'],
  ['edinburgh-castle', 'Edinburgh Castle', 'Edinburgh', 'Vereinigtes Königreich', 'GB', 'europe', 'Altstadt und Neustadt von Edinburgh', 'Edinburgh Castle'],
  ['roman-baths', 'Römische Bäder von Bath', 'Bath', 'Vereinigtes Königreich', 'GB', 'europe', 'Stadt Bath', 'Roman Baths (Bath)'],
  ['forth-bridge', 'Forth Bridge', 'Schottland', 'Vereinigtes Königreich', 'GB', 'europe', 'Forth Bridge', 'Forth Bridge'],
  ['jeronimos', 'Hieronymitenkloster', 'Lissabon', 'Portugal', 'PT', 'europe', 'Hieronymitenkloster und Turm von Belém', 'Jerónimos Monastery'],
  ['pena-palace', 'Palácio Nacional da Pena', 'Sintra', 'Portugal', 'PT', 'europe', 'Kulturlandschaft Sintra', 'Pena Palace'],
  ['coimbra', 'Universität Coimbra', 'Coimbra', 'Portugal', 'PT', 'europe', 'Universität Coimbra – Alta und Sofia', 'Biblioteca Joanina'],
  ['evora', 'Historisches Zentrum von Évora', 'Évora', 'Portugal', 'PT', 'europe', 'Historisches Zentrum von Évora', 'Évora'],
  ['delphi', 'Orakelstätte Delphi', 'Delphi', 'Griechenland', 'GR', 'europe', 'Archäologische Stätte von Delphi', 'Delphi'],
  ['olympia', 'Antikes Olympia', 'Olympia', 'Griechenland', 'GR', 'europe', 'Archäologische Stätte von Olympia', 'Olympia, Greece'],
  ['mycenae', 'Mykene', 'Peloponnes', 'Griechenland', 'GR', 'europe', 'Archäologische Stätten von Mykene und Tiryns', 'Mycenae'],
  ['knossos', 'Palast von Knossos', 'Kreta', 'Griechenland', 'GR', 'europe', 'Minoische Palastzentren', 'Knossos', 'de'],
  ['ephesus', 'Ephesos', 'İzmir', 'Türkei', 'TR', 'asia', 'Ephesos', 'Ephesus'],
  ['pamukkale', 'Pamukkale', 'Denizli', 'Türkei', 'TR', 'asia', 'Hierapolis–Pamukkale', 'Pamukkale'],
  ['troy', 'Troja', 'Çanakkale', 'Türkei', 'TR', 'asia', 'Archäologische Stätte von Troja', 'Troy'],
  ['goebekli-tepe', 'Göbekli Tepe', 'Şanlıurfa', 'Türkei', 'TR', 'asia', 'Göbekli Tepe', 'Göbekli Tepe'],
  ['victoria-falls', 'Victoriafälle', 'Sambia / Simbabwe', 'Sambia', 'ZM', 'africa', 'Mosi-oa-Tunya / Victoria Falls', 'Victoria Falls'],
  ['kilimanjaro', 'Kilimandscharo', 'Kilimandscharo', 'Tansania', 'TZ', 'africa', 'Kilimandscharo-Nationalpark', 'Mount Kilimanjaro'],
  ['lalibela', 'Felsenkirchen von Lalibela', 'Lalibela', 'Äthiopien', 'ET', 'africa', 'Felsenkirchen von Lalibela', 'Rock-Hewn Churches, Lalibela'],
  ['robben-island', 'Robben Island', 'Kapstadt', 'Südafrika', 'ZA', 'africa', 'Robben Island', 'Robben Island'],
  ['petra', 'Petra', 'Ma’an', 'Jordanien', 'JO', 'asia', 'Petra', 'Petra'],
  ['borobudur', 'Borobudur', 'Java', 'Indonesien', 'ID', 'asia', 'Tempelanlagen von Borobudur', 'Borobudur'],
  ['ha-long', 'Hạ-Long-Bucht', 'Quảng Ninh', 'Vietnam', 'VN', 'asia', 'Hạ-Long-Bucht–Cát-Bà-Archipel', 'Hạ Long Bay'],
  ['mount-fuji', 'Fuji', 'Honshū', 'Japan', 'JP', 'asia', 'Fuji-san, heiliger Ort und Quelle künstlerischer Inspiration', 'Mount Fuji'],
  ['iguazu', 'Iguazú-Wasserfälle', 'Misiones', 'Argentinien', 'AR', 'south-america', 'Iguazú-Nationalpark', 'Iguazu Falls'],
  ['galapagos', 'Galápagos-Inseln', 'Galápagos', 'Ecuador', 'EC', 'south-america', 'Galápagos-Inseln', 'Galápagos Islands'],
  ['rapa-nui', 'Moai von Rapa Nui', 'Osterinsel', 'Chile', 'CL', 'south-america', 'Nationalpark Rapa Nui', 'Easter Island'],
  ['cartagena', 'Altstadt von Cartagena', 'Cartagena', 'Kolumbien', 'CO', 'south-america', 'Hafen, Festungen und Baudenkmäler von Cartagena', 'Cartagena, Colombia'],
  ['great-barrier-reef', 'Great Barrier Reef', 'Queensland', 'Australien', 'AU', 'oceania', 'Great Barrier Reef', 'Great Barrier Reef Marine Park'],
  ['uluru', 'Uluṟu', 'Northern Territory', 'Australien', 'AU', 'oceania', 'Uluṟu-Kata-Tjuṯa-Nationalpark', 'Uluṟu'],
  ['te-wahipounamu', 'Milford Sound', 'Südinsel', 'Neuseeland', 'NZ', 'oceania', 'Te Wāhipounamu', 'Milford Sound'],
  ['tongariro', 'Tongariro-Nationalpark', 'Nordinsel', 'Neuseeland', 'NZ', 'oceania', 'Tongariro-Nationalpark', 'Tongariro National Park'],
]

export const landmarkCatalog = landmarkRows.map(([slug, name, city, parent, countryCode, continent, unescoName, wikipediaTitle, wikiLanguage]) => ({
  id: `landmark-${slug}`,
  code: countryCode,
  name,
  city,
  parent,
  countryCode,
  continent,
  unescoName,
  wikipediaTitle,
  wikiLanguage: wikiLanguage ?? 'en',
  image: `/assets/geography/landmarks/${slug}.webp`,
  kind: 'landmark',
  topic: 'landmarks',
}))

export const cityCatalog = cityRows
export const regionalCapitalCatalog = regionalCapitalRows
export const geographyCatalog = [...cityCatalog, ...regionalCapitalCatalog, ...landmarkCatalog]

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
  { id: 'regional-capitals-world', title: 'Provinz- & Landeshauptstädte', shortTitle: 'Regionale Hauptstädte', topic: 'regional-capitals', group: 'Global', symbol: '⌖', description: `${regionalCapitalRows.length} Bundesländer, Kantone, Staaten und ihre Hauptstädte.`, filter: (item) => item.kind === 'regional-capital', defaultQuizMode: 'region-capital', featured: true },
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

for (const [continent, title] of Object.entries(continentNames)) {
  const capitals = regionalCapitalRows.filter((item) => item.continent === continent)
  if (capitals.length < 4) continue
  geographyCollections.push({
    id: `regional-capitals-${continent}`,
    title: `Regionale Hauptstädte in ${title}`,
    shortTitle: title,
    topic: 'regional-capitals',
    group: title,
    symbol: '⌖',
    description: `${capitals.length} Verwaltungseinheiten und ihre Hauptstädte.`,
    continent,
    filter: (item) => item.kind === 'regional-capital' && item.continent === continent,
    defaultQuizMode: 'region-capital',
  })
}

for (const [countryCode, items] of groupBy(regionalCapitalRows, (item) => item.countryCode)) {
  const { parent, continent } = items[0]
  geographyCollections.push({
    id: `regional-capitals-country-${countryCode.toLowerCase()}`,
    title: `Regionale Hauptstädte: ${parent}`,
    shortTitle: parent,
    topic: 'regional-capitals',
    group: continentNames[continent],
    symbol: countryCode,
    description: `${items.length} Regionen und ihre Verwaltungssitze.`,
    countryCode,
    continent,
    filter: (item) => item.kind === 'regional-capital' && item.countryCode === countryCode,
    defaultQuizMode: 'region-capital',
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
