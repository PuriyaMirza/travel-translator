import { defineConfig } from "@playwright/test";

/**
 * Automated accessibility checks (`npm run test:a11y`, SPEC.md §14). Runs axe
 * against every /menu state at 320 and 390 px with the scan route mocked, so
 * no model call, sign-in or database is needed. Screenshots land in
 * test-results/ (git-ignored).
 */
export default defineConfig({
  testDir: "tests/a11y",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
