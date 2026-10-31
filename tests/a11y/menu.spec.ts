import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Every /menu state from SPEC.md §14 "States", checked with axe (WCAG 2.2 AA
 * rule set) at both widths the spec names. `/api/menu-scan` is mocked; the
 * real client-side image preparation runs on a fixture photo.
 */

const WIDTHS = [320, 390] as const;
const PHOTO = "data/menu-fixtures/01-ja-renoir-coffee.jpg";
const fixture = (name: string) =>
  JSON.parse(readFileSync(`data/menu-fixtures/${name}.expected.json`, "utf8"));
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function choosePhoto(page: Page) {
  await page.getByLabel("Choose photo").setInputFiles(PHOTO);
}

// Next's route announcer is also role="alert"; the scanner's message is the other one.
const scanAlert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

function mockScan(page: Page, status: number, body: unknown) {
  return page.route("**/api/menu-scan", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

const ERRORS: [string, number, string][] = [
  ["not-a-menu", 422, "not_a_menu"],
  ["too-large", 413, "too_large"],
  ["throttled", 429, "rate_limited"],
  ["upstream", 502, "upstream"],
  ["signed-out", 401, "unauthorized"],
];

for (const width of WIDTHS) {
  test.describe(`/menu at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("empty", async ({ page }) => {
      await page.goto("/menu");
      await expect(page.getByLabel("Take photo")).toBeAttached();
      await expectNoViolations(page);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `test-results/menu-empty-${width}.png`, fullPage: true });
    });

    test("loading", async ({ page }) => {
      // Never answers, so the loading state stays up.
      await page.route("**/api/menu-scan", () => {});
      await page.goto("/menu");
      await choosePhoto(page);
      await expect(page.getByRole("status").filter({ hasText: "Reading your menu" })).toBeVisible();
      await expectNoViolations(page);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `test-results/menu-loading-${width}.png`, fullPage: true });
    });

    test("result with options (Renoir)", async ({ page }) => {
      await mockScan(page, 200, { scan: fixture("01-ja-renoir-coffee") });
      await page.goto("/menu");
      await choosePhoto(page);
      await expect(page.getByRole("heading", { name: "Your menu" })).toBeFocused();
      await expect(page.getByRole("columnheader", { name: "Option" })).toBeVisible();
      await expectNoViolations(page);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `test-results/menu-result-${width}.png`, fullPage: true });
    });

    test("result without options hides the Option column", async ({ page }) => {
      await mockScan(page, 200, { scan: fixture("07-it-primi") });
      await page.goto("/menu");
      await choosePhoto(page);
      await expect(page.getByRole("heading", { name: "Your menu" })).toBeFocused();
      await expect(page.getByRole("columnheader", { name: "Option" })).toHaveCount(0);
      await expectNoViolations(page);
      await expectNoHorizontalScroll(page);
    });

    for (const [name, status, code] of ERRORS) {
      test(`error: ${name}`, async ({ page }) => {
        await mockScan(page, status, { error: { code, message: "mocked" } });
        await page.goto("/menu");
        await choosePhoto(page);
        if (status === 401) {
          await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
        } else {
          await expect(scanAlert(page)).toBeFocused();
        }
        await expectNoViolations(page);
        await expectNoHorizontalScroll(page);
        await page.screenshot({ path: `test-results/menu-${name}-${width}.png`, fullPage: true });
      });
    }

    test("offline", async ({ page, context }) => {
      await page.goto("/menu");
      await context.setOffline(true);
      await choosePhoto(page);
      await expect(scanAlert(page)).toContainText("offline");
      await expectNoViolations(page);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `test-results/menu-offline-${width}.png`, fullPage: true });
    });
  });
}

// SPEC.md §14: reflow at 320 px with text at 200%. Type is rem-based, so
// doubling the root font size is the text-zoom equivalent.
test.describe("/menu at 320px, 200% text", () => {
  test.use({ viewport: { width: 320, height: 800 } });

  test("result reflows with nothing clipped", async ({ page }) => {
    await mockScan(page, 200, { scan: fixture("01-ja-renoir-coffee") });
    await page.goto("/menu");
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await choosePhoto(page);
    await expect(page.getByRole("heading", { name: "Your menu" })).toBeFocused();
    await expectNoHorizontalScroll(page);
    await expectNoViolations(page);
    await page.screenshot({ path: "test-results/menu-result-320-zoom200.png", fullPage: true });
  });
});
