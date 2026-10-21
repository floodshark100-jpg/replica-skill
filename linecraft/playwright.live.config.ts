import { defineConfig, devices } from "@playwright/test";

// Live mode against a local mock of The Odds API. `npm run e2e:live`
export default defineConfig({
  testDir: "e2e/live",
  reporter: "list",
  use: {
    baseURL: "http://localhost:3101",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: [
    { command: "node e2e/mock-odds-api.ts 3201", port: 3201, reuseExistingServer: false },
    {
      command: "npm run build && npx next start -p 3101",
      url: "http://localhost:3101",
      reuseExistingServer: false,
      timeout: 240_000,
      env: { ODDS_API_KEY: "e2e-key", ODDS_API_BASE_URL: "http://localhost:3201", ODDS_API_TTL_SECONDS: "60" },
    },
    // the same build behind the password gate (e2e/live/access.spec.ts); started after the build above
    {
      command: "npx next start -p 3102",
      url: "http://localhost:3102/api/arbs?sport=nba",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ODDS_API_KEY: "e2e-key", ODDS_API_BASE_URL: "http://localhost:3201", ACCESS_PASSWORD: "e2e-pass" },
    },
  ],
});
