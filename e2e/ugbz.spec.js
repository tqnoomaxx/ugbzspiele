import { expect, test } from '@playwright/test'
import { europeMapTargets } from '../src/games/flaggenkunde/mapManifest.generated.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

test('alle Produktrouten und alte Imposter-Links funktionieren', async ({ page }) => {
  for (const path of ['/', '/flaggen', '/flaggen/lernen', '/kartenspiel', '/imposter', '/kniffel', '/schiffe-versenken', '/werwolf']) {
    const response = await page.goto(path)
    expect(response?.ok(), `${path} sollte erreichbar sein`).toBe(true)
    await expect(page.locator('body')).not.toContainText('404')
  }

  await page.goto('/doppelwort?code=ABCDE')
  await expect(page).toHaveURL(/\/imposter\?code=ABCDE$/)
  await expect(page.getByRole('heading', { name: 'Imposter' })).toBeVisible()

  const memoryManifestResponse = await page.request.get('/assets/memory/manifest.json')
  const memoryManifest = await memoryManifestResponse.json()
  await page.goto('/')
  if (memoryManifest.ready) {
    await expect(page.getByRole('heading', { name: 'Memory' })).toBeVisible()
    await page.goto('/memory')
    await expect(page.getByRole('heading', { name: 'Welches Bilder-Set?' })).toBeVisible()
  } else {
    await expect(page.getByRole('heading', { name: 'Memory' })).toHaveCount(0)
    await page.goto('/memory')
    await expect(page).toHaveURL(/\/$/)
  }
})

test('Flaggenkunde startet eine Runde und speichert die erste Antwort lokal', async ({ page }) => {
  await page.goto('/flaggen')
  await expect(page.getByRole('heading', { name: 'Was möchtest du lernen?' })).toBeVisible()
  await expect(page.locator('.fq-learning-progress')).toContainText('von 1071 Flaggen')
  await expect(page.locator('.fq-start-panel')).toHaveAttribute('aria-busy', 'false')

  const germany = page.getByRole('button', { name: /Deutsche Bundesländer/ })
  await germany.click()
  await expect(germany).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /10 Fragen/ }).click()
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page).toHaveURL(/\/flaggen\/spielen$/)
  await expect(page.locator('.fq-flag-image')).toBeVisible()
  await expect(page.locator('.fq-answer-grid button')).toHaveCount(4)

  const chosenAnswer = page.locator('.fq-answer-grid button').first()
  await chosenAnswer.click()
  await expect(chosenAnswer).toHaveClass(/is-(?:correct|wrong)/)
  await expect(page.locator('.fq-feedback')).toHaveClass(/is-visible/)
  await expect(page.getByRole('button', { name: 'Nächste Flagge' })).toBeVisible()
  const progress = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ugbz:flaggenkunde:progress:v1')))
  expect(Object.keys(progress.stats)).toHaveLength(1)

  await page.goto('/flaggen/lernen')
  await page.getByRole('searchbox', { name: 'Flaggen suchen' }).fill('Bayern')
  await expect(page.locator('.fq-flag-tile')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Bayern' })).toBeVisible()
})

