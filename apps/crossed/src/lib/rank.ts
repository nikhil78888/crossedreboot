// Rank / leveling system — turns a rating number into a tier + division so
// progress feels like a ladder (Bronze → Grandmaster), chess.com style.
// Pure functions, no deps, so it can be used anywhere in the app.

export type Tier = {
  name: string;
  min: number; // rating floor for this tier
  color: string; // badge color
  emoji: string;
};

// Tuned to this game's distribution (most players 800–1500, top ~1470).
// The last tier is open-ended.
export const TIERS: Tier[] = [
  { name: "Bronze", min: 0, color: "#A9712B", emoji: "🥉" },
  { name: "Silver", min: 850, color: "#9AA4B2", emoji: "🥈" },
  { name: "Gold", min: 950, color: "#E7B402", emoji: "🥇" },
  { name: "Platinum", min: 1050, color: "#3FB6C9", emoji: "💎" },
  { name: "Diamond", min: 1150, color: "#4F8DF5", emoji: "💠" },
  { name: "Master", min: 1300, color: "#9B5CF6", emoji: "👑" },
  { name: "Grandmaster", min: 1450, color: "#FF4D6D", emoji: "🏆" },
];

export type Rank = {
  tier: Tier;
  division: number; // 1 (highest) .. 3 (lowest); 0 for the open-ended top tier
  label: string; // e.g. "Gold II" or "Grandmaster"
  color: string;
  emoji: string;
  floor: number; // rating at the start of this division
  ceiling: number | null; // rating at the next division/tier (null if top)
  progress: number; // 0..1 toward the next division/tier
  pointsToNext: number | null; // rating points to next step (null if top)
};

export function getRank(ratingInput: number | null | undefined): Rank {
  const rating = Math.max(0, Math.round(ratingInput ?? 1100));
  let tierIndex = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (rating >= TIERS[i].min) {
      tierIndex = i;
      break;
    }
  }
  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1] || null;

  // Open-ended top tier (Grandmaster): no divisions.
  if (!nextTier) {
    return {
      tier,
      division: 0,
      label: tier.name,
      color: tier.color,
      emoji: tier.emoji,
      floor: tier.min,
      ceiling: null,
      progress: 1,
      pointsToNext: null,
    };
  }

  // Split the tier band into 3 divisions (III lowest → I highest).
  const band = nextTier.min - tier.min;
  const step = band / 3;
  const within = rating - tier.min;
  const divIdx = Math.min(2, Math.floor(within / step)); // 0,1,2
  const division = 3 - divIdx; // 3 (lowest) .. 1 (highest)
  const floor = tier.min + divIdx * step;
  const ceiling = tier.min + (divIdx + 1) * step;
  const progress = Math.max(0, Math.min(1, (rating - floor) / (ceiling - floor)));

  return {
    tier,
    division,
    label: `${tier.name} ${["I", "II", "III"][division - 1]}`,
    color: tier.color,
    emoji: tier.emoji,
    floor,
    ceiling,
    progress,
    pointsToNext: Math.max(0, Math.ceil(ceiling - rating)),
  };
}
