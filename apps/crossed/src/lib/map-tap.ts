// Map Tap — a "tap the place on the world map" game. Scored by how close your
// tap lands (great-circle distance), blended with TIME for the race format:
// each round you place ~7 named places; a tap within tolerance is a HIT, a miss
// adds a time penalty. Fully self-contained (bundled place list + one map image)
// like Wordsy/Word Search, so it ships with no server content.
//
// The bundled map (src/assets/images/mappy-world.png) is an EQUIRECTANGULAR
// (plate carrée) political world map: screen x is linear in longitude and y is
// linear in latitude, so a tap's pixel position converts straight to lat/long.

export type PlaceType = "country" | "capital";
export type MapPlace = {
  name: string;
  type: PlaceType;
  lat: number; // +N / -S
  lon: number; // +E / -W
};

// Graduated time scoring instead of a hard hit/miss. Each place has two radii:
//   close  — tap inside this and you EARN a time bonus (precision is rewarded),
//            scaling from BONUS_MAX at a bullseye down to 0 at the edge.
//   free   — a generous forgiveness zone: anywhere inside free (but outside
//            close) is neutral (no penalty, counts as a solid hit).
//   beyond free — a real miss: a time penalty that grows with distance, capped.
// Countries are big targets so their radii are larger than a capital's point.
export const RADII: Record<PlaceType, { close: number; free: number; penPer: number }> = {
  country: { close: 500, free: 1100, penPer: 450 },
  capital: { close: 300, free: 700, penPer: 350 },
};
export const BONUS_MAX_SEC = 3; // best possible time bonus (bullseye)
export const PENALTY_MAX_SEC = 8; // worst possible time penalty (far miss)
// Places per round.
export const ROUND_SIZE = 7;

// ---- Equirectangular pixel <-> lat/long ----
// Fractions in [0,1] across the map image. lon -180..180 -> x 0..1,
// lat +90..-90 -> y 0..1.
export const lonToXFrac = (lon: number) => (lon + 180) / 360;
export const latToYFrac = (lat: number) => (90 - lat) / 180;
export const xFracToLon = (x: number) => x * 360 - 180;
export const yFracToLat = (y: number) => 90 - y * 180;

// Great-circle distance in km (haversine).
export const distanceKm = (
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
};

