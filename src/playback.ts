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

export function getTitleEmbedUrl(title: Title, tvTemplate: string, movieTemplate: string, season = 1, episode = 1): string | null {
  const type = title.kind === 'Series' ? 'tv' : 'movie'
  const prefix = getAuthorizedEmbedPrefix(type === 'tv' ? tvTemplate : movieTemplate, type)
  if (!prefix || !title.tmdbId) return null

  const safeSeason = Math.max(1, Math.floor(season) || 1)
  const safeEpisode = Math.max(1, Math.floor(episode) || 1)
  const url = new URL(prefix)
  url.pathname = `${url.pathname}${title.tmdbId}${type === 'tv' ? `/${safeSeason}/${safeEpisode}` : ''}`
  // Player tuning params (ignored by providers that do not support them):
  // hide the app promo badge and download button, match the site accent color.
  url.searchParams.set('disable_app_ad', 'true')
  url.searchParams.set('disable_dl_button', 'true')
  url.searchParams.set('color', '#d5f36a')
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
