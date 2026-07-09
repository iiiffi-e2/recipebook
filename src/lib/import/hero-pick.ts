export type HeroScoreCandidate = { index: number; score: number };

export function pickBestHeroCandidate(
  candidates: HeroScoreCandidate[],
  threshold: number
): HeroScoreCandidate | null {
  let best: HeroScoreCandidate | null = null;
  for (const candidate of candidates) {
    if (candidate.score < threshold) continue;
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}