test('Flaggenkunde zeigt die Regionslage und wiederholt einen Fehler später', async ({ page }) => {
  await page.goto('/flaggen')
  await page.evaluate(() => {
    const quiz = {
      version: 3,
      collectionId: 'germany',
      quizMode: 'choice',
      repeatMistakes: true,
      phase: 'question',
      questionIndex: 0,
      questions: [
        { flagId: 'region-DE-BY', optionIds: ['region-DE-BE', 'region-DE-BY', 'region-DE-HH', 'region-DE-HB'] },
        { flagId: 'region-DE-BE', optionIds: ['region-DE-BE', 'region-DE-BY', 'region-DE-HH', 'region-DE-HB'] },
      ],
      baseQuestionCount: 2,
      repeatCount: 0,
      answers: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      startedAt: new Date().toISOString(),
    }
    window.sessionStorage.setItem('ugbz:flaggenkunde:quiz:v3', JSON.stringify(quiz))
  })
  await page.goto('/flaggen/spielen')

  await page.getByRole('button', { name: /Berlin/ }).click()
  await expect(page.locator('.fq-feedback')).toContainText('Sie kommt später noch einmal.')
  const locatorMap = page.locator('.fq-location-card img')
  await expect(page.locator('.fq-location-card')).toContainText('Deutschland')
  await expect(locatorMap).toBeVisible()
  await expect.poll(() => locatorMap.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Nächste Flagge' }).click()
  await page.getByRole('button', { name: /Berlin$/ }).click()
  await page.getByRole('button', { name: 'Nächste Flagge' }).click()
  await expect(page.locator('.fq-question-copy')).toContainText('Wiederholung')
  await page.getByRole('button', { name: /Bayern$/ }).click()
  await page.getByRole('button', { name: 'Ergebnis ansehen' }).click()
  await expect(page.locator('.fq-result-stats')).toContainText('1wiederholt')
})

test('Flaggenkunde unterstützt Eingabe, umgekehrte Auswahl und Kartenfragen', async ({ page }) => {
  async function installQuiz(quizMode, questions) {
    await page.goto('/flaggen')
    await page.evaluate(({ mode, quizQuestions }) => {
      window.sessionStorage.setItem('ugbz:flaggenkunde:quiz:v3', JSON.stringify({
        version: 3,
        collectionId: 'germany',
        quizMode: mode,
        repeatMistakes: true,
        phase: 'question',
        questionIndex: 0,
        questions: quizQuestions,
        baseQuestionCount: quizQuestions.length,
        repeatCount: 0,
        answers: [],
        score: 0,
        streak: 0,
        bestStreak: 0,
        startedAt: new Date().toISOString(),
      }))
    }, { mode: quizMode, quizQuestions: questions })
    await page.goto('/flaggen/spielen')
  }

  await installQuiz('type', [{ flagId: 'region-DE-BY' }])
  await page.getByRole('textbox', { name: 'Deine Antwort' }).fill('bayern')
  await page.getByRole('button', { name: /Prüfen/ }).click()
  await expect(page.locator('.fq-feedback')).toContainText('Richtig erkannt!')

  await installQuiz('reverse', [{ flagId: 'region-DE-BY', optionIds: ['region-DE-BY', 'region-DE-BE', 'region-DE-HH', 'region-DE-HB'] }])
  await expect(page.getByRole('heading', { name: 'Bayern' })).toBeVisible()
  await page.getByRole('button', { name: 'Bild 1' }).click()
  await expect(page.locator('.fq-feedback')).toContainText('Richtig erkannt!')
  await expect(page.locator('.fq-answer-grid--flags img')).toHaveCount(4)

  let firstMapRequest = true
  await page.route('**/assets/flags/interactive/*.json', (route) => {
    if (firstMapRequest) {
      firstMapRequest = false
      return route.fulfill({ status: 503, body: 'Vorübergehend nicht verfügbar' })
    }
    return route.continue()
  })
  await installQuiz('map', [{ flagId: 'region-DE-BY' }])
  await expect(page.getByText('Die Karte konnte nicht geladen werden.')).toBeVisible()
  await page.getByRole('button', { name: 'Erneut versuchen' }).click()
  await page.locator('[data-map-region="region-DE-BW"]').click()
  await expect(page.locator('.fq-map-try-again')).toContainText('Baden-Württemberg ist es noch nicht.')
  await page.locator('[data-map-region="region-DE-BY"]').click()
  await expect(page.locator('.fq-feedback')).toContainText('Richtig gefunden!')
})

test('Europa-Hypermodus zeigt alle Regionen und wechselt nach einem Treffer automatisch zum nächsten Ziel', async ({ page }) => {
  await page.goto('/flaggen')
  const hyperMode = page.getByRole('button', { name: /Europa-Hypermodus/ })
  await expect(hyperMode).toContainText(String(europeMapTargets.length))
  await hyperMode.click()
  await expect(page.locator('.fq-hyper-total')).toContainText(String(europeMapTargets.length))
  await expect(page.getByText('Europa-Karte aktiviert')).toBeVisible()

  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page.locator('.fq-region-map--europe [data-map-region]')).toHaveCount(europeMapTargets.length)
  const started = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ugbz:flaggenkunde:quiz:v3')))
  expect(started.quizMode).toBe('europe-map')
  expect(new Set(started.questions.map((question) => question.flagId)).size).toBe(europeMapTargets.length)

  await page.evaluate(() => {
    window.sessionStorage.setItem('ugbz:flaggenkunde:quiz:v3', JSON.stringify({
      version: 3,
      collectionId: 'europe-hyper',
      quizMode: 'europe-map',
      repeatMistakes: false,
      phase: 'question',
      questionIndex: 0,
      questions: [{ flagId: 'region-DE-BY' }, { flagId: 'region-DE-BE' }],
      baseQuestionCount: 2,
      repeatCount: 0,
      answers: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      startedAt: new Date().toISOString(),
    }))
  })
  await page.goto('/flaggen/spielen')
  await expect(page.locator('.fq-region-map--europe [data-map-region]')).toHaveCount(europeMapTargets.length)
  await page.getByLabel('Kartenausschnitt wählen').selectOption('Deutschland')
  await page.locator('[data-map-region="region-DE-BY"]').click()
  await expect(page.locator('.fq-feedback')).toContainText('Richtig gefunden!')
  await expect(page.getByRole('heading', { name: 'Berlin' })).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.fq-game-progress')).toHaveAttribute('aria-label', 'Frage 2 von 2')
  await page.locator('[data-map-region="region-DE-BE"]').click()
  await expect(page.getByRole('heading', { name: 'Europa gemeistert!' })).toBeVisible()
  await expect(page.locator('.fq-result-stats')).toContainText('2/2gelernt')
})

