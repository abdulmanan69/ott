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

export function getAuthorizedEmbedPrefix(value: string, type: 'tv' | 'movie'): string | null {
  const authorizedUrl = getAuthorizedEmbedUrl(value)
  if (!authorizedUrl) return null

  const url = new URL(authorizedUrl)
  return url.pathname.endsWith(`/${type}/`) ? url.toString() : null
}

export function getTitleEmbedUrl(title: Title, tvTemplate: string, movieTemplate: string): string | null {
  const type = title.kind === 'Series' ? 'tv' : 'movie'
  const prefix = getAuthorizedEmbedPrefix(type === 'tv' ? tvTemplate : movieTemplate, type)
  if (!prefix || !title.tmdbId) return null

  const url = new URL(prefix)
  url.pathname = `${url.pathname}${title.tmdbId}${type === 'tv' ? '/1/1' : ''}`
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
