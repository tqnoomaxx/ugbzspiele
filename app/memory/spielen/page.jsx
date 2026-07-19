import { isMemoryReady, memoryManifest } from '../../../src/games/memory/manifest.js'
import MemoryGamePage from '../../../src/screens/MemoryGamePage.jsx'
import MemoryUnavailableRedirect from '../../../src/screens/MemoryUnavailableRedirect.jsx'

export const dynamic = 'force-static'

export default function MemoryGameRoute() {
  if (!isMemoryReady(memoryManifest)) return <MemoryUnavailableRedirect />
  return <MemoryGamePage />
}
