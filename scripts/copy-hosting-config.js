import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

mkdirSync('dist/.openai', { recursive: true })
copyFileSync('.openai/hosting.json', 'dist/.openai/hosting.json')
writeFileSync('dist/client/build-info.json', JSON.stringify({
  buildId: randomUUID(),
  builtAt: new Date().toISOString(),
}, null, 2))