test('Europa-Hypermodus kann ein unbekanntes Gebiet überspringen', async ({ page }) => {
  await page.goto('/flaggen')
  await page.evaluate(() => {
    window.sessionStorage.setItem('ugbz:flaggenkunde:quiz:v3', JSON.stringify({
      version: 3,
      collectionId: 'europe-hyper',
      quizMode: 'europe-map',
      repeatMistakes: false,
      phase: 'question',
      questionIndex: 0,
      questions: [{ flagId: 'region-DE-BY' }, { flagId: 'region-DE-BE' }],
      baseQuestionCount: 2,
      repeatCount: 0,
      answers: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      startedAt: new Date().toISOString(),
    }))
  })
  await page.goto('/flaggen/spielen')
  await page.getByRole('button', { name: /Überspringen/ }).click()
  await expect(page.locator('.fq-feedback')).toContainText('Übersprungen')
  await expect(page.getByRole('heading', { name: 'Berlin' })).toBeVisible({ timeout: 3000 })
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ugbz:flaggenkunde:quiz:v3')))
  expect(stored.answers[0]).toMatchObject({ flagId: 'region-DE-BY', skipped: true, correct: false })
})

test('Hauptstädte, Stadtbilder und UNESCO-Orte lassen sich natürlich filtern und spielen', async ({ page }) => {
  await page.goto('/flaggen')
  await page.getByLabel('Nach Land filtern').selectOption('BG')
  const bulgaria = page.getByRole('button', { name: /Bulgarien: Regionen mit Flaggen/ })
  await expect(bulgaria).toContainText('1 Gebiet')
  await bulgaria.click()
  await expect(page.getByRole('button', { name: /Flaggenbild → Eingabe/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Flaggenbild → Name/ })).toBeDisabled()

  await page.goto('/flaggen')
  await page.getByRole('tab', { name: /Hauptstädte & Städte/ }).click()
  await expect(page.getByRole('button', { name: /Hauptstädte der Welt/ })).toBeVisible()
  await page.getByLabel('Nach Kontinent filtern').selectOption('europe')
  await expect(page.getByRole('button', { name: /Hauptstädte Europas/ })).toBeVisible()
  await page.getByLabel('Nach Land filtern').selectOption('ES')
  const spanishCities = page.getByRole('button', { name: /Städte in Spanien/ })
  await spanishCities.click()
  await page.getByRole('button', { name: /Name → Stadtbild/ }).click()
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page.getByText('Name → Stadtbild')).toBeVisible()
  await expect(page.locator('.fq-answer-grid--flags img')).toHaveCount(4)
  await expect(page.locator('.fq-answer-grid--flags img').first()).toHaveJSProperty('complete', true)

  await page.goto('/flaggen')
  await page.getByRole('tab', { name: /Sehenswürdigkeiten & UNESCO/ }).click()
  await page.getByLabel('Nach Land filtern').selectOption('ES')
  const spanishHeritage = page.getByRole('button', { name: /Welterbe in Spanien/ })
  await expect(spanishHeritage).toContainText('5')
  await spanishHeritage.click()
  await expect(page.getByRole('button', { name: /Bild → Sehenswürdigkeit/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page.locator('.fq-quiz-photo')).toBeVisible()
  await expect.poll(() => page.locator('.fq-quiz-photo').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
  const correctIndex = await page.evaluate(() => {
    const quiz = JSON.parse(sessionStorage.getItem('ugbz:flaggenkunde:quiz:v3'))
    return quiz.questions[0].optionIds.indexOf(quiz.questions[0].flagId)
  })
  await page.locator('.fq-answer-grid button').nth(correctIndex).click()
  await expect(page.locator('.fq-feedback')).toContainText('Richtig erkannt!')
})

test('regionale Hauptstädte und der auswählbare Hypermodus sind spielbar', async ({ page }) => {
  await page.goto('/flaggen')
  await page.getByRole('tab', { name: /Regionale Hauptstädte/ }).click()
  const regionalWorld = page.getByRole('button', { name: /Provinz- & Landeshauptstädte/ })
  await expect(regionalWorld).toContainText('189')
  await page.getByLabel('Nach Land filtern').selectOption('DE')
  const germany = page.getByRole('button', { name: /Regionale Hauptstädte: Deutschland/ })
  await germany.click()
  await expect(page.getByRole('button', { name: /Region → Hauptstadt/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page.getByText('Region → Hauptstadt')).toBeVisible()
  await expect(page.locator('.fq-regional-capital-stage img')).toBeVisible()
  await expect(page.locator('.fq-answer-grid button')).toHaveCount(4)

  await page.goto('/flaggen')
  await page.getByRole('tab', { name: /Hypermodus/ }).click()
  const categoryButtons = page.locator('.fq-hyper-category-grid button')
  await expect(categoryButtons).toHaveCount(6)
  await expect(page.getByRole('button', { name: /Provinzflaggen/ })).toContainText('817')
  for (const index of [0, 1, 2, 4, 5]) await categoryButtons.nth(index).click()
  await expect(categoryButtons.nth(3)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.fq-hyper-builder')).toContainText('189 unterschiedliche Lernkarten')
  await page.getByRole('button', { name: /10 Fragen/ }).click()
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ugbz:flaggenkunde:quiz:v3')))
  expect(stored.quizMode).toBe('mixed')
  expect(stored.hyperCategories).toEqual(['regional-capitals'])
  expect(stored.questions).toHaveLength(10)
  expect(stored.questions.every((question) => ['region-capital', 'capital-region'].includes(question.quizMode))).toBe(true)
  await expect(page.locator('.fq-answer-grid button')).toHaveCount(4)
})

test('die neuen Fragetypen starten über die Auswahl und bleiben mobil bedienbar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const [title, mode, selector] of [
    ['Flaggenbild → Eingabe', 'type', '.fq-type-answer input'],
    ['Name → Flaggenbild', 'reverse', '.fq-answer-grid--flags'],
    ['Flaggenbild → Karte', 'map', '.fq-region-map svg'],
  ]) {
    await page.goto('/flaggen')
    await page.getByRole('button', { name: /Deutsche Bundesländer/ }).click()
    await page.getByRole('button', { name: new RegExp(title) }).click()
    await page.getByRole('button', { name: 'Quiz starten' }).click()
    await expect(page.locator(selector)).toBeVisible()
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('ugbz:flaggenkunde:quiz:v3')).quizMode)).toBe(mode)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  const svg = page.locator('.fq-region-map svg')
  const original = await svg.getAttribute('viewBox')
  await page.getByRole('button', { name: 'Karte vergrößern' }).click()
  await expect(svg).not.toHaveAttribute('viewBox', original)
  const zoomed = await svg.getAttribute('viewBox')
  const box = await svg.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 8 })
  await page.mouse.up()
  await expect(svg).not.toHaveAttribute('viewBox', zoomed)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('ugbz:flaggenkunde:quiz:v3')).answers)).toHaveLength(0)
  await page.getByRole('button', { name: 'Kartenansicht zurücksetzen' }).click()
  await expect(svg).toHaveAttribute('viewBox', original)
  expect(errors).toEqual([])
})

