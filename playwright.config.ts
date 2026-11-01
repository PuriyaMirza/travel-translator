import { defineConfig } from "@playwright/test";

/**
 * Automated accessibility checks (`npm run test:a11y`, SPEC.md §14). Runs axe
 * against every /menu state at 320 and 390 px with the scan route mocked, so
 * no model call, sign-in or database is needed. Screenshots land in
 * test-results/ (git-ignored).
 *
 * Runs against a production build, not `next dev`: it tests what ships, and
 * from Next 16.4 the dev server's reload behaviour broke the offline test
 * (dev failed it every run; `next start` passed 5/5). It also keeps
 * `next dev` from writing its agent-instruction block into CLAUDE.md.
 */
export default defineConfig({
  testDir: "tests/a11y",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
