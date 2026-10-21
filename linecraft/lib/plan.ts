import { cookies } from "next/headers";
import type { Plan } from "./data.ts";

// DEMO ONLY. The plan lives in a cookie so the free/pro gating can be tried
// without accounts. Production reads `subscriptions.plan`, written by the
// Stripe webhook (see replica/backend.md); a cookie is never trusted there.
export const PLAN_COOKIE = "lc_plan";

// A password-protected deployment (ACCESS_PASSWORD, see proxy.ts) is the owner's own
// scanner: everyone who gets past the password sees every game.
export async function currentPlan(): Promise<Plan> {
  if (process.env.ACCESS_PASSWORD?.trim()) return "pro";
  const jar = await cookies();
  return jar.get(PLAN_COOKIE)?.value === "pro" ? "pro" : "free";
}
