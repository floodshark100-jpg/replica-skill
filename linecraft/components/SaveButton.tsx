"use client";
import { useEffect, useState } from "react";
import { readSaved, toggleSaved, onSavedChange, type SavedProp } from "@/lib/saved.ts";

export function SaveButton({ prop, size = "sm" }: { prop: SavedProp; size?: "sm" | "md" }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => setSaved(readSaved().some((x) => x.id === prop.id));
    sync();
    return onSavedChange(sync);
  }, [prop.id]);
  return (
    <button
      type="button"
      className={`btn ${saved ? "btn-secondary" : "btn-ghost"} ${size === "sm" ? "btn-sm" : ""}`}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Save"} ${prop.player} ${prop.marketLabel} ${prop.side} ${prop.line}`}
      onClick={() => setSaved(toggleSaved({ ...prop, savedAt: new Date().toISOString() }))}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