test('auch kleine Hypermodus-Gebiete bleiben als echte Flächen anklickbar', async ({ page }) => {
  for (const name of ['Athos', 'Encamp', 'Monaco']) {
    const target = europeMapTargets.find((region) => region.name === name)
    expect(target, name).toBeTruthy()
    await page.goto('/flaggen')
    await page.evaluate((id) => sessionStorage.setItem('ugbz:flaggenkunde:quiz:v3', JSON.stringify({
      version: 3, collectionId: 'europe-hyper', quizMode: 'europe-map', repeatMistakes: false,
      phase: 'question', questionIndex: 0, questions: [{ flagId: id }], baseQuestionCount: 1,
      repeatCount: 0, answers: [], score: 0, streak: 0, bestStreak: 0, startedAt: new Date().toISOString(),
    })), target.id)
    await page.goto('/flaggen/spielen')
    await page.getByLabel('Kartenausschnitt wählen').selectOption(target.parent)
    const point = await page.locator(`[data-map-region="${target.id}"]`).evaluate((shape) => {
      const box = shape.getBBox()
      for (let y = 1; y < 30; y += 1) for (let x = 1; x < 30; x += 1) {
        const local = new DOMPoint(box.x + box.width * x / 30, box.y + box.height * y / 30)
        if (!shape.isPointInFill(local)) continue
        const screen = local.matrixTransform(shape.getScreenCTM())
        if (document.elementFromPoint(screen.x, screen.y) === shape) return { x: screen.x, y: screen.y }
      }
      return null
    })
    expect(point, `${name} muss eine sichtbare, anklickbare Fläche haben`).not.toBeNull()
    await page.mouse.click(point.x, point.y)
    await expect(page.getByRole('heading', { name: 'Europa gemeistert!' })).toBeVisible()
  }
})

