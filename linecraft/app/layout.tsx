import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav.tsx";
import { Logo } from "@/components/Logo.tsx";
import { currentPlan } from "@/lib/plan.ts";

export const metadata: Metadata = {
  title: { default: "Linecraft · Player prop research", template: "%s · Linecraft" },
  description: "Every player prop today, with hit rates, matchups and a rating you can actually read.",
};

export const viewport: Viewport = { themeColor: "#0e1116", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const plan = await currentPlan();
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="brand" aria-label="Linecraft home"><Logo /> <span className="hide-sm">Linecraft</span></Link>
            <Nav />
            <Link href="/account" className={`plan-pill ${plan}`} aria-label={`Plan: ${plan}. Account`}>{plan === "pro" ? "PRO" : "FREE"}</Link>
          </div>
        </header>
        <main id="main" className="wrap">{children}</main>
        <footer>
          <div className="wrap grid">
            <p>
              Research only. Linecraft is not a sportsbook and takes no bets. 21+ (18+ where legal). If gambling stops being fun,
              call or text 1-800-GAMBLER.
            </p>
            <p>Demo data: every league, team and player here is fictional until a licensed data feed is connected.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
