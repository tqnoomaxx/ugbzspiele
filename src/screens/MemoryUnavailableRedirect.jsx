'use client'

import { useEffect } from 'react'
import { appPath } from '../basePath.js'

export default function MemoryUnavailableRedirect() {
  useEffect(() => { window.location.replace(appPath('/')) }, [])
  return null
}
