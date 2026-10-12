import Link from "next/link";
import { SPORTS, type SportKey } from "@/lib/data.ts";

export function SportTabs({ active, base, extra = {} }: { active: SportKey; base: string; extra?: Record<string, string> }) {
  return (
    <div className="tabs" role="list" aria-label="Sport">
      {SPORTS.map((s) => (
        <Link key={s.key} role="listitem" className="tab" aria-current={s.key === active ? "true" : undefined} href={{ pathname: base, query: { ...extra, sport: s.key } }}>
          {s.key.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
