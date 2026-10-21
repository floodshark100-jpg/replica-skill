// Saved props live in the browser in v1. Production moves them to `saved_props`.
export interface SavedProp {
  id: string;
  playerId: string;
  player: string;
  // "BOS @ NYK"; older saves have team/opp instead
  game?: string;
  team?: string;
  opp?: string;
  market: string;
  marketLabel: string;
  side: "over" | "under";
  line: number;
  score: number | null;
  sport: string;
  savedAt: string;
}

const KEY = "lc_saved";
const EVENT = "lc-saved-change";

export function readSaved(): SavedProp[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeSaved(list: SavedProp[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked: the list just won't persist
  }
  window.dispatchEvent(new Event(EVENT));
}

export function toggleSaved(p: SavedProp): boolean {
  const list = readSaved();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) {
    list.splice(i, 1);
    writeSaved(list);
    return false;
  }
  writeSaved([p, ...list]);
  return true;
}

export function onSavedChange(fn: () => void): () => void {
  const h = () => fn();
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}
