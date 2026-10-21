// A private live deployment: ACCESS_PASSWORD gates every page, API route and asset,
// and whoever has the password sees every game (no free-plan lock).
import { test, expect } from "@playwright/test";

const GATED = "http://localhost:3102";

test("without the password: 401 on pages, API and assets", async ({ request }) => {
  for (const path of ["/", "/arbs?sport=nba", "/api/arbs?sport=nba", "/api/props?sport=nba", "/icon.svg"]) {
    const r = await request.get(GATED + path, { maxRedirects: 0 });
    expect(r.status(), path).toBe(401);
    expect(r.headers()["www-authenticate"]).toMatch(/^Basic realm="Linecraft"/);
  }
  const wrong = await request.get(`${GATED}/api/arbs?sport=nba`, { headers: { authorization: `Basic ${Buffer.from("me:nope").toString("base64")}` } });
  expect(wrong.status()).toBe(401);
});

test("with the password: the scanner works and every game is open", async ({ browser }) => {
  const ctx = await browser.newContext({ httpCredentials: { username: "me", password: "e2e-pass" } });
  const page = await ctx.newPage();
  await page.goto(`${GATED}/arbs?sport=nba`);
  await expect(page.getByRole("heading", { name: "Arbitrage scanner" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("Kasimir Duval");
  await page.goto(`${GATED}/props?sport=nba`);
  await expect(page.getByRole("heading", { name: /more props? in/ })).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await ctx.close();
});