// A compact pool of well-known places (recognizable to a broad audience). Mixed
// countries + capitals. Coordinates are the country centroid / the capital city.
export const PLACES: MapPlace[] = [
  // --- Countries (tap the country) ---
  { name: "United States", type: "country", lat: 39.8, lon: -98.6 },
  { name: "Canada", type: "country", lat: 56.1, lon: -106.3 },
  { name: "Mexico", type: "country", lat: 23.6, lon: -102.6 },
  { name: "Brazil", type: "country", lat: -10.3, lon: -53.2 },
  { name: "Argentina", type: "country", lat: -38.4, lon: -63.6 },
  { name: "Peru", type: "country", lat: -9.2, lon: -75.0 },
  { name: "Colombia", type: "country", lat: 4.6, lon: -74.3 },
  { name: "Chile", type: "country", lat: -35.7, lon: -71.5 },
  { name: "United Kingdom", type: "country", lat: 54.0, lon: -2.4 },
  { name: "Ireland", type: "country", lat: 53.1, lon: -8.2 },
  { name: "France", type: "country", lat: 46.6, lon: 2.2 },
  { name: "Spain", type: "country", lat: 40.2, lon: -3.7 },
  { name: "Portugal", type: "country", lat: 39.5, lon: -8.0 },
  { name: "Germany", type: "country", lat: 51.1, lon: 10.4 },
  { name: "Italy", type: "country", lat: 42.8, lon: 12.6 },
  { name: "Norway", type: "country", lat: 64.6, lon: 11.5 },
  { name: "Sweden", type: "country", lat: 62.2, lon: 15.3 },
  { name: "Poland", type: "country", lat: 51.9, lon: 19.1 },
  { name: "Greece", type: "country", lat: 39.1, lon: 22.0 },
  { name: "Ukraine", type: "country", lat: 48.4, lon: 31.2 },
  { name: "Russia", type: "country", lat: 61.5, lon: 96.0 },
  { name: "Turkey", type: "country", lat: 39.0, lon: 35.2 },
  { name: "Egypt", type: "country", lat: 26.8, lon: 30.8 },
  { name: "Nigeria", type: "country", lat: 9.1, lon: 8.7 },
  { name: "Kenya", type: "country", lat: 0.0, lon: 37.9 },
  { name: "South Africa", type: "country", lat: -30.6, lon: 22.9 },
  { name: "Morocco", type: "country", lat: 31.8, lon: -7.1 },
  { name: "Ethiopia", type: "country", lat: 9.1, lon: 40.5 },
  { name: "Saudi Arabia", type: "country", lat: 23.9, lon: 45.1 },
  { name: "Iran", type: "country", lat: 32.4, lon: 53.7 },
  { name: "India", type: "country", lat: 22.6, lon: 79.0 },
  { name: "Pakistan", type: "country", lat: 30.4, lon: 69.3 },
  { name: "China", type: "country", lat: 35.9, lon: 104.2 },
  { name: "Japan", type: "country", lat: 36.2, lon: 138.3 },
  { name: "South Korea", type: "country", lat: 36.5, lon: 127.9 },
  { name: "Thailand", type: "country", lat: 15.9, lon: 100.9 },
  { name: "Vietnam", type: "country", lat: 14.1, lon: 108.3 },
  { name: "Indonesia", type: "country", lat: -2.5, lon: 118.0 },
  { name: "Philippines", type: "country", lat: 12.9, lon: 121.8 },
  { name: "Australia", type: "country", lat: -25.3, lon: 133.8 },
  { name: "New Zealand", type: "country", lat: -41.8, lon: 173.0 },
  { name: "Iceland", type: "country", lat: 64.9, lon: -19.0 },
  // --- Capitals (tap the city) ---
  { name: "Washington, D.C.", type: "capital", lat: 38.9, lon: -77.0 },
  { name: "Ottawa", type: "capital", lat: 45.4, lon: -75.7 },
  { name: "Mexico City", type: "capital", lat: 19.4, lon: -99.1 },
  { name: "Brasília", type: "capital", lat: -15.8, lon: -47.9 },
  { name: "Buenos Aires", type: "capital", lat: -34.6, lon: -58.4 },
  { name: "London", type: "capital", lat: 51.5, lon: -0.1 },
  { name: "Paris", type: "capital", lat: 48.9, lon: 2.4 },
  { name: "Madrid", type: "capital", lat: 40.4, lon: -3.7 },
  { name: "Rome", type: "capital", lat: 41.9, lon: 12.5 },
  { name: "Berlin", type: "capital", lat: 52.5, lon: 13.4 },
  { name: "Moscow", type: "capital", lat: 55.8, lon: 37.6 },
  { name: "Cairo", type: "capital", lat: 30.0, lon: 31.2 },
  { name: "Nairobi", type: "capital", lat: -1.3, lon: 36.8 },
  { name: "Cape Town", type: "capital", lat: -33.9, lon: 18.4 },
  { name: "Lagos", type: "capital", lat: 6.5, lon: 3.4 },
  { name: "Istanbul", type: "capital", lat: 41.0, lon: 29.0 },
  { name: "Dubai", type: "capital", lat: 25.2, lon: 55.3 },
  { name: "New Delhi", type: "capital", lat: 28.6, lon: 77.2 },
  { name: "Beijing", type: "capital", lat: 39.9, lon: 116.4 },
  { name: "Tokyo", type: "capital", lat: 35.7, lon: 139.7 },
  { name: "Seoul", type: "capital", lat: 37.6, lon: 127.0 },
  { name: "Bangkok", type: "capital", lat: 13.8, lon: 100.5 },
  { name: "Singapore", type: "capital", lat: 1.4, lon: 103.8 },
  { name: "Sydney", type: "capital", lat: -33.9, lon: 151.2 },
  { name: "Rio de Janeiro", type: "capital", lat: -22.9, lon: -43.2 },
  { name: "Los Angeles", type: "capital", lat: 34.1, lon: -118.2 },
  { name: "New York City", type: "capital", lat: 40.7, lon: -74.0 },
];

// A seeded shuffle so a given seed reproduces the same round (useful later for a
// shared daily duel; v1 just passes Math.random-derived seeds).
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Build a round of ROUND_SIZE distinct places from a seed.
export const makeRound = (
  seed: number,
  size: number = ROUND_SIZE
): MapPlace[] => {
  const rnd = mulberry32(seed || 1);
  const pool = [...PLACES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(size, pool.length));
};

export type HitTier = "bullseye" | "good" | "miss";
export type TapResult = {
  place: MapPlace;
  tapLat: number;
  tapLon: number;
  distanceKm: number;
  tier: HitTier;
  // Seconds added to your time: NEGATIVE = bonus (very close), 0 = solid hit,
  // POSITIVE = penalty (real miss).
  timeDeltaSec: number;
  hit: boolean; // true for bullseye or good (anything inside `free`)
};

export const scoreTap = (place: MapPlace, tapLat: number, tapLon: number): TapResult => {
  const d = distanceKm(place.lat, place.lon, tapLat, tapLon);
  const r = RADII[place.type];
  let tier: HitTier;
  let timeDeltaSec: number;
  if (d <= r.close) {
    // Bullseye zone: bonus scales from -BONUS_MAX (dead on) up to 0 at the edge.
    tier = "bullseye";
    timeDeltaSec = -BONUS_MAX_SEC * (1 - d / r.close);
  } else if (d <= r.free) {
    tier = "good"; // solid hit, neutral time
    timeDeltaSec = 0;
  } else {
    tier = "miss";
    timeDeltaSec = Math.min(PENALTY_MAX_SEC, 1 + (d - r.free) / r.penPer);
  }
  return {
    place,
    tapLat,
    tapLon,
    distanceKm: d,
    tier,
    timeDeltaSec: Math.round(timeDeltaSec * 10) / 10,
    hit: tier !== "miss",
  };
};

export const fmtKm = (km: number) =>
  km < 1 ? "0 km" : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
