const pageStateCache = {}

export function getCachedPageState(pageKey) {
  return pageStateCache[pageKey] || null
}

export function setCachedPageState(pageKey, value) {
  pageStateCache[pageKey] = value
}
