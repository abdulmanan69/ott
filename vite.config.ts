import { defineConfig } from 'vite'
import type { PreviewServer, Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

async function fetchTmdb(path: string, accessToken: string) {
  return fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  })
}

function registerTmdbProxy(server: ViteDevServer | PreviewServer, accessToken: string) {
  server.middlewares.use(async (request, response, next) => {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost')
    if (!requestUrl.pathname.startsWith('/api/tmdb/')) {
      next()
      return
    }

    response.setHeader('Content-Type', 'application/json')
    if (request.method !== 'GET') {
      response.statusCode = 405
      response.end(JSON.stringify({ error: 'Method not allowed.' }))
      return
    }
    if (!accessToken) {
      response.statusCode = 503
      response.end(JSON.stringify({ error: 'Set TMDB_ACCESS_TOKEN in .env.local for local development.' }))
      return
    }

    try {
      if (requestUrl.pathname === '/api/tmdb/home') {
        const endpoints = {
          trending: '/trending/all/week?language=en-US',
          popularMovies: '/movie/popular?language=en-US',
          popularTv: '/tv/popular?language=en-US',
          topRatedMovies: '/movie/top_rated?language=en-US',
          topRatedTv: '/tv/top_rated?language=en-US',
        }
        const entries = await Promise.all(Object.entries(endpoints).map(async ([key, path]) => {
          const upstream = await fetchTmdb(path, accessToken)
          if (!upstream.ok) throw new Error('TMDB home feed request failed.')
          return [key, await upstream.json()]
        }))
        response.statusCode = 200
        response.end(JSON.stringify(Object.fromEntries(entries)))
        return
      }

      if (requestUrl.pathname === '/api/tmdb/search') {
        const query = requestUrl.searchParams.get('query')?.trim() ?? ''
        if (query.length < 2 || query.length > 100) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: 'Search query must be between 2 and 100 characters.' }))
          return
        }
        const upstreamUrl = new URL('https://api.themoviedb.org/3/search/multi')
        upstreamUrl.searchParams.set('query', query)
        upstreamUrl.searchParams.set('include_adult', 'false')
        upstreamUrl.searchParams.set('language', 'en-US')
        const upstream = await fetchTmdb(`${upstreamUrl.pathname.replace('/3', '')}${upstreamUrl.search}`, accessToken)
        response.statusCode = upstream.status
        response.end(await upstream.text())
        return
      }

      response.statusCode = 404
      response.end(JSON.stringify({ error: 'Unknown TMDB endpoint.' }))
    } catch {
      response.statusCode = 502
      response.end(JSON.stringify({ error: 'TMDB service is temporarily unavailable.' }))
    }
  })
}

export default defineConfig(({ mode }) => {
  const { TMDB_ACCESS_TOKEN: accessToken = '' } = loadEnv(mode, process.cwd(), '')
  const localTmdbProxy: Plugin = {
    name: 'glassflix-local-tmdb-proxy',
    configureServer(server) {
      registerTmdbProxy(server, accessToken)
    },
    configurePreviewServer(server) {
      registerTmdbProxy(server, accessToken)
    },
  }

  return {
    base: './',
    plugins: [react(), localTmdbProxy],
  }
})
