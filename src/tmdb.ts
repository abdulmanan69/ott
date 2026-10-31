import type { Title } from './catalog'

type TmdbSearchItem = {
  id: number
  media_type: 'movie' | 'tv' | 'person'
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  genre_ids?: number[]
}

type TmdbSearchResponse = {
  results?: TmdbSearchItem[]
  error?: string
}

const genreNames: Record<number, string> = {
  12: 'Adventure',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  99: 'Documentary',
  878: 'Science fiction',
  9648: 'Mystery',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10759: 'Action & Adventure',
  10765: 'Science fiction',
}

const publicApiKey = import.meta.env.VITE_TMDB_API_KEY || ''
const configuredProxyBase = import.meta.env.VITE_TMDB_PROXY_URL?.replace(/\/$/, '')
const proxyBase = configuredProxyBase || (import.meta.env.DEV && !publicApiKey ? '/api/tmdb' : '')

async function requestTmdb<T>(path: string, signal: AbortSignal): Promise<T> {
  if (publicApiKey) {
    const [pathname, search = ''] = path.split('?')
    const upstreamPath = pathname === '/search' ? '/search/multi' : pathname
    const url = new URL(`https://api.themoviedb.org/3${upstreamPath}`)
    new URLSearchParams(search).forEach((value, key) => url.searchParams.set(key, value))
    url.searchParams.set('api_key', publicApiKey)
    const response = await fetch(url, { signal })
    const payload = await response.json() as T & { status_message?: string }
    if (!response.ok) throw new Error(payload.status_message || 'TMDB request failed. Check the configured API key.')
    return payload
  }

  if (!proxyBase) throw new Error('TMDB is not configured. Set VITE_TMDB_API_KEY in the GitHub Actions repository variables.')
  const response = await fetch(`${proxyBase}${path}`, { signal })
  const payload = await response.json() as T & { status_message?: string }
  if (!response.ok) throw new Error(payload.status_message || 'TMDB request failed. Check the key and try again.')
  return payload
}

export async function searchTmdb(query: string, signal: AbortSignal): Promise<Title[]> {
  const path = `/search?query=${encodeURIComponent(query)}`
  const payload = await requestTmdb<TmdbSearchResponse>(path, signal)

  return (payload.results ?? [])
    .filter((item) => (item.media_type === 'movie' || item.media_type === 'tv') && (item.title || item.name))
    .map((item) => {
      const kind = item.media_type === 'movie' ? 'Film' : 'Series'
      const date = item.release_date || item.first_air_date || ''
      const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : ''
      return {
        id: `tmdb-${item.media_type}-${item.id}`,
        tmdbId: item.id,
        name: item.title || item.name || 'Untitled',
        kind,
        year: Number(date.slice(0, 4)) || 0,
        rating: Number.isFinite(item.vote_average) ? (item.vote_average ?? 0).toFixed(1) : '—',
        duration: kind === 'Film' ? 'Feature film' : 'TV series',
        genres: (item.genre_ids ?? []).map((genreId) => genreNames[genreId]).filter((name): name is string => Boolean(name)),
        description: item.overview || 'No overview is available.',
        image: poster,
      }
    })
}

type TmdbDiscoverItem = {
  id: number
  media_type?: 'movie' | 'tv'
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  genre_ids?: number[]
}

type TmdbDiscoverList = { results?: TmdbDiscoverItem[] }

type TmdbHomeResponse = {
  trending?: TmdbDiscoverList
  popularMovies?: TmdbDiscoverList
  popularTv?: TmdbDiscoverList
  topRatedMovies?: TmdbDiscoverList
  topRatedTv?: TmdbDiscoverList
  error?: string
}

export type TmdbHomeCollections = {
  trending: Title[]
  popular: Title[]
  popularMovies: Title[]
  popularTv: Title[]
  topRated: Title[]
}

function normalizeDiscoverItems(items: TmdbDiscoverItem[], fallbackType?: 'movie' | 'tv'): Title[] {
  return items.flatMap((item) => {
    const mediaType = item.media_type ?? fallbackType
    if (!mediaType || !(item.title || item.name)) return []

    const kind = mediaType === 'movie' ? 'Film' : 'Series'
    const date = item.release_date || item.first_air_date || ''
    return [{
      id: `tmdb-${mediaType}-${item.id}`,
      tmdbId: item.id,
      name: item.title || item.name || 'Untitled',
      kind,
      year: Number(date.slice(0, 4)) || 0,
      rating: Number.isFinite(item.vote_average) ? (item.vote_average ?? 0).toFixed(1) : '—',
      duration: kind === 'Film' ? 'Feature film' : 'TV series',
      genres: (item.genre_ids ?? []).map((genreId) => genreNames[genreId]).filter((name): name is string => Boolean(name)),
      description: item.overview || 'No overview is available.',
      image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdropImage: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
    }]
  })
}

