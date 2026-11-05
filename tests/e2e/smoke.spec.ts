import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_PATHS = [
  "/",
  "/table",
  "/players",
  "/matchdays",
  "/rules",
  "/awards",
  "/login",
] as const;

test("home page renders league hub", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Mkate Champions League/i }),
  ).toBeVisible();
});

test("manager table page renders", async ({ page }) => {
  await page.goto("/table");
  await expect(
    page.getByRole("heading", { level: 1, name: "Table" }),
  ).toBeVisible();
});

test("player standings page renders", async ({ page }) => {
  await page.goto("/players");
  await expect(
    page.getByRole("heading", { level: 1, name: "Player standings" }),
  ).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());
  const body = await response.json();
  expect(body).toHaveProperty("status");
});

test("core public routes load without error", async ({ page }) => {
  for (const path of PUBLIC_PATHS) {
    const response = await page.goto(path);
    expect(response?.ok(), `${path} should return 2xx`).toBeTruthy();
    await expect(page.locator("body")).not.toBeEmpty();
  }
});

test("key public pages have no serious accessibility violations", async ({
  page,
}) => {
  for (const path of ["/", "/table", "/players", "/login"] as const) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      ),
      `${path} a11y violations`,
    ).toEqual([]);
  }
});
