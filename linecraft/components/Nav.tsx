"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/props", label: "Props" },
  { href: "/games", label: "Games" },
  { href: "/arbs", label: "Arbs" },
  { href: "/matchups", label: "Matchups" },
  { href: "/slip", label: "Saved" },
  { href: "/pricing", label: "Pricing" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
