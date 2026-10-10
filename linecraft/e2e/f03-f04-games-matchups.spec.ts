import { test, expect } from "./fixtures.ts";

test("F03-H1 slate -> game -> player", async ({ page, axe }) => {
  await page.goto("/games?sport=mlb");
  await axe();
  await expect(page.locator("a.game")).toHaveCount(4);
  await page.locator("a.game").first().click();
  await expect(page).toHaveURL(/\/games\/mlb-g/);
  await page.locator("tbody .player-cell a").first().click();
  await expect(page).toHaveURL(/\/player\/mlb-/);
});

test("F04-H1 matchups -> position -> stat -> props vs that defense", async ({ page, axe }) => {
  await page.goto("/matchups?sport=nfl");
  await axe();
  await page.getByRole("link", { name: "WR", exact: true }).click();
  await expect(page).toHaveURL(/position=WR/);
  await page.getByRole("link", { name: "Receptions" }).click();
  await expect(page).toHaveURL(/market=receptions/);
  await expect(page.getByRole("link", { name: "Receptions" })).toHaveAttribute("aria-current", "true");
  const ranks = await page.locator("tbody tr td:first-child").allInnerTexts();
  expect(ranks[0]).toBe("1st");
  const jump = page.getByRole("link", { name: /Props vs/ }).first();
  const abbr = (await jump.innerText()).replace("Props vs ", "");
  await jump.click();
  await expect(page).toHaveURL(new RegExp(`opp=${abbr}`));
  await expect(page.getByRole("link", { name: `Opponent: ${abbr} ✕` })).toBeVisible();
});
