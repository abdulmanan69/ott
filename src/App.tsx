import { useEffect, useState } from 'react'
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Info,
  Menu,
  Play,
  Search,
  Settings2,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { catalog, genres, type Title } from './catalog'
import { getAuthorizedEmbedPrefix, getAuthorizedPlaybackUrl, getTitleEmbedUrl } from './playback'
import { fetchTmdbHome, searchTmdb, type TmdbHomeCollections } from './tmdb'

type View = 'For you' | 'Films' | 'Series' | 'My list'

const DEFAULT_TV_EMBED_URL = import.meta.env.VITE_TV_EMBED_URL || ''
const DEFAULT_MOVIE_EMBED_URL = import.meta.env.VITE_MOVIE_EMBED_URL || ''

function readSavedTitles(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('morrow-watchlist') ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function readSavedTmdbTitles(): Title[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('morrow-saved-tmdb-titles') ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is Title => typeof item === 'object' && item !== null
      && typeof item.id === 'string'
      && typeof item.tmdbId === 'number'
      && typeof item.name === 'string'
      && (item.kind === 'Film' || item.kind === 'Series')
      && Array.isArray(item.genres))
  } catch {
    return []
  }
}

function readEmbedSetting(key: string, fallback: string, type: 'tv' | 'movie', legacyKey?: string): string {
  const saved = localStorage.getItem(key)
  if (saved !== null) return getAuthorizedEmbedPrefix(saved, type) ?? fallback

  const legacy = legacyKey ? localStorage.getItem(legacyKey) : null
  if (legacy !== null) return getAuthorizedEmbedPrefix(legacy, type) ?? fallback

  return fallback
}

function persistEmbedSetting(key: string, value: string, defaultValue: string) {
  if (value === defaultValue) localStorage.removeItem(key)
  else localStorage.setItem(key, value)
}

