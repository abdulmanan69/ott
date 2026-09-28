export type Title = {
  id: string
  name: string
  kind: 'Film' | 'Series'
  year: number
  rating: string
  duration: string
  genres: string[]
  description: string
  image: string
  backdropImage?: string
  playbackUrl?: string
  tmdbId?: number
}

const photo = (id: string, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

export const catalog: Title[] = [
  {
    id: 'blue-hour',
    name: 'The Blue Hour',
    kind: 'Film',
    year: 2026,
    rating: '8.7',
    duration: '1h 52m',
    genres: ['Drama', 'Mystery'],
    description: 'On the last night before the lights go out, a night-shift radio host begins receiving calls from a town that does not exist on any map.',
    image: photo('photo-1470252649378-9c29740c9fa8', 1800),
  },
  {
    id: 'wild-water',
    name: 'Wild Water',
    kind: 'Series',
    year: 2025,
    rating: '9.1',
    duration: '6 episodes',
    genres: ['Adventure', 'Documentary'],
    description: 'A year on the edge of the world, following the people who have built their lives around the ocean.',
    image: photo('photo-1500375592092-40eb2168fd21'),
  },
  {
    id: 'soft-landing',
    name: 'Soft Landing',
    kind: 'Film',
    year: 2025,
    rating: '8.3',
    duration: '1h 44m',
    genres: ['Comedy', 'Drama'],
    description: 'An over-planner and a beautiful mess inherit a tiny bookshop in a town neither of them meant to visit.',
    image: photo('photo-1470770841072-f978cf4d019e'),
  },
  {
    id: 'north-of-nowhere',
    name: 'North of Nowhere',
    kind: 'Series',
    year: 2026,
    rating: '8.9',
    duration: '8 episodes',
    genres: ['Mystery', 'Drama'],
    description: 'A cartographer returns to her remote hometown to redraw its borders, only to find the land changing overnight.',
    image: photo('photo-1464822759023-fed622ff2c3b'),
  },
  {
    id: 'small-hours',
    name: 'Small Hours',
    kind: 'Film',
    year: 2024,
    rating: '8.1',
    duration: '1h 38m',
    genres: ['Romance', 'Drama'],
    description: 'Two strangers meet every Thursday in an all-night diner, and slowly become part of each other’s routine.',
    image: photo('photo-1519608487953-e999c86e7455'),
  },
  {
    id: 'paper-sky',
    name: 'Paper Sky',
    kind: 'Film',
    year: 2025,
    rating: '7.9',
    duration: '1h 57m',
    genres: ['Adventure', 'Family'],
    description: 'A kite maker and her curious grandson set out to deliver a message across a landscape that keeps shifting.',
    image: photo('photo-1470071459604-3b5ec3a7fe05'),
  },
  {
    id: 'second-nature',
    name: 'Second Nature',
    kind: 'Series',
    year: 2025,
    rating: '8.6',
    duration: '5 episodes',
    genres: ['Documentary', 'Science'],
    description: 'Small stories of adaptation reveal how life finds a way in the most unexpected places.',
    image: photo('photo-1441974231531-c6227db76b6e'),
  },
  {
    id: 'afterlight',
    name: 'Afterlight',
    kind: 'Film',
    year: 2024,
    rating: '8.4',
    duration: '2h 03m',
    genres: ['Science fiction', 'Drama'],
    description: 'When an observatory catches a signal from the future, a reluctant astronomer must decide whether anyone should hear it.',
    image: photo('photo-1462331940025-496dfbfc7564'),
  },
  {
    id: 'open-country',
    name: 'Open Country',
    kind: 'Series',
    year: 2026,
    rating: '8.5',
    duration: '7 episodes',
    genres: ['Documentary', 'Adventure'],
    description: 'A field guide to the landscapes and quiet communities that still make room for wonder.',
    image: photo('photo-1500530855697-b586d89ba3ee'),
  },
]

export const genres = ['All', 'Drama', 'Mystery', 'Adventure', 'Documentary', 'Romance', 'Comedy']
