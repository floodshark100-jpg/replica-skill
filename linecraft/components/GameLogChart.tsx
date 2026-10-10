import type { Team, Side } from "@/lib/data.ts";

interface Point { date: string; opp: Team; home: boolean; value: number }

// Oldest on the left, most recent on the right; the dashed line is the prop line.
// Green is a hit for the side being shown, red a miss, grey a push.
export function GameLogChart({ log, line, side, label }: { log: Point[]; line: number; side: Side; label: string }) {
  const pts = [...log].reverse();
  const top = Math.max(line * 1.4, ...pts.map((p) => p.value), 1);
  const desc = pts.map((p) => `${p.date} ${p.home ? "vs" : "at"} ${p.opp.abbr}: ${p.value}`).join("; ");
  return (
    <figure style={{ margin: 0 }}>
      <div className="chart" role="img" aria-label={`${label} ${side}, last ${pts.length} games against a line of ${line}. ${desc}`}>
        {pts.map((p, i) => {
          const cls = p.value === line ? "push" : (p.value > line) === (side === "over") ? "hit" : "miss";
          return (
            <div key={i} className={`bar ${cls}`} style={{ height: `${Math.max(2, (p.value / top) * 100)}%` }}>
              <span>{p.value}</span>
            </div>
          );
        })}
        <div className="line" style={{ bottom: `${(line / top) * 100}%` }}><em>{line}</em></div>
      </div>
      <div className="chart-x" aria-hidden="true">
        {pts.map((p, i) => <span key={i}>{p.home ? "" : "@"}{p.opp.abbr}</span>)}
      </div>
    </figure>
  );
}