type TmdbSeasonItem = { season_number?: number; episode_count?: number }
type TmdbTvDetails = { seasons?: TmdbSeasonItem[] }

export type SeasonInfo = { season: number; episodes: number }

export async function fetchTvSeasons(tmdbId: number, signal: AbortSignal): Promise<SeasonInfo[]> {
  const payload = publicApiKey
    ? await requestTmdb<TmdbTvDetails>(`/tv/${tmdbId}?language=en-US`, signal)
    : await requestTmdb<TmdbTvDetails>(`/tv?id=${tmdbId}`, signal)
  return (payload.seasons ?? [])
    .filter((item) => (item.season_number ?? 0) > 0 && (item.episode_count ?? 0) > 0)
    .map((item) => ({ season: item.season_number as number, episodes: item.episode_count as number }))
}

type TmdbVideo = { key?: string; site?: string; type?: string; official?: boolean }

export async function fetchTmdbTrailer(title: Title, signal: AbortSignal): Promise<string | null> {
  if (!title.tmdbId) return null
  const type = title.kind === 'Film' ? 'movie' : 'tv'
  const payload = publicApiKey
    ? await requestTmdb<{ results?: TmdbVideo[] }>(`/${type}/${title.tmdbId}/videos?language=en-US`, signal)
    : await requestTmdb<{ results?: TmdbVideo[] }>(`/videos?type=${type}&id=${title.tmdbId}`, signal)
  const videos = (payload.results ?? []).filter((video) => video.site === 'YouTube' && video.key)
  const pick = videos.find((video) => video.type === 'Trailer' && video.official)
    ?? videos.find((video) => video.type === 'Trailer')
    ?? videos.find((video) => video.type === 'Teaser')
  return pick?.key ?? null
}

export async function fetchTmdbRecommendations(title: Title, signal: AbortSignal): Promise<Title[]> {
  if (!title.tmdbId) return []
  const type = title.kind === 'Film' ? 'movie' : 'tv'
  const payload = publicApiKey
    ? await requestTmdb<TmdbDiscoverList>(`/${type}/${title.tmdbId}/recommendations?language=en-US`, signal)
    : await requestTmdb<TmdbDiscoverList>(`/recommendations?type=${type}&id=${title.tmdbId}`, signal)
  return normalizeDiscoverItems(payload.results ?? [], type).filter((item) => item.image).slice(0, 10)
}

export async function fetchTmdbHome(signal: AbortSignal): Promise<TmdbHomeCollections> {
  let payload: TmdbHomeResponse
  if (publicApiKey) {
    const endpoints = {
      trending: '/trending/all/week?language=en-US',
      popularMovies: '/movie/popular?language=en-US',
      popularTv: '/tv/popular?language=en-US',
      topRatedMovies: '/movie/top_rated?language=en-US',
      topRatedTv: '/tv/top_rated?language=en-US',
    }
    const entries = await Promise.all(Object.entries(endpoints).map(async ([key, path]) => [
      key,
      await requestTmdb<TmdbDiscoverList>(path, signal),
    ] as const))
    payload = Object.fromEntries(entries) as TmdbHomeResponse
  } else {
    payload = await requestTmdb<TmdbHomeResponse>('/home', signal)
  }

  const combine = (movies?: TmdbDiscoverList, tv?: TmdbDiscoverList) => [
    ...normalizeDiscoverItems(movies?.results ?? [], 'movie'),
    ...normalizeDiscoverItems(tv?.results ?? [], 'tv'),
  ]

  const popularMovies = normalizeDiscoverItems(payload.popularMovies?.results ?? [], 'movie')
  const popularTv = normalizeDiscoverItems(payload.popularTv?.results ?? [], 'tv')

  return {
    trending: normalizeDiscoverItems(payload.trending?.results ?? []),
    popular: [...popularMovies, ...popularTv],
    popularMovies,
    popularTv,
    topRated: combine(payload.topRatedMovies, payload.topRatedTv),
  }
}