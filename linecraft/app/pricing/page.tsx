import type { Metadata } from "next";
import { currentPlan } from "@/lib/plan.ts";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const plan = await currentPlan();
  const annual = (await searchParams).billing === "annual";
  return (
    <>
      <h1>Pricing</h1>
      <p className="muted">One plan, flat price, cancel in one click. No contract, no add-ons.</p>
      <div className="chips" aria-label="Billing period" style={{ margin: "var(--s4) 0" }}>
        <a className="chip" href="/pricing" aria-current={!annual ? "true" : undefined}>Monthly</a>
        <a className="chip" href="/pricing?billing=annual" aria-current={annual ? "true" : undefined}>Annual · 2 months free</a>
      </div>
      <div className="grid grid-2">
        <div className={`card plan-card ${plan === "free" ? "current" : ""}`}>
          <h2 style={{ marginTop: 0 }}>Free</h2>
          <div className="price">$0</div>
          <ul className="sm">
            <li>The first game of the day in every sport, every prop</li>
            <li>Hit rates, matchups, rating breakdown, prices by book</li>
            <li>Saved props</li>
          </ul>
          {plan === "free" ? <p className="xs muted">Your current plan</p> : (
            <form action="/api/plan" method="post"><input type="hidden" name="plan" value="free" /><button className="btn btn-secondary" type="submit">Switch to Free</button></form>
          )}
        </div>
        <div className={`card plan-card ${plan === "pro" ? "current" : ""}`}>
          <h2 style={{ marginTop: 0 }}>Pro</h2>
          <div className="price">{annual ? "$99" : "$11.99"}<span className="sm muted"> / {annual ? "year" : "month"}</span></div>
          <ul className="sm">
            <li>Every game, every prop, every sport</li>
            <li>Everything in Free</li>
            <li>7-day free trial, reminder email before it ends</li>
          </ul>
          {plan === "pro" ? <p className="xs muted">Your current plan</p> : (
            <form action="/api/plan" method="post"><input type="hidden" name="plan" value="pro" /><button className="btn btn-primary" type="submit">Start free trial</button></form>
          )}
          <p className="xs muted">Demo: this switches your plan instantly with no payment. Stripe Checkout replaces it before launch.</p>
        </div>
      </div>
    </>
  );
}
