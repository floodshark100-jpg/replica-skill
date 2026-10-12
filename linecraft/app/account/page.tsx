import type { Metadata } from "next";
import Link from "next/link";
import { currentPlan } from "@/lib/plan.ts";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const plan = await currentPlan();
  return (
    <>
      <h1>Account</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Plan: {plan === "pro" ? "Pro" : "Free"}</h2>
        <p className="muted sm">{plan === "pro" ? "Every game is open." : "The first game of the day in each sport is open."}</p>
        <div className="row">
          {plan === "pro" ? (
            <form action="/api/plan" method="post"><input type="hidden" name="plan" value="free" /><button className="btn btn-secondary" type="submit">Cancel Pro</button></form>
          ) : (
            <Link className="btn btn-primary" href="/pricing">Upgrade</Link>
          )}
          <Link className="btn btn-ghost" href="/signin">Sign in</Link>
        </div>
      </div>
    </>
  );
}
