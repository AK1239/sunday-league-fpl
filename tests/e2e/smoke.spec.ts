import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home page renders league hub", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Mkate Champions League/i }),
  ).toBeVisible();
});

test("standings page renders", async ({ page }) => {
  await page.goto("/table");
  await expect(
    page.getByRole("heading", { level: 1, name: "Standings" }),
  ).toBeVisible();
});

test("player profile renders", async ({ page }) => {
  await page.goto("/players/garnacho");
  await expect(
    page.getByRole("heading", { level: 1, name: "Garnacho" }),
  ).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());
  const body = await response.json();
  expect(body).toHaveProperty("status");
});

test("home and standings have no serious accessibility violations", async ({
  page,
}) => {
  for (const path of ["/", "/table"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      ),
    ).toEqual([]);
  }
});
