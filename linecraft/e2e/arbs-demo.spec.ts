// The arbitrage scanner renders in demo mode over the fictional books.
import { test, expect } from "./fixtures.ts";

test("arbs page works on demo data and is in the nav", async ({ page, axe }) => {
  await page.goto("/props");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Arbs" }).click();
  await expect(page).toHaveURL(/\/arbs/);
  await expect(page.getByRole("heading", { name: "Arbitrage scanner" })).toBeVisible();
  await expect(page.getByText(/Demo prices from fictional books/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Before you stake" })).toBeVisible();
  await axe();
});
