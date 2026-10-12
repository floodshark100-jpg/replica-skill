"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY = "lc_arbs_auto";

// Opt-in: re-renders the page every `seconds` while the tab is visible. The server
// caches the scan per sport, so more viewers don't mean more API credits.
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { setOn(localStorage.getItem(KEY) === "1"); } catch { /* storage blocked: stays off */ }
  }, []);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [on, seconds, router]);
  const toggle = (v: boolean) => {
    setOn(v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* not remembered */ }
  };
  return (
    <label className="field" style={{ display: "flex", alignItems: "center", gap: "var(--s2)", alignSelf: "end", minHeight: 40 }}>
      <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />
      Auto-refresh every {seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds}s`}
    </label>
  );
}
