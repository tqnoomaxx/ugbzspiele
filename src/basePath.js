const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function appPath(path = '/') {
  if (!path.startsWith('/')) return path
  return `${basePath}${path}` || '/'
}