function App() {
  const [view, setView] = useState<View>('For you')
  const [genre, setGenre] = useState('All')
  const [query, setQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<Title[]>([])
  const [homeCollections, setHomeCollections] = useState<TmdbHomeCollections | null>(null)
  const [homeStatus, setHomeStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading')
  const [homeError, setHomeError] = useState('')
  const [heroIndex, setHeroIndex] = useState(0)
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [searchError, setSearchError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tvEmbedUrl, setTvEmbedUrl] = useState(() => readEmbedSetting('morrow-tv-embed-url', DEFAULT_TV_EMBED_URL, 'tv', 'morrow-embed-url'))
  const [movieEmbedUrl, setMovieEmbedUrl] = useState(() => readEmbedSetting('morrow-movie-embed-url', DEFAULT_MOVIE_EMBED_URL, 'movie'))
  const [embedDrafts, setEmbedDrafts] = useState({ tv: '', movie: '' })
  const [watchlist, setWatchlist] = useState<string[]>(readSavedTitles)
  const [savedTmdbTitles, setSavedTmdbTitles] = useState<Title[]>(readSavedTmdbTitles)
  const [selected, setSelected] = useState<Title | null>(null)
  const [player, setPlayer] = useState<Title | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notice, setNotice] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  useEffect(() => {
    localStorage.setItem('morrow-watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    localStorage.setItem('morrow-saved-tmdb-titles', JSON.stringify(savedTmdbTitles))
  }, [savedTmdbTitles])

  useEffect(() => {
    persistEmbedSetting('morrow-tv-embed-url', tvEmbedUrl, DEFAULT_TV_EMBED_URL)
    persistEmbedSetting('morrow-movie-embed-url', movieEmbedUrl, DEFAULT_MOVIE_EMBED_URL)
    localStorage.removeItem('morrow-embed-url')
  }, [tvEmbedUrl, movieEmbedUrl])

  useEffect(() => {
    if (!selected && !player && !settingsOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null)
        setPlayer(null)
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, player, settingsOpen])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const controller = new AbortController()
    setHomeStatus('loading')
    fetchTmdbHome(controller.signal).then((collections) => {
      setHomeCollections(collections)
      setHomeError('')
      setHomeStatus('ready')
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setHomeError(error instanceof Error ? error.message : 'TMDB home feed is unavailable.')
        setHomeStatus('error')
      }
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const slideCount = homeCollections?.trending.length ?? 0
    if (view !== 'For you' || normalizedQuery || slideCount < 2 || selected || player || settingsOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % slideCount)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [homeCollections?.trending.length, normalizedQuery, player, selected, settingsOpen, view])

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setTmdbResults([])
      setSearchStatus('idle')
      return
    }

    const controller = new AbortController()
    setTmdbResults([])
    setSearchStatus('loading')
    const timer = window.setTimeout(() => {
      searchTmdb(normalizedQuery, controller.signal).then((results) => {
        setTmdbResults(results)
        setSearchError('')
        setSearchStatus('idle')
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSearchError(error instanceof Error ? error.message : 'TMDB search is unavailable.')
          setSearchStatus('error')
        }
      })
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [normalizedQuery])

  const isRemoteSearch = normalizedQuery.length >= 2 && view !== 'My list'
  const isHomeFeed = view === 'For you' && !normalizedQuery
  const titlesForView = view === 'My list' ? [...catalog, ...savedTmdbTitles] : catalog
  const localFiltered = titlesForView.filter((title) => {
    const matchesView = view === 'For you'
      || (view === 'Films' && title.kind === 'Film')
      || (view === 'Series' && title.kind === 'Series')
      || (view === 'My list' && watchlist.includes(title.id))
    const matchesGenre = genre === 'All' || title.genres.includes(genre)
    const matchesQuery = !normalizedQuery || `${title.name} ${title.genres.join(' ')} ${title.description}`.toLowerCase().includes(normalizedQuery)
    return matchesView && matchesGenre && matchesQuery
  })
  const filtered = isHomeFeed
    ? (homeCollections?.popular ?? []).filter((title) => genre === 'All' || title.genres.includes(genre))
    : isRemoteSearch
    ? tmdbResults.filter((title) => {
      const matchesView = view === 'For you'
        || (view === 'Films' && title.kind === 'Film')
        || (view === 'Series' && title.kind === 'Series')
      return matchesView && (genre === 'All' || title.genres.includes(genre))
    })
    : view === 'Films'
    ? (homeCollections?.popularMovies ?? []).filter((title) => genre === 'All' || title.genres.includes(genre))
    : view === 'Series'
    ? (homeCollections?.popularTv ?? []).filter((title) => genre === 'All' || title.genres.includes(genre))
    : localFiltered

  const toggleSaved = (title: Title) => {
    const saved = watchlist.includes(title.id)
    setWatchlist((current) => saved ? current.filter((id) => id !== title.id) : [...current, title.id])
    if (title.tmdbId) {
      setSavedTmdbTitles((current) => saved
        ? current.filter((savedTitle) => savedTitle.id !== title.id)
        : [...current.filter((savedTitle) => savedTitle.id !== title.id), title])
    }
    setNotice(saved ? 'Removed from My list' : 'Added to My list')
  }

  const startPlayback = (title: Title) => {
    const embedUrl = getTitleEmbedUrl(title, tvEmbedUrl, movieEmbedUrl)
    if (!embedUrl && !getAuthorizedPlaybackUrl(title)) {
      setSelected(title)
      setNotice('No matching authorized embed URL is configured for this title.')
      return
    }
    setSelected(null)
    setPlayer(title)
  }

  const trending = homeCollections?.trending ?? []
  const activeHeroIndex = trending.length ? heroIndex % trending.length : 0
  const hero = trending[activeHeroIndex]
  const moveHero = (direction: -1 | 1) => {
    setHeroIndex((current) => (current + direction + trending.length) % trending.length)
  }
  const playerEmbedUrl = player ? getTitleEmbedUrl(player, tvEmbedUrl, movieEmbedUrl) : null

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#home" aria-label="GlassFlix Cinema home" onClick={() => { setView('For you'); setGenre('All') }}>
          <span className="brand-mark"><span /></span>
          <span>GLASSFLIX CINEMA</span>
        </a>
        <button className="mobile-menu icon-button" title="Open navigation" aria-label="Open navigation" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={mobileMenu ? 'main-nav nav-open' : 'main-nav'} aria-label="Main navigation">
          {(['For you', 'Films', 'Series', 'My list'] as View[]).map((item) => (
            <button key={item} aria-label={item} className={`nav-link ${view === item ? 'active' : ''}`} onClick={() => { setView(item); setGenre('All'); setMobileMenu(false) }}>
              {item}{item === 'My list' && watchlist.length > 0 && <span className="nav-count" aria-hidden="true">{watchlist.length}</span>}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <form className={searchOpen ? 'search-box search-expanded' : 'search-box'} onSubmit={(event) => { event.preventDefault(); setSearchOpen(true) }}>
            <Search size={18} aria-hidden="true" />
            <input aria-label="Search titles" placeholder="Search stories" value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} />
            {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}
          </form>
          <button className="icon-button settings-trigger" title="Playback settings" aria-label="Playback settings" onClick={() => { setEmbedDrafts({ tv: tvEmbedUrl, movie: movieEmbedUrl }); setSettingsOpen(true) }}><Settings2 size={17} /></button>
          <button className="profile-button" title="Your profile" aria-label="Your profile">M</button>
        </div>
      </header>

      {settingsOpen && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <button className="modal-close icon-button" aria-label="Close playback settings" onClick={() => setSettingsOpen(false)}><X size={20} /></button>
            <p className="section-kicker">OPERATOR CONFIGURATION</p>
            <h2 id="settings-title">Playback sources</h2>
            <p className="settings-description">Edit `.env.local` for URL prefixes. TMDB IDs are appended automatically; TV results use season 1, episode 1.</p>
            <label className="embed-label" htmlFor="tv-embed-url">TV URL prefix</label>
            <textarea id="tv-embed-url" value={embedDrafts.tv} onChange={(event) => setEmbedDrafts((current) => ({ ...current, tv: event.target.value }))} placeholder="https://example.space/embed/tv/" autoFocus />
            <label className="embed-label movie-embed-label" htmlFor="movie-embed-url">Movie URL prefix</label>
            <textarea id="movie-embed-url" value={embedDrafts.movie} onChange={(event) => setEmbedDrafts((current) => ({ ...current, movie: event.target.value }))} placeholder="https://example.space/embed/movie/" />
            <div className="settings-actions">
              <button className="button button-primary" onClick={() => {
                const normalizedTvUrl = getAuthorizedEmbedPrefix(embedDrafts.tv, 'tv')
                const normalizedMovieUrl = getAuthorizedEmbedPrefix(embedDrafts.movie, 'movie')
                if (!normalizedTvUrl || !normalizedMovieUrl) {
                  setNotice('Use HTTP(S) URL prefixes ending in /tv/ and /movie/.')
                  return
                }
                setTvEmbedUrl(normalizedTvUrl ?? '')
                setMovieEmbedUrl(normalizedMovieUrl ?? '')
                setSettingsOpen(false)
                setNotice('Playback sources saved')
              }}>Save sources</button>
              <button className="button button-outline" onClick={() => {
                localStorage.removeItem('morrow-tv-embed-url')
                localStorage.removeItem('morrow-movie-embed-url')
                localStorage.removeItem('morrow-embed-url')
                setTvEmbedUrl(DEFAULT_TV_EMBED_URL)
                setMovieEmbedUrl(DEFAULT_MOVIE_EMBED_URL)
                setSettingsOpen(false)
                setNotice('Using environment playback URLs')
              }}>Use environment defaults</button>
              <button className="button button-outline" onClick={() => setSettingsOpen(false)}>Cancel</button>
            </div>
          </section>
        </div>
      )}

      {isHomeFeed && (hero ? (
        <section className="hero" aria-label="Trending titles carousel" aria-roledescription="carousel">
          <div key={hero.id} className="hero-backdrop" aria-hidden="true" style={{ backgroundImage: `linear-gradient(90deg, rgba(13,19,16,.97) 0%, rgba(13,19,16,.78) 31%, rgba(13,19,16,.12) 72%), linear-gradient(0deg, #111713 0%, transparent 48%), url("${hero.backdropImage || hero.image}")` }} />
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={13} /> TMDB TRENDING <span className="eyebrow-dot" /> {hero.kind === 'Film' ? 'MOVIE' : 'SERIES'}</div>
            <h1>{hero.name}</h1>
            <p className="hero-description">{hero.description}</p>
            <div className="hero-meta"><span>{hero.year || 'New'}</span><span className="meta-separator" /><span>{hero.kind}</span><span className="rating"><Star size={13} fill="currentColor" /> {hero.rating}</span></div>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => startPlayback(hero)}><Play size={17} fill="currentColor" /> Play {hero.kind.toLowerCase()}</button>
              <button className="button button-quiet" onClick={() => setSelected(hero)}><Info size={17} /> More details</button>
            </div>
          </div>
          <div className="hero-index" aria-label={`Slide ${activeHeroIndex + 1} of ${trending.length}`}>
            <button className="icon-button hero-slide-control" aria-label="Previous trending title" onClick={() => moveHero(-1)}><ChevronLeft size={17} /></button>
            <span className="hero-current">{(activeHeroIndex + 1).toString().padStart(2, '0')}</span>
            <span className="index-line" />
            <span>{trending.length.toString().padStart(2, '0')}</span>
            <button className="icon-button hero-slide-control" aria-label="Next trending title" onClick={() => moveHero(1)}><ChevronRight size={17} /></button>
          </div>
          <div className="hero-caption"><span className="caption-line" /> TRENDING THIS WEEK</div>
        </section>
      ) : (
        <section className="hero hero-status"><p>{homeStatus === 'error' ? homeError : 'Loading trending on TMDB...'}</p></section>
      ))}

      <section className="browse-section" id="home">
        <div className="section-head">
          <div>
            <p className="section-kicker">{isHomeFeed ? 'TMDB · POPULAR' : 'A little something for tonight'}</p>
            <h2>{isHomeFeed ? 'Popular movies and series' : view === 'My list' ? 'Your saved stories' : view === 'Films' ? 'Popular movies' : view === 'Series' ? 'Popular TV series' : 'Stories worth staying in for'}</h2>
          </div>
          <button className="text-button" onClick={() => { setView('For you'); setGenre('All'); setQuery('') }}>Browse all <ChevronRight size={17} /></button>
        </div>

        <div className="genre-row" aria-label="Filter by genre">
          {genres.map((item) => <button key={item} className={`genre-chip ${genre === item ? 'selected' : ''}`} onClick={() => setGenre(item)}>{item}</button>)}
        </div>

        {isRemoteSearch && searchStatus === 'loading' && <p className="search-feedback" role="status">Searching movies and series...</p>}
        {isRemoteSearch && searchStatus === 'error' && <p className="search-feedback search-error" role="status">{searchError}</p>}
        {normalizedQuery.length === 1 && view !== 'My list' && <p className="search-feedback">Enter one more character to search TMDB.</p>}

        {isHomeFeed && homeStatus === 'loading' && <p className="search-feedback" role="status">Loading popular and top-rated titles from TMDB...</p>}
        {isHomeFeed && homeStatus === 'error' && <p className="search-feedback search-error" role="status">{homeError}</p>}
        {(view === 'Films' || view === 'Series') && !normalizedQuery && homeStatus === 'loading' && <p className="search-feedback" role="status">Loading TMDB titles...</p>}
        {(view === 'Films' || view === 'Series') && !normalizedQuery && homeStatus === 'error' && <p className="search-feedback search-error" role="status">TMDB titles are unavailable. Check the server configuration and try again.</p>}

        {filtered.length > 0 ? (
          <div className="title-grid">
            {filtered.map((title, index) => (
              <article key={title.id} className="title-card" style={{ animationDelay: `${index * 55}ms` }}>
                <button className="poster-button" onClick={() => setSelected(title)} aria-label={`Details for ${title.name}`}>
                  {title.image && <img className="poster" src={title.image} alt="" loading="lazy" />}
                  <span className="poster-shade" />
                  <span className="poster-topline"><span>{title.kind === 'Film' ? 'FILM' : 'SERIES'}{title.tmdbId && <span className="tmdb-id">TMDB {title.tmdbId}</span>}</span><span className="card-rating"><Star size={12} fill="currentColor" /> {title.rating}</span></span>
                  <span className="poster-bottom"><span>{title.name}</span><span>{title.year} <i /> {title.duration}</span></span>
                  <span className="poster-play"><Play size={17} fill="currentColor" /></span>
                </button>
                <div className="card-foot"><span>{title.genres.slice(0, 2).join(' · ')}</span><button className={`save-button ${watchlist.includes(title.id) ? 'saved' : ''}`} onClick={() => toggleSaved(title)} aria-label={`${watchlist.includes(title.id) ? 'Remove' : 'Add'} ${title.name} ${watchlist.includes(title.id) ? 'from' : 'to'} My list`} title={watchlist.includes(title.id) ? 'Remove from My list' : 'Add to My list'}>{watchlist.includes(title.id) ? <Check size={16} /> : <Bookmark size={16} />}</button></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Clapperboard size={30} /><h3>{view === 'My list' ? 'Nothing saved just yet' : (isRemoteSearch && searchStatus === 'loading') || (isHomeFeed && homeStatus === 'loading') ? 'Loading titles' : 'No stories found'}</h3><p>{view === 'My list' ? 'Save something that catches your eye and it will be waiting here.' : isRemoteSearch ? 'Try another title or adjust the genre filter.' : isHomeFeed && homeStatus === 'error' ? homeError : 'Try another title or genre.'}</p>{view === 'My list' && <button className="text-button" onClick={() => setView('For you')}>Find a story <ChevronRight size={16} /></button>}</div>
        )}
      </section>

      {isHomeFeed && homeStatus === 'ready' && homeCollections && (
        <section className="browse-section home-collection">
          <div className="section-head"><div><p className="section-kicker">TMDB · TOP RATED</p><h2>Highest rated movies and series</h2></div></div>
          {homeCollections.topRated.length > 0 ? <div className="title-grid">{homeCollections.topRated.map((title, index) => (
            <article key={title.id} className="title-card" style={{ animationDelay: `${index * 55}ms` }}>
              <button className="poster-button" onClick={() => setSelected(title)} aria-label={`Details for ${title.name}`}>
                {title.image && <img className="poster" src={title.image} alt="" loading="lazy" />}
                <span className="poster-shade" />
                <span className="poster-topline"><span>{title.kind === 'Film' ? 'FILM' : 'SERIES'}<span className="tmdb-id">TMDB {title.tmdbId}</span></span><span className="card-rating"><Star size={12} fill="currentColor" /> {title.rating}</span></span>
                <span className="poster-bottom"><span>{title.name}</span><span>{title.year || '—'} <i /> {title.duration}</span></span>
                <span className="poster-play"><Play size={17} fill="currentColor" /></span>
              </button>
              <div className="card-foot"><span>{title.genres.slice(0, 2).join(' · ')}</span><button className={`save-button ${watchlist.includes(title.id) ? 'saved' : ''}`} onClick={() => toggleSaved(title)} aria-label={`${watchlist.includes(title.id) ? 'Remove' : 'Add'} ${title.name} ${watchlist.includes(title.id) ? 'from' : 'to'} My list`} title={watchlist.includes(title.id) ? 'Remove from My list' : 'Add to My list'}>{watchlist.includes(title.id) ? <Check size={16} /> : <Bookmark size={16} />}</button></div>
            </article>
          ))}</div> : <p className="search-feedback">No top-rated titles are available right now.</p>}
        </section>
      )}

      <footer className="site-footer"><a className="wordmark footer-mark" href="#home"><span className="brand-mark"><span /></span><span>GLASSFLIX CINEMA</span></a><span>Stories in their own orbit.</span><span className="footer-tmdb">This product uses the TMDB API but is not endorsed or certified by TMDB.</span><span className="footer-right">A PERSONAL CATALOG <span className="eyebrow-dot" /> 2026</span></footer>

      {selected && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="detail-art" style={{ backgroundImage: `linear-gradient(0deg, #171e19 0%, rgba(23,30,25,.04) 72%), url("${selected.image}")` }} />
            <button className="modal-close icon-button" aria-label="Close details" onClick={() => setSelected(null)}><X size={20} /></button>
            <div className="detail-content"><div className="eyebrow"><Sparkles size={13} /> GLASSFLIX PICKS</div><h2 id="detail-title">{selected.name}</h2><div className="detail-meta"><span className="rating"><Star size={13} fill="currentColor" /> {selected.rating}</span><span>{selected.year}</span><span>{selected.duration}</span>{!selected.tmdbId && <span className="quality">4K</span>}</div><p>{selected.description}</p><div className="detail-genres">{selected.genres.map((item) => <span key={item}>{item}</span>)}</div><div className="detail-actions"><button className="button button-primary" onClick={() => startPlayback(selected)}><Play size={16} fill="currentColor" /> Play {selected.kind.toLowerCase()}</button><button className={`button button-outline ${watchlist.includes(selected.id) ? 'saved' : ''}`} onClick={() => toggleSaved(selected)}>{watchlist.includes(selected.id) ? <Check size={17} /> : <Bookmark size={17} />} {watchlist.includes(selected.id) ? 'In My list' : 'Add to My list'}</button></div></div>
          </section>
        </div>
      )}

      {player && (
        <div className="overlay player-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlayer(null) }}>
          <section className="player-modal" role="dialog" aria-modal="true" aria-label={`${player.name} player`}>
            <button className="modal-close icon-button" aria-label="Close player" onClick={() => setPlayer(null)}><X size={20} /></button>
            {playerEmbedUrl
              ? <iframe src={playerEmbedUrl} title={`${player.name} player`} allow="autoplay; picture-in-picture; encrypted-media; clipboard-write" allowFullScreen />
              : <video controls autoPlay playsInline src={getAuthorizedPlaybackUrl(player) ?? undefined} />}
            <div className="player-title"><span>{player.name}</span><span>{player.year} · {player.duration}</span></div>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><Info size={15} /> {notice}</div>}
    </main>
  )
}

export default App
