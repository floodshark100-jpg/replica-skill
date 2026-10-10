import { test, expect } from "./fixtures.ts";

test("F05-H1 save, see on the slip, remove, clear; survives reload", async ({ page, axe }) => {
  await page.goto("/slip");
  await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
  await page.goto("/props?sport=nba");
  const save = page.getByRole("button", { name: /^Save / });
  await save.nth(0).click();
  await save.nth(0).click(); // the first button is now "Remove", so this saves the second row
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(2);
  await page.getByRole("link", { name: "Saved" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await axe();
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: /^Remove / }).first().click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
});

test("F05-E1 double click on save leaves one entry", async ({ page }) => {
  await page.goto("/props?sport=nhl");
  await page.getByRole("button", { name: /^Save / }).first().dblclick();
  await page.goto("/slip");
  // a double click toggles twice: saved then removed, never two copies
  expect(await page.locator("tbody tr").count()).toBeLessThanOrEqual(1);
});

test("F05-E2 corrupt storage shows the empty state instead of crashing", async ({ page }) => {
  await page.goto("/slip");
  await page.evaluate(() => localStorage.setItem("lc_saved", "{not json"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
});

test("F06-H1 upgrade unlocks every game, cancel locks again", async ({ page, axe }) => {
  await page.goto("/pricing");
  await axe();
  await page.getByRole("button", { name: "Start free trial" }).click();
  await expect(page).toHaveURL(/\/props/);
  await expect(page.getByRole("link", { name: /Plan: pro/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /more props in/ })).toHaveCount(0);
  await page.goto("/account");
  await page.getByRole("button", { name: "Cancel Pro" }).click();
  await expect(page.getByRole("heading", { name: "Plan: Free" })).toBeVisible();
});

test("keyboard only: skip link and tab to the first prop", async ({ page }) => {
  await page.goto("/props?sport=nba");
  // wait for hydration: a keypress mid-hydration can be dropped (see replica/bugs.md, to check)
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.closest(".player-cell") !== null)) break;
  }
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/player\//);
});

test("landing has no axe violations and links to the board", async ({ page, axe }) => {
  await page.goto("/");
  await axe();
  await page.getByRole("link", { name: "Open today's props" }).click();
  await expect(page).toHaveURL(/\/props/);
});
