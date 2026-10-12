import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Every spec fails on a console error or a 5xx, and can run an axe scan.
export const test = base.extend<{ axe: () => Promise<void>; pro: () => Promise<void> }>({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    // 4xx responses log a browser "Failed to load resource" line; tests assert on status codes instead
    page.on("console", (m) => { if (m.type() === "error" && !/status of 4\d\d/.test(m.text())) problems.push(`console: ${m.text()}`); });
    page.on("response", (r) => { if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`); });
    await use(page);
    expect(problems, problems.join("\n")).toEqual([]);
  },
  axe: async ({ page }, use) => {
    await use(async () => {
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
    });
  },
  pro: async ({ context, baseURL }, use) => {
    await use(async () => { await context.addCookies([{ name: "lc_plan", value: "pro", url: baseURL! }]); });
  },
});
export { expect };
