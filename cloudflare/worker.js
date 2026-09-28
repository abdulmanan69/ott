const HOME_ENDPOINTS = {
  trending: '/trending/all/week',
  popularMovies: '/movie/popular',
  popularTv: '/tv/popular',
  topRatedMovies: '/movie/top_rated',
  topRatedTv: '/tv/top_rated',
}

function corsHeaders(origin, allowedOrigins) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  })
  if (origin && allowedOrigins.includes(origin)) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

function jsonResponse(payload, status, headers) {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders })
}

async function fetchTmdb(path, token) {
  const upstream = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!upstream.ok) throw new Error('TMDB request failed.')
  return upstream.json()
}

async function getPayload(path, token) {
  if (path === '/home') {
    const entries = await Promise.all(Object.entries(HOME_ENDPOINTS).map(async ([key, endpoint]) => [
      key,
      await fetchTmdb(`${endpoint}?language=en-US`, token),
    ]))
    return Object.fromEntries(entries)
  }

  if (path === '/search') {
    throw new Error('Search query is required.')
  }

  throw new Error('Unknown endpoint.')
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
    const headers = corsHeaders(origin, allowedOrigins)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed.' }, 405, headers)
    if (origin && !allowedOrigins.includes(origin)) return jsonResponse({ error: 'Origin not allowed.' }, 403, headers)
    if (!env.TMDB_ACCESS_TOKEN) return jsonResponse({ error: 'TMDB is not configured on the server.' }, 503, headers)

    let path
    let query = ''
    if (url.pathname === '/tmdb/home') {
      path = '/home'
    } else if (url.pathname === '/tmdb/search') {
      path = '/search'
      query = url.searchParams.get('query')?.trim() ?? ''
      if (query.length < 2 || query.length > 100) {
        return jsonResponse({ error: 'Search query must be between 2 and 100 characters.' }, 400, headers)
      }
    } else {
      return jsonResponse({ error: 'Unknown endpoint.' }, 404, headers)
    }

    const cacheUrl = new URL(url)
    cacheUrl.searchParams.sort()
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' })
    const cached = await caches.default.match(cacheKey)
    if (cached) return new Response(cached.body, { status: cached.status, headers: new Headers([...cached.headers, ...headers]) })

    try {
      const payload = path === '/home'
        ? await getPayload(path, env.TMDB_ACCESS_TOKEN)
        : await fetchTmdb(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US`, env.TMDB_ACCESS_TOKEN)
      const cacheHeaders = new Headers(headers)
      cacheHeaders.set('Cache-Control', path === '/home' ? 'public, max-age=1800' : 'public, max-age=300')
      const response = jsonResponse(payload, 200, cacheHeaders)
      context.waitUntil(caches.default.put(cacheKey, response.clone()))
      return response
    } catch {
      return jsonResponse({ error: 'TMDB service is temporarily unavailable.' }, 502, headers)
    }
  },
}
