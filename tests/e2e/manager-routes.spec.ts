import { expect, test } from "@playwright/test";
import {
  assertHealthyPage,
  attachPageDiagnostics,
  gotoHealthy,
  loginAsManager,
} from "./helpers";

test.describe("manager auth and /my routes", () => {
  test("unauthenticated /my redirects to login", async ({ page }) => {
    await page.goto("/my");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login reaches my team without blocking route overlay", async ({
    page,
  }) => {
    const assertDiagnostics = attachPageDiagnostics(page);
    await loginAsManager(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "My Team" }),
    ).toBeVisible();
    await assertDiagnostics("my team");
  });

  test("my subnav pages load without prerender errors", async ({ page }) => {
    const assertDiagnostics = attachPageDiagnostics(page);
    await loginAsManager(page);

    const routes: { path: string; heading: RegExp | string; level?: 1 | 2 }[] = [
      { path: "/my", heading: "My Team", level: 1 },
      { path: "/my/points", heading: "My Points", level: 1 },
      { path: "/my/captain", heading: /Captain performance/i, level: 1 },
      { path: "/my/history", heading: /Gameweek teams/i, level: 1 },
      {
        path: "/pick",
        heading: /Pick Team|No gameweek open for picks/i,
        level: 2,
      },
    ];

    for (const { path, heading, level = 1 } of routes) {
      await gotoHealthy(page, path);
      await expect(
        page.getByRole("heading", { level, name: heading }),
      ).toBeVisible();
      await assertDiagnostics(path);
    }
  });

  test("gameweek points detail route loads when published GWs exist", async ({
    page,
  }) => {
    const assertDiagnostics = attachPageDiagnostics(page);
    await loginAsManager(page);
    await gotoHealthy(page, "/my/points");

    const detailLink = page.locator('a[href^="/my/points/"]').first();
    const count = await detailLink.count();
    test.skip(count === 0, "Seed has no published gameweeks with links");

    await detailLink.click();
    await page.waitForURL("**/my/points/**");
    await assertHealthyPage(page, "my points detail");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertDiagnostics("my points detail");
  });
});
