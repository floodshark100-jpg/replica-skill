// Linecraft's own mark: a rising line crossing a threshold.
export function Logo() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--accent)" />
      <path d="M5 16l4-4 3 3 7-8" fill="none" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12h16" stroke="var(--on-accent)" strokeWidth="1.2" strokeDasharray="2 2" opacity=".6" />
    </svg>
  );
}
