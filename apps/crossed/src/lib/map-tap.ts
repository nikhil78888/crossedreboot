// Map Tap — a "tap the place on the world map" game. Scored by how close your
// tap lands (great-circle distance), blended with TIME for the race format:
// each round you place ~7 named places; a tap within tolerance is a HIT, a miss
// adds a time penalty. Fully self-contained (bundled place list + one map image)
// like Wordsy/Word Search, so it ships with no server content.
//
// The bundled map (src/assets/images/mappy-world.png) is an EQUIRECTANGULAR
// (plate carrée) political world map: screen x is linear in longitude and y is
// linear in latitude, so a tap's pixel position converts straight to lat/long.

import CITY_DATA from "./mappy-cities.json";

export type PlaceType = "city";
export type MapPlace = {
  name: string;
  country: string; // shown with the city, MapTap-style ("Lyon, France")
  province: string; // state/region — shown for big countries to disambiguate
  type: PlaceType;
  lat: number; // +N / -S
  lon: number; // +E / -W
  pop: number; // population (for difficulty-tiered sampling)
};

// Big countries where the country alone is too vague (a city could be anywhere),
// so we also show the province/state.
export const BIG_COUNTRIES = new Set<string>([
  "China", "India", "United States", "Russia", "Brazil", "Canada",
  "Australia", "Indonesia", "Argentina", "Kazakhstan", "Mexico", "Pakistan",
]);

// Graduated time scoring instead of a hard hit/miss. Each place has two radii:
//   close  — tap inside this and you EARN a time bonus (precision is rewarded),
//            scaling from BONUS_MAX at a bullseye down to 0 at the edge.
//   free   — a generous forgiveness zone: anywhere inside free (but outside
//            close) is neutral (no penalty, counts as a solid hit).
//   beyond free — a real miss: a time penalty that grows with distance, capped.
// Countries are big targets so their radii are larger than a capital's point.
export const RADII: Record<PlaceType, { close: number; free: number; penPer: number }> = {
  // Cities are point targets, so the zones are generous (the small hit area felt
  // too strict): nail it within ~450km for a bonus, ~1300km still counts.
  city: { close: 450, free: 1300, penPer: 500 },
};
export const BONUS_MAX_SEC = 3; // best possible time bonus (bullseye)
export const PENALTY_MAX_SEC = 8; // worst possible time penalty (far miss)
// Places per round.
export const ROUND_SIZE = 7;
// Accuracy gate: you must land at least this many of the round (inside the
// forgiving `free` zone) for the run to post a time. Below it = DNF, so you
// can't just spam-tap fast and bank a good time on luck.
export const MIN_HITS = 4;

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

// ~1,900 real world cities (population >= 300k, GeoNames, city-sections removed)
// as [name, lat, lon, pop]. Comprehensive — includes plenty of hard ones — but
// no villages or neighborhoods. We name the city; you tap where it is.
export const PLACES: MapPlace[] = (
  CITY_DATA as [string, string, string, number, number, number][]
).map(([name, country, province, lat, lon, pop]) => ({
  name,
  country,
  province,
  type: "city",
  lat,
  lon,
  pop,
}));


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

// Recognizability tier. Raw population is a BAD proxy for "famous" (the biggest
// cities are populous-but-unknown Chinese/Indian cities), so the famous tier is
// a hand-curated set of globally iconic cities. Everything else is the harder
// long tail. Each round is mostly iconic with a couple of hard ones mixed in.
const ICONIC = new Set<string>([
  "New York City","Los Angeles","Chicago","San Francisco","Las Vegas","Miami","Boston","Washington","Seattle","Houston","Dallas","Philadelphia","Atlanta","Toronto","Vancouver","Montréal","Mexico City","Havana",
  "Rio de Janeiro","São Paulo","Buenos Aires","Lima","Bogotá","Santiago","Caracas","Quito","Montevideo",
  "London","Paris","Madrid","Barcelona","Lisbon","Rome","Milan","Naples","Berlin","Munich","Frankfurt am Main","Hamburg","Amsterdam","Brussels","Vienna","Zürich","Prague","Budapest","Warsaw","Stockholm","Copenhagen","Oslo","Helsinki","Dublin","Edinburgh","Athens","Moscow","Saint Petersburg","Kyiv","Istanbul","Lyon","Marseille",
  "Cairo","Casablanca","Marrakesh","Cape Town","Johannesburg","Nairobi","Lagos","Accra","Addis Ababa","Tunis","Algiers","Dakar","Dubai","Abu Dhabi","Doha","Riyadh","Jerusalem","Tel Aviv","Beirut","Baghdad","Tehran","Makkah",
  "Mumbai","Delhi","New Delhi","Bengaluru","Kolkata","Chennai","Hyderabad","Karachi","Lahore","Islamabad","Dhaka","Bangkok","Singapore","Kuala Lumpur","Jakarta","Manila","Hanoi","Ho Chi Minh City","Beijing","Shanghai","Hong Kong","Guangzhou","Shenzhen","Chengdu","Tokyo","Osaka","Kyoto","Nagoya","Seoul","Busan","Taipei",
  "Sydney","Melbourne","Brisbane","Perth","Auckland",
]);
const FAMOUS = PLACES.filter((p) => ICONIC.has(p.name));
const REST = PLACES.filter((p) => !ICONIC.has(p.name));

// Weighted pick without replacement (Efraimidis–Spirakis, weight = sqrt(pop)),
// skipping any country already used so a round never repeats a country. Mutates
// `usedCountries`. Returns up to `n` places.
const weightedPickDistinct = (
  pool: MapPlace[],
  n: number,
  rnd: () => number,
  usedCountries: Set<string>
): MapPlace[] => {
  const order = pool
    .map((p) => ({ p, k: Math.pow(rnd() || 1e-9, 1 / Math.max(1, Math.sqrt(p.pop))) }))
    .sort((a, b) => b.k - a.k);
  const out: MapPlace[] = [];
  for (const { p } of order) {
    if (out.length >= n) break;
    if (usedCountries.has(p.country)) continue;
    usedCountries.add(p.country);
    out.push(p);
  }
  return out;
};

// Build a round from a seed: ~5 recognizable + ~2 harder, ONE city per country,
// then shuffle the order.
export const makeRound = (
  seed: number,
  size: number = ROUND_SIZE
): MapPlace[] => {
  const rnd = mulberry32(seed || 1);
  const used = new Set<string>();
  const restN = Math.min(2, Math.max(0, size - 1));
  const famousN = Math.max(0, size - restN);
  const round = [
    ...weightedPickDistinct(FAMOUS, famousN, rnd, used),
    ...weightedPickDistinct(REST, restN, rnd, used),
  ];
  // Top up from the whole pool if a tier ran short on distinct countries.
  if (round.length < size) {
    round.push(
      ...weightedPickDistinct(PLACES, size - round.length, rnd, used)
    );
  }
  // Fisher–Yates so the hard ones aren't always last.
  for (let i = round.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [round[i], round[j]] = [round[j], round[i]];
  }
  return round;
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
