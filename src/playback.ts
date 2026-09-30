import type { Title } from './catalog'

export function getAuthorizedEmbedUrl(value: string): string | null {
  const input = value.trim()
  if (!input) return null

  let candidate = input
  if (input.includes('<iframe')) {
    candidate = new DOMParser().parseFromString(input, 'text/html').querySelector('iframe')?.getAttribute('src') ?? ''
  }

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

// Accepts either a path prefix ending in /tv/ or /movie/ (ID appended to the path)
// or a query-style base such as https://nxsha.space/embed (ID passed as ?tmdb=).
export function getAuthorizedEmbedPrefix(value: string, type: 'tv' | 'movie'): string | null {
  const authorizedUrl = getAuthorizedEmbedUrl(value)
  if (!authorizedUrl) return null

  const url = new URL(authorizedUrl)
  const otherType = type === 'tv' ? 'movie' : 'tv'
  return url.pathname.endsWith(`/${otherType}/`) ? null : url.toString()
}

export function getTitleEmbedUrl(title: Title, tvTemplate: string, movieTemplate: string, language = 'eng'): string | null {
  const type = title.kind === 'Series' ? 'tv' : 'movie'
  const prefix = getAuthorizedEmbedPrefix(type === 'tv' ? tvTemplate : movieTemplate, type)
  if (!prefix || !title.tmdbId) return null

  const url = new URL(prefix)
  if (url.pathname.endsWith(`/${type}/`)) {
    url.pathname = `${url.pathname}${title.tmdbId}${type === 'tv' ? '/1/1' : ''}`
    return url.toString()
  }

  url.searchParams.set('tmdb', String(title.tmdbId))
  url.searchParams.set('type', type)
  if (type === 'tv') {
    url.searchParams.set('s', '1')
    url.searchParams.set('e', '1')
  }
  if (language) url.searchParams.set('lan', language)
  return url.toString()
}

export function getAuthorizedPlaybackUrl(title: Title): string | null {
  if (!title.playbackUrl) return null

  try {
    const url = new URL(title.playbackUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}
