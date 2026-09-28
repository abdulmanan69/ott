/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TV_EMBED_URL: string
  readonly VITE_MOVIE_EMBED_URL: string
  readonly VITE_TMDB_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}