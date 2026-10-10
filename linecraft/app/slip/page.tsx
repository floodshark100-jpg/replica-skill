"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readSaved, writeSaved, onSavedChange, type SavedProp } from "@/lib/saved.ts";

export default function SlipPage() {
  const [list, setList] = useState<SavedProp[] | null>(null);
  useEffect(() => {
    const sync = () => setList(readSaved());
    sync();
    return onSavedChange(sync);
  }, []);

  return (
    <>
      <title>Saved · Linecraft</title>
      <h1>Saved props</h1>
      <p className="muted sm">Your shortlist, kept in this browser. Lines shown are the line when you saved it.</p>
      {list === null ? (
        <div className="card" aria-busy="true"><p className="muted sm">Loading…</p></div>
      ) : list.length === 0 ? (
        <div className="card" role="status">
          <h3>Nothing saved yet</h3>
          <p className="muted sm">Tap ☆ Save on any prop to keep it here while you research.</p>
          <Link className="btn btn-primary btn-sm" href="/props">Browse props</Link>
        </div>
      ) : (
        <>
          <div className="row" style={{ marginBottom: "var(--s3)" }}>
            <span className="sm">{list.length} saved</span>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => writeSaved([])}>Clear all</button>
          </div>
          <div className="table-wrap">
            <table>
              <caption className="vh">Saved props</caption>
              <thead><tr><th scope="col">Player</th><th scope="col">Pick</th><th scope="col" className="num">Rating</th><th scope="col"><span className="vh">Remove</span></th></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td className="player-cell"><Link href={`/player/${p.playerId}?market=${p.market}`}>{p.player}</Link><div className="xs muted">{p.team} vs {p.opp} · {p.sport.toUpperCase()}</div></td>
                    <td><span className={`side ${p.side}`}>{p.side}</span> <span className="mono">{p.line}</span> <span className="muted sm">{p.marketLabel}</span></td>
                    <td className="num mono">{p.score ?? "–"}</td>
                    <td><button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${p.player} ${p.marketLabel}`} onClick={() => writeSaved(readSaved().filter((x) => x.id !== p.id))}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
