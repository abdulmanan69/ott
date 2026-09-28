# GlassFlix Cinema

A static movie and TV discovery catalog built with React, TypeScript, and Vite. The visitor does not get an API-key popup. Search and discovery call TMDB directly with the configured v3 API key.

## TMDB key visibility

A key included in a static GitHub Pages app is public: anyone can inspect the browser bundle and reuse the key against TMDB. This setup uses the TMDB **v3 API key** you chose, not the more sensitive Read Access Token. Monitor your TMDB usage and rotate the key if it is abused. Do not use this public-key configuration for credentials that must remain secret.

## GitHub Pages

The site is published at [https://abdulmanan69.github.io/ott/](https://abdulmanan69.github.io/ott/). The repository's GitHub Actions Pages deployment uses these Actions repository variables:

- `VITE_TMDB_API_KEY`: your TMDB v3 API key
- `VITE_TV_EMBED_URL`: authorized TV embed URL prefix
- `VITE_MOVIE_EMBED_URL`: authorized movie embed URL prefix

Edit them under **Settings > Secrets and variables > Actions > Variables**. After changing a variable, rerun **Actions > Deploy GlassFlix Cinema to GitHub Pages** or push a new commit. The TMDB key is public in the built site; URL prefixes are also public.

## Local development

Put `VITE_TMDB_API_KEY` in `.env.local`, then run:

```powershell
npm install
npm run dev
```

`.env.local` is ignored by Git. The old `TMDB_ACCESS_TOKEN` server-side local proxy remains available if no v3 key is configured. Live TMDB data requires an internet connection.

## Playback

TMDB IDs are appended to the configured player prefixes. TV titles use season 1, episode 1. Playback sources must be authorized and allow embedding.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
