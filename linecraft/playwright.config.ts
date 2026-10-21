import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testIgnore: ["live/**"],
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: { command: "npm run build && npx next start -p 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI, timeout: 240_000,
    // demo mode: blank the key so one in the shell doesn't switch this suite to live odds (and spend quota)
    env: { ODDS_API_KEY: "" } },
});
