# GlassFlix Cinema

A static movie and TV discovery catalog built with React, TypeScript, and Vite. Trending, popular, top-rated, and search results come from TMDB. There is no API-key popup for visitors. The TMDB credential is kept on a server-side proxy; it is never bundled into the Pages site.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Put your TMDB API Read Access Token in `.env.local` as `TMDB_ACCESS_TOKEN=...`.
3. Run:

```powershell
npm install
npm run dev
```

Vite serves the local `/api/tmdb` proxy and reads the token only on the server. `.env.local` is ignored by Git. Build and preview the static client with `npm run build` and `npm run preview`.

TMDB discovery requires an internet connection. The local catalog and saved watchlist are stored in the browser, but live search and updated feeds do not work offline.

## Secure TMDB proxy for GitHub Pages

GitHub Pages only hosts static files; it cannot keep a TMDB key secret. This repository includes a Cloudflare Worker that provides fixed search and home-feed endpoints and stores the TMDB key as a Worker secret.

1. Create a Cloudflare account and install Wrangler with `npm install --global wrangler`.
2. Create or sign in to your TMDB account, open [TMDB API settings](https://www.themoviedb.org/settings/api), request API access, and copy the **API Read Access Token**.
3. `cloudflare/wrangler.toml` is configured for the requested repository's Pages origin, `https://abdulmanan69.github.io`. For a different account, change `ALLOWED_ORIGINS` to that exact site origin (no repository path).
4. From the repository root, run `wrangler login`.
5. Set the token through Wrangler's secure prompt, never by putting it in a command or file:

```powershell
wrangler secret put TMDB_ACCESS_TOKEN --config cloudflare/wrangler.toml
```

6. Deploy the Worker:

```powershell
wrangler deploy --config cloudflare/wrangler.toml
```

7. In `abdulmanan69/ott`, add the Worker endpoint as the `VITE_TMDB_PROXY_URL` Actions variable. Its value is the deployed Worker origin plus `/tmdb`, for example `https://glassflix-cinema-tmdb.account.workers.dev/tmdb`.
8. GitHub Pages is configured to use **GitHub Actions** for `abdulmanan69/ott`. Push to `main` or manually run **Actions > Deploy GlassFlix Cinema to GitHub Pages**. The site URL is `https://abdulmanan69.github.io/ott/`.

The Pages workflow builds and deploys the static app. It never receives the TMDB token. Because the Worker is a public API endpoint, configure Cloudflare rate limiting for `/tmdb/*`; origin checks and response caching reduce accidental traffic but are not authentication. If `VITE_TMDB_PROXY_URL` is not set, the build still succeeds, but TMDB feeds display a setup message until the Worker is deployed and configured.

## Player URL prefixes

Optional GitHub Actions repository variables configure player URLs at build time:

- `VITE_TV_EMBED_URL`, e.g. `https://your-authorized-player.example/embed/tv/`
- `VITE_MOVIE_EMBED_URL`, e.g. `https://your-authorized-player.example/embed/movie/`

These are public URLs, not secrets. TMDB IDs are appended to the movie or TV prefix; TV playback uses season 1, episode 1. Visitors can also configure prefixes in Playback settings. Only use player URLs you are authorized to use and that permit embedding.

## TMDB attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
