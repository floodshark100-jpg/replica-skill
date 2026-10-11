import { test, expect } from "../fixtures.ts";

test.describe("live odds mode (mock Odds API)", () => {
  test("board shows market columns, the value side and best prices", async ({ page, axe }) => {
    await page.goto("/props?sport=nba");
    await axe();
    await expect(page.getByText(/Live lines and prices/)).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "EV" })).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByRole("columnheader", { name: "Rating" })).toHaveCount(0);
    const first = page.locator("tbody tr").first();
    await expect(first).toContainText("Théo Marchetti");
    await expect(first).toContainText("+105");
    await expect(first).toContainText("Over", { ignoreCase: true });
    // free plan: second game is summarised, not listed
    await expect(page.getByRole("heading", { name: /1 more prop in 1 game on Pro/ })).toBeVisible();
    await expect(page.getByLabel("Minimum rating")).toHaveCount(0);
    await expect(page.getByText(/Lines and prices from The Odds API/)).toBeVisible();
    await expect(page.getByText(/Demo data/)).toHaveCount(0);
  });

  test("player page lists every book and the alt line", async ({ page, axe }) => {
    await page.goto("/props?sport=nba");
    await page.getByRole("link", { name: "Jalen Okafor" }).click();
    await expect(page).toHaveURL(/\/player\/nba-jalen-okafor/);
    await axe();
    await expect(page.getByRole("heading", { name: "Prices at 24.5" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Over and under prices at 24.5 by sportsbook" }).locator("tbody tr")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: /Alt line 26.5/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hit rates and the rating need game logs" })).toBeVisible();
  });

  test("games slate comes from the feed; empty sports say so", async ({ page }) => {
    await page.goto("/games?sport=nba");
    await expect(page.locator("a.game")).toHaveCount(2);
    await expect(page.locator("a.game").first()).toContainText("Harbor City Comets");
    await page.goto("/games?sport=nhl");
    await expect(page.getByRole("heading", { name: "No games scheduled" })).toBeVisible();
    await page.goto("/props?sport=nhl");
    await expect(page.getByText(/No player props are posted for this sport yet/)).toBeVisible();
  });

  test("matchups explains it needs a stats feed", async ({ page }) => {
    await page.goto("/matchups?sport=nba");
    await expect(page.getByRole("heading", { name: "Needs a stats feed" })).toBeVisible();
  });

  test("Pro opens the second game", async ({ page, pro }) => {
    await pro();
    await page.goto("/props?sport=nba");
    await expect(page.locator("tbody tr")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: /more props? in/ })).toHaveCount(0);
  });

  test("JSON API reports the source", async ({ request }) => {
    const body = await (await request.get("/api/props?sport=nba")).json();
    expect(body.source).toBe("live");
    expect(body.props[0]).toMatchObject({ player: "Théo Marchetti", side: "over", bestOdds: 105 });
    expect(body.props[0].ev).toBeGreaterThan(0);
  });
});
