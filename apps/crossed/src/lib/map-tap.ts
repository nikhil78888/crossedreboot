// Map Tap — a "tap the place on the world map" game. Scored by how close your
// tap lands (great-circle distance), blended with TIME for the race format:
// each round you place ~7 named places; a tap within tolerance is a HIT, a miss
// adds a time penalty. Fully self-contained (bundled place list + one map image)
// like Wordsy/Word Search, so it ships with no server content.
//
// The bundled map (src/assets/images/mappy-world.png) is an EQUIRECTANGULAR
// (plate carrée) political world map: screen x is linear in longitude and y is
// linear in latitude, so a tap's pixel position converts straight to lat/long.

export type PlaceType = "city";
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
  // Cities are point targets, so the zones are generous enough to be fair on a
  // world map: nail it within ~300km for a bonus, ~800km still counts.
  city: { close: 300, free: 800, penPer: 350 },
};
export const BONUS_MAX_SEC = 3; // best possible time bonus (bullseye)
export const PENALTY_MAX_SEC = 8; // worst possible time penalty (far miss)
// Places per round.
export const ROUND_SIZE = 7;
// Accuracy gate: you must land at least this many of the round (inside the
// forgiving `free` zone) for the run to post a time. Below it = DNF, so you
// can't just spam-tap fast and bank a good time on luck.
export const MIN_HITS = 5;

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

// A pool of well-known world CITIES (recognizable to a broad audience). We name
// the city; you tap where it is. Coordinates are the city center.
export const PLACES: MapPlace[] = [
  // North America
  { name: "New York City", type: "city", lat: 40.7, lon: -74.0 },
  { name: "Los Angeles", type: "city", lat: 34.1, lon: -118.2 },
  { name: "Chicago", type: "city", lat: 41.9, lon: -87.6 },
  { name: "Toronto", type: "city", lat: 43.7, lon: -79.4 },
  { name: "Washington, D.C.", type: "city", lat: 38.9, lon: -77.0 },
  { name: "Mexico City", type: "city", lat: 19.4, lon: -99.1 },
  { name: "Havana", type: "city", lat: 23.1, lon: -82.4 },
  { name: "Vancouver", type: "city", lat: 49.3, lon: -123.1 },
  // South America
  { name: "Rio de Janeiro", type: "city", lat: -22.9, lon: -43.2 },
  { name: "São Paulo", type: "city", lat: -23.5, lon: -46.6 },
  { name: "Buenos Aires", type: "city", lat: -34.6, lon: -58.4 },
  { name: "Lima", type: "city", lat: -12.0, lon: -77.0 },
  { name: "Bogotá", type: "city", lat: 4.7, lon: -74.1 },
  { name: "Santiago", type: "city", lat: -33.4, lon: -70.6 },
  // Europe
  { name: "London", type: "city", lat: 51.5, lon: -0.1 },
  { name: "Paris", type: "city", lat: 48.9, lon: 2.4 },
  { name: "Madrid", type: "city", lat: 40.4, lon: -3.7 },
  { name: "Barcelona", type: "city", lat: 41.4, lon: 2.2 },
  { name: "Lisbon", type: "city", lat: 38.7, lon: -9.1 },
  { name: "Rome", type: "city", lat: 41.9, lon: 12.5 },
  { name: "Berlin", type: "city", lat: 52.5, lon: 13.4 },
  { name: "Amsterdam", type: "city", lat: 52.4, lon: 4.9 },
  { name: "Stockholm", type: "city", lat: 59.3, lon: 18.1 },
  { name: "Athens", type: "city", lat: 38.0, lon: 23.7 },
  { name: "Warsaw", type: "city", lat: 52.2, lon: 21.0 },
  { name: "Moscow", type: "city", lat: 55.8, lon: 37.6 },
  { name: "Istanbul", type: "city", lat: 41.0, lon: 29.0 },
  // Africa & Middle East
  { name: "Cairo", type: "city", lat: 30.0, lon: 31.2 },
  { name: "Lagos", type: "city", lat: 6.5, lon: 3.4 },
  { name: "Nairobi", type: "city", lat: -1.3, lon: 36.8 },
  { name: "Cape Town", type: "city", lat: -33.9, lon: 18.4 },
  { name: "Johannesburg", type: "city", lat: -26.2, lon: 28.0 },
  { name: "Dubai", type: "city", lat: 25.2, lon: 55.3 },
  { name: "Tehran", type: "city", lat: 35.7, lon: 51.4 },
  // Asia
  { name: "Mumbai", type: "city", lat: 19.1, lon: 72.9 },
  { name: "New Delhi", type: "city", lat: 28.6, lon: 77.2 },
  { name: "Bangkok", type: "city", lat: 13.8, lon: 100.5 },
  { name: "Singapore", type: "city", lat: 1.4, lon: 103.8 },
  { name: "Jakarta", type: "city", lat: -6.2, lon: 106.8 },
  { name: "Beijing", type: "city", lat: 39.9, lon: 116.4 },
  { name: "Shanghai", type: "city", lat: 31.2, lon: 121.5 },
  { name: "Hong Kong", type: "city", lat: 22.3, lon: 114.2 },
  { name: "Tokyo", type: "city", lat: 35.7, lon: 139.7 },
  { name: "Seoul", type: "city", lat: 37.6, lon: 127.0 },
  // Oceania
  { name: "Sydney", type: "city", lat: -33.9, lon: 151.2 },
  { name: "Melbourne", type: "city", lat: -37.8, lon: 145.0 },
  { name: "Auckland", type: "city", lat: -36.8, lon: 174.8 },
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
