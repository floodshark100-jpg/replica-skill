import { NextResponse } from "next/server";
import { PLAN_COOKIE } from "@/lib/plan.ts";

// DEMO ONLY: lets a visitor try Pro without paying. Delete when Stripe is wired:
// the plan then comes from the subscriptions table, set by the signed webhook.
export async function POST(req: Request) {
  const form = await req.formData();
  const plan = form.get("plan") === "pro" ? "pro" : "free";
  const res = NextResponse.redirect(new URL(plan === "pro" ? "/props" : "/account", req.url), 303);
  res.cookies.set(PLAN_COOKIE, plan, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