test('Memory mischt acht Paare in ein vollständig sichtbares mobiles Brett', async ({ page }) => {
  const manifestResponse = await page.request.get('/assets/memory/manifest.json')
  const manifest = await manifestResponse.json()
  test.skip(!manifest.ready, 'Für diesen Build sind keine Memory-Motive hinterlegt.')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/memory')
  await expect(page.getByRole('button', { name: '7 Paare' })).toBeVisible()
  await page.getByRole('button', { name: '8 Paare' }).click()
  await page.getByRole('button', { name: 'Spiel starten' }).click()
  await expect(page).toHaveURL(/\/memory\/spielen$/)
  await expect(page.locator('.memory-card')).toHaveCount(16)
  await page.locator('.memory-card').first().click()
  await expect(page.locator('.memory-card.is-revealed')).toHaveCount(1)

  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight,
  }))
  expect(overflow).toEqual({ horizontal: false, vertical: false })
})

test('Schiffe versenken schützt beide Flotten und erreicht den ersten Schuss', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/schiffe-versenken')
  await page.getByRole('textbox', { name: 'Erste Person' }).fill('Ada')
  await page.getByRole('textbox', { name: 'Zweite Person' }).fill('Ben')
  await page.getByRole('button', { name: /Neue Partie starten/ }).click()
  await expect(page).toHaveURL(/\/schiffe-versenken\/spiel$/)

  for (const name of ['Ada', 'Ben']) {
    await page.getByRole('button', { name: new RegExp(`Ich bin ${name}`) }).click()
    await page.getByRole('button', { name: /Flotte zufällig aufstellen/ }).click()
    await page.getByRole('button', { name: /Flotte bestätigen/ }).click()
  }

  await page.getByRole('button', { name: /Bereit zum Feuern/ }).click()
  const targetTab = page.getByRole('tab', { name: 'Zielraster' })
  await targetTab.focus()
  await targetTab.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Eigene Flotte' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Eigene Flotte' }).press('ArrowLeft')
  const target = page.getByRole('grid', { name: /Zielraster von/ })
  const firstCell = target.getByRole('gridcell').first()
  await firstCell.focus()
  await firstCell.press('ArrowRight')
  await expect(target.locator('[data-bs-cell="0:1"]')).toBeFocused()
  await target.locator('[data-bs-cell="0:1"]').click()
  await page.getByRole('button', { name: /feuern/ }).click()
  await expect(page.getByRole('dialog')).toContainText(/Treffer|Daneben/)
})

