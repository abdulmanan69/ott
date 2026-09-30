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

export type PlaybackServer = 'nxsha' | 'rive' | 'rive-agg' | 'rive-torrent'

export const PLAYBACK_SERVERS: { id: PlaybackServer, label: string }[] = [
  { id: 'nxsha', label: 'Nxsha' },
  { id: 'rive', label: 'Rive' },
  { id: 'rive-agg', label: 'Rive Multi' },
  { id: 'rive-torrent', label: 'Rive Torrent' },
]

export function isPlaybackServer(value: unknown): value is PlaybackServer {
  return PLAYBACK_SERVERS.some((server) => server.id === value)
}

const RIVESTREAM_PATHS = {
  rive: 'embed',
  'rive-agg': 'embed/agg',
  'rive-torrent': 'embed/torrent',
  download: 'download',
} as const

export function getRivestreamUrl(title: Title, mode: keyof typeof RIVESTREAM_PATHS): string | null {
  if (!title.tmdbId) return null

  const type = title.kind === 'Series' ? 'tv' : 'movie'
  const url = new URL(`https://watch.rivestream.app/${RIVESTREAM_PATHS[mode]}`)
  url.searchParams.set('type', type)
  url.searchParams.set('id', String(title.tmdbId))
  if (type === 'tv') {
    url.searchParams.set('season', '1')
    url.searchParams.set('episode', '1')
  }
  return url.toString()
}

export function getServerEmbedUrl(title: Title, server: PlaybackServer, tvTemplate: string, movieTemplate: string): string | null {
  return server === 'nxsha' ? getTitleEmbedUrl(title, tvTemplate, movieTemplate) : getRivestreamUrl(title, server)
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
