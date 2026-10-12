// Arbitrage scanner in live mode against the mock Odds API: the in-play game
// (started 30 minutes ago) carries an arb on Duval and a middle on Abara.
import { test, expect } from "../fixtures.ts";

test.describe("arbitrage scanner (mock Odds API)", () => {
  test("finds the in-play arb and middle, with stakes and quote ages", async ({ page, axe }) => {
    await page.goto("/arbs?sport=nba");
    await axe();
    await expect(page.getByRole("heading", { name: "Arbitrage scanner" })).toBeVisible();
    await expect(page.getByText(/2 found across 3 games \(1 in play\)/)).toBeVisible();
    await expect(page.getByText(/480 API credits left/)).toBeVisible();
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    const arb = rows.first();
    await expect(arb).toContainText("Kasimir Duval");
    await expect(arb).toContainText("Arb");
    await expect(arb).toContainText("In play");
    await expect(arb).toContainText("Over 21.5 +115");
    await expect(arb).toContainText("Under 21.5 +125");
    // 1/2.15 + 1/2.25 = 0.9095 -> +9.9%; $100 splits 51.14 / 48.86 and pays $109.94
    await expect(arb).toContainText("+9.9%");
    await expect(arb).toContainText("$51.14 / $48.86");
    await expect(arb.locator(".rank-hard")).toHaveText(/5m old/);
    await expect(rows.nth(1)).toContainText("Nico Abara");
    await expect(rows.nth(1)).toContainText(/both win \+\d/);
  });

  test("kind filter and stake", async ({ page }) => {
    await page.goto("/arbs?sport=nba");
    await page.getByRole("link", { name: "Middles" }).click();
    await expect(page).toHaveURL(/kind=middle/);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText("Nico Abara");
    await page.getByLabel("Kind").getByRole("link", { name: "Arbs", exact: true }).click();
    await expect(page).toHaveURL(/kind=arb/);
    await page.getByLabel("Total stake ($)").fill("1000");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/stake=1000/);
    await expect(page.locator("tbody tr").first()).toContainText("$511.36 / $488.64");
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("the props board still leaves the in-play game out", async ({ page }) => {
    await page.goto("/props?sport=nba");
    await expect(page.getByText("Kasimir Duval")).toHaveCount(0);
  });

  test("a sport with no games says so", async ({ page }) => {
    await page.goto("/arbs?sport=nhl");
    await expect(page.getByRole("heading", { name: "No games to scan" })).toBeVisible();
  });

  test("JSON API", async ({ request }) => {
    const body = await (await request.get("/api/arbs?sport=nba&stake=200")).json();
    expect(body).toMatchObject({ source: "live", inPlay: 1, total: 2, locked: 0, creditsRemaining: 480, stake: 200 });
    const [arb] = body.opportunities;
    expect(arb).toMatchObject({ kind: "arb", player: "Kasimir Duval", inPlay: true, over: { book: "Book A", price: 115 }, under: { book: "Book B", price: 125 } });
    expect(arb.stakes.over + arb.stakes.under).toBeCloseTo(200, 2);
    expect((await request.get("/api/arbs?sport=xyz")).status()).toBe(400);
  });
});