test('Werwolf verteilt fünf Rollen einzeln und startet die erste Nacht', async ({ page }) => {
  await page.goto('/werwolf')
  const inPersonVote = page.getByRole('button', { name: /Gemeinsam im Raum/ })
  await inPersonVote.click()
  await expect(inPersonVote).toHaveAttribute('aria-pressed', 'true')
  const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eli']
  const inputs = page.locator('.ww-name input')
  for (let index = 0; index < names.length; index += 1) await inputs.nth(index).fill(names[index])
  await page.getByRole('button', { name: 'Rollen verteilen' }).click()
  await expect(page).toHaveURL(/\/werwolf\/spiel$/)

  for (const name of names) {
    await page.getByRole('button', { name: new RegExp(`Ich bin ${name}`) }).click()
    await expect(page.getByText('Dein Ziel')).toBeVisible()
    await page.getByRole('button', { name: /Rolle merken/ }).click()
  }

  await expect(page.getByRole('heading', { name: 'Gerät zurück an die Spielleitung geben.' })).toBeVisible()
  const hiddenNight = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ugbz:werewolf:v1')))
  const wolf = hiddenNight.players.find((player) => player.role === 'wolf')
  await expect(page.locator('body')).not.toContainText(wolf.name)
  await page.getByRole('button', { name: 'Ich bin die Spielleitung' }).click()
  await expect(page.getByRole('heading', { name: 'Die Werwölfe erwachen.' })).toBeVisible()

  const wolfVictim = hiddenNight.players.find((player) => player.role !== 'wolf')
  await page.locator('.ww-target-grid button').filter({ hasText: wolfVictim.name }).click()
  await page.locator('.ww-action-card > .button').click()
  await expect(page.getByRole('heading', { name: 'Die Seherin erwacht.' })).toBeVisible()
  await expect(page.locator('.ww-target-grid button[aria-pressed="true"]')).toHaveCount(0)

  const seerNight = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ugbz:werewolf:v1')))
  const seer = seerNight.players.find((player) => player.role === 'seer')
  const inspected = seerNight.players.find((player) => player.id !== seer.id && player.alive)
  await page.locator('.ww-target-grid button').filter({ hasText: inspected.name }).click()
  await page.locator('.ww-action-card > .button').click()
  await expect(page.getByRole('dialog')).toContainText(new RegExp(`${inspected.name} ist`))

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Gerät zurück an die Spielleitung geben.' })).toBeVisible()
  await page.getByRole('button', { name: 'Ich bin die Spielleitung' }).click()
  await expect(page.getByRole('dialog')).toContainText(new RegExp(`${inspected.name} ist`))
  await page.getByRole('button', { name: 'Ergebnis wieder verdecken' }).click()
  await expect(page.getByRole('heading', { name: 'Das Dorf erwacht.' })).toBeVisible()
  await page.getByRole('button', { name: 'Dorfversammlung beginnen' }).click()
  await expect(page.getByRole('heading', { name: 'Wer wurde gewählt?' })).toBeVisible()
  const dayState = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ugbz:werewolf:v1')))
  const voted = dayState.players.find((player) => player.alive && player.role === 'villager')
  await page.locator('.ww-target-grid button').filter({ hasText: voted.name }).click()
  await page.getByRole('button', { name: `${voted.name} wurde gewählt` }).click()
  await expect(page.getByRole('heading', { name: `${voted.name} scheidet aus.` })).toBeVisible()
})

test('Kartenspiel lässt sich beenden und führt korrekt zur Startseite', async ({ page }) => {
  await page.goto('/kartenspiel')
  for (let count = 3; count <= 7; count += 1) {
    await page.getByRole('button', { name: 'Spieler hinzufügen' }).click()
    await expect(page.locator('.player-input input')).toHaveCount(count)
  }
  const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eli', 'Faye', 'Gus']
  const playerInputs = page.locator('.player-input input')
  for (let index = 0; index < names.length; index += 1) await playerInputs.nth(index).fill(names[index])
  await page.getByRole('button', { name: 'Nur Hin' }).click()
  await page.getByRole('button', { name: 'Spiel starten' }).click()
  await expect(page).toHaveURL(/\/kartenspiel\/spielen$/)

  for (let cards = 1; cards <= 4; cards += 1) {
    await page.getByRole('button', { name: 'Ansagen bestätigen' }).click()
    await page.getByRole('spinbutton', { name: 'Ada: Ergebnis' }).fill(String(cards))
    await page.getByRole('button', { name: 'Runde auswerten' }).click()
  }

  await expect(page.getByText('Spiel beendet')).toBeVisible()
  await page.getByRole('button', { name: 'Zur Startseite' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Was wird gespielt?' })).toBeVisible()
})

test('Kniffel bietet Tastatur-Tabs, lokale Sicherung und einen echten Wurf', async ({ page }) => {
  await page.goto('/kniffel')
  await expect(page.locator('.kf-setup-card')).toHaveAttribute('aria-busy', 'false')
  const createTab = page.getByRole('tab', { name: 'Neuen Tisch einrichten' })
  await createTab.focus()
  await createTab.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Mit Code beitreten' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Mit Code beitreten' }).press('ArrowLeft')

  await page.getByLabel('Dein Name').fill('Ada')
  await page.getByRole('button', { name: /Kniffeltisch eröffnen/ }).click()
  await expect(page).toHaveURL(/\/kniffel\/spiel$/)
  await expect(page.getByText('Ein Gerät', { exact: true })).toBeVisible()
  await expect(page.getByText('Lokal gespeichert')).toBeVisible()
  await expect(page.getByRole('button', { name: /Raumcode/ })).toHaveCount(0)

  await page.getByRole('button', { name: /Partie starten/ }).click()
  await page.getByRole('button', { name: /^Würfeln/ }).click()
  await expect(page.locator('.kf-roll-controls i.is-used')).toHaveCount(1)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sicherung exportieren' }).click()
  const backup = await download
  expect(backup.suggestedFilename()).toMatch(/^ugbz-kniffel-[A-Z2-9]+\.json$/)
  const backupPath = await backup.path()
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear() })
  await page.goto('/kniffel')
  await page.locator('.kf-backup-import input').setInputFiles(backupPath)
  await expect(page).toHaveURL(/\/kniffel\/spiel$/)
  await expect(page.getByText('Ada', { exact: true }).first()).toBeVisible()
})

test('Imposter erstellt mit einem Preset einen spielbaren lokalen Raum', async ({ page }) => {
  await page.goto('/imposter')
  await expect(page.locator('.dw-lobby-grid')).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('tab', { name: 'Raum erstellen' }).click()
  await page.getByRole('button', { name: /Schnell/ }).click()
  await page.getByLabel('Dein Name').fill('Ada')
  await page.getByLabel('Raumname').fill('Testsalon')
  await page.getByRole('button', { name: /Raum eröffnen/ }).click()
  await expect(page).toHaveURL(/\/imposter\/raum$/)
  await expect(page.getByRole('heading', { name: 'Wartet auf eure Runde' })).toBeVisible()
  await expect(page.getByText('Testsalon')).toBeVisible()
})

test('wichtige Ansichten bleiben auf einem kleinen Handy ohne horizontalen Überlauf', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/', '/flaggen', '/flaggen/lernen', '/kartenspiel', '/imposter', '/kniffel', '/schiffe-versenken', '/werwolf']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${path} darf nicht horizontal überlaufen`).toBeLessThanOrEqual(1)
  }
})
