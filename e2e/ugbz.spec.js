import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

test('alle Produktrouten und alte Imposter-Links funktionieren', async ({ page }) => {
  for (const path of ['/', '/kartenspiel', '/imposter', '/kniffel', '/schiffe-versenken', '/werwolf']) {
    const response = await page.goto(path)
    expect(response?.ok(), `${path} sollte erreichbar sein`).toBe(true)
    await expect(page.locator('body')).not.toContainText('404')
  }

  await page.goto('/doppelwort?code=ABCDE')
  await expect(page).toHaveURL(/\/imposter\?code=ABCDE$/)
  await expect(page.getByRole('heading', { name: 'Imposter' })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Memory' })).toHaveCount(0)
  await page.goto('/memory')
  await expect(page).toHaveURL(/\/$/)
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
  for (const path of ['/', '/kartenspiel', '/imposter', '/kniffel', '/schiffe-versenken', '/werwolf']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${path} darf nicht horizontal überlaufen`).toBeLessThanOrEqual(1)
  }
})
