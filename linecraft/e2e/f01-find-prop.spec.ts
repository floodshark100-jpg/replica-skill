import { test, expect } from "./fixtures.ts";

test.describe("F01 find a prop worth betting", () => {
  test("H1 board -> sport -> market -> sort -> player page", async ({ page, axe }) => {
    await page.goto("/props");
    await expect(page.getByRole("heading", { name: "Props today" })).toBeVisible();
    await axe();
    await page.getByRole("listitem").filter({ hasText: "NFL" }).click();
    await expect(page).toHaveURL(/sport=nfl/);
    await page.getByRole("link", { name: "Receiving yards" }).click();
    await expect(page).toHaveURL(/market=rec_yds/);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toContainText("Receiving yards");
    // sorted by rating, highest first
    const scores = await page.locator("tbody .badge").allInnerTexts();
    const nums = scores.map(Number);
    expect([...nums].sort((a, b) => b - a)).toEqual(nums);
    await rows.first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/player\/nfl-/);
    await expect(page.getByRole("heading", { name: /Game log vs/ })).toBeVisible();
  });

  test("H2 sort by player name ascending, then toggle", async ({ page }) => {
    await page.goto("/props?sport=nba");
    await page.getByRole("columnheader", { name: "Player" }).getByRole("link").click();
    await expect(page.getByRole("columnheader", { name: "Player" })).toHaveAttribute("aria-sort", "ascending");
    const names = await page.locator("tbody .player-cell > a").allInnerTexts();
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    await page.getByRole("columnheader", { name: "Player" }).getByRole("link").click();
    await expect(page.getByRole("columnheader", { name: "Player" })).toHaveAttribute("aria-sort", "descending");
  });

  test("E1 search with no match shows an empty state that clears", async ({ page }) => {
    await page.goto("/props?sport=nba");
    await page.getByRole("searchbox").fill("zzzz nobody 😀 é");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("heading", { name: "No props match" })).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("E2 minimum rating filter holds", async ({ page }) => {
    await page.goto("/props?sport=nba&min=70");
    const scores = (await page.locator("tbody .badge").allInnerTexts()).map(Number);
    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((s) => s >= 70)).toBe(true);
  });

  test("E3 junk query params don't break the page", async ({ page }) => {
    const r = await page.goto("/props?sport=xfl&sort=<script>&dir=sideways&min=abc&market=nope");
    expect(r?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Props today" })).toBeVisible();
  });

  test("N1 free plan: locked games are summarised, not listed, and carry no numbers", async ({ page, request }) => {
    await page.goto("/props?sport=nba");
    await expect(page.getByRole("heading", { name: /more props in \d+ games on Pro/ })).toBeVisible();
    const api = await (await request.get("/api/props?sport=nba")).json();
    const locked = api.props.filter((p: { locked: boolean }) => p.locked);
    expect(locked.length).toBeGreaterThan(0);
    expect(locked.every((p: { rating: unknown; l10: unknown }) => p.rating === null && p.l10 === null)).toBe(true);
  });

  test("N2 API rejects an unknown sport", async ({ request }) => {
    const r = await request.get("/api/props?sport=cricket");
    expect(r.status()).toBe(400);
  });
});
