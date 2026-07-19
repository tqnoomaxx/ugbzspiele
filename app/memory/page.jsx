import { isMemoryReady, memoryManifest } from '../../src/games/memory/manifest.js'
import MemorySetupPage from '../../src/screens/MemorySetupPage.jsx'
import MemoryUnavailableRedirect from '../../src/screens/MemoryUnavailableRedirect.jsx'

export const dynamic = 'force-static'

export default function MemorySetupRoute() {
  if (!isMemoryReady(memoryManifest)) return <MemoryUnavailableRedirect />
  return <MemorySetupPage />
}
