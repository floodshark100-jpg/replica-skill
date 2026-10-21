import type { HitRate } from "@/lib/stats.ts";
import { pct } from "@/lib/format.ts";

export function Hit({ r, showCount = false }: { r: HitRate | null; showCount?: boolean }) {
  const tone = r?.rate == null ? "mid" : r.rate >= 0.6 ? "good" : r.rate <= 0.4 ? "bad" : "mid";
  const decided = r ? r.hits + r.misses : 0;
  return (
    <span className={`hit ${tone}`}>
      {pct(r)}
      {showCount && r && decided > 0 && <span className="of">{r.hits}/{decided}</span>}
    </span>
  );
}

export function RatingBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="badge lo" aria-label="No rating">–</span>;
  const tier = score >= 75 ? "hi" : score >= 60 ? "md" : "lo";
  return <span className={`badge ${tier}`} aria-label={`Rating ${score} of 100`}>{score}</span>;
}

export function SideTag({ side }: { side: "over" | "under" | null }) {
  if (!side) return null;
  return <span className={`side ${side}`}>{side === "over" ? "Over" : "Under"}</span>;
}
