import { test, expect } from "./fixtures.ts";

test.describe("F02 check one prop in depth", () => {
  test("H1 window switch, market switch, books, rating breakdown", async ({ page, pro, axe }) => {
    await pro();
    await page.goto("/player/nba-hbc-1?market=points");
    await axe();
    await expect(page.locator(".chart .bar")).toHaveCount(10);
    await page.getByRole("link", { name: "L5", exact: true }).click();
    await expect(page.locator(".chart .bar")).toHaveCount(5);
    await page.getByRole("link", { name: "L20", exact: true }).click();
    await expect(page.locator(".chart .bar")).toHaveCount(20);
    await expect(page.getByRole("heading", { name: /How the \d+ was built/ })).toBeVisible();
    await expect(page.locator(".part")).toHaveCount(5);
    await expect(page.getByRole("table", { name: "Line and odds at each sportsbook" }).locator("tbody tr")).toHaveCount(4);
    await page.getByRole("link", { name: "Rebounds" }).click();
    await expect(page).toHaveURL(/market=rebounds/);
    await expect(page.getByRole("heading", { name: /Rebounds/ }).first()).toBeVisible();
  });

  test("H2 chart colours match the hit/miss column", async ({ page, pro }) => {
    await pro();
    await page.goto("/player/nba-hbc-1?market=points&window=10");
    const bars = await page.locator(".chart .bar").evaluateAll((els) => els.map((e) => e.className.replace("bar ", "")));
    const results = (await page.locator("section:has(#games-h) tbody tr td:last-child").allInnerTexts()).slice(0, 10).reverse();
    expect(bars).toEqual(results.map((r) => (r === "Hit" ? "hit" : r === "Miss" ? "miss" : "push")));
  });

  test("N1 free viewer on a locked game sees the upsell, not the numbers", async ({ page }) => {
    await page.goto("/games?sport=nba");
    const lockedCard = page.locator("a.game", { hasText: "🔒 Pro" }).first();
    await lockedCard.click();
    await expect(page.getByRole("heading", { name: /This game is on Pro/ })).toBeVisible();
    await expect(page.locator("tbody")).toHaveCount(0);
  });

  test("N2 unknown player is a 404 page", async ({ page }) => {
    const r = await page.goto("/player/does-not-exist");
    expect(r?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /Not on today/ })).toBeVisible();
  });
});
