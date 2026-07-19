export function preloadMemoryAssets(assets, { timeoutMs = 15_000 } = {}) {
  if (typeof Image === 'undefined') return Promise.resolve()
  const uniqueSources = [...new Set(assets.map((asset) => asset.src))]
  return Promise.all(uniqueSources.map((src) => new Promise((resolve, reject) => {
    const image = new Image()
    let settled = false
    let timer = null
    const finish = (callback) => {
      if (settled) return
      settled = true
      if (timer) globalThis.clearTimeout(timer)
      callback()
    }
    image.onload = () => finish(resolve)
    image.onerror = () => finish(() => reject(new Error(`Bild konnte nicht geladen werden: ${src}`)))
    timer = globalThis.setTimeout(() => finish(() => reject(new Error(`Bild lädt zu lange: ${src}`))), timeoutMs)
    image.src = src
    if (typeof image.decode === 'function') image.decode().then(() => finish(resolve)).catch(() => {})
  }))).then(() => undefined)
}
