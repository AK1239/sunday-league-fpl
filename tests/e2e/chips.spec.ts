import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  assertHealthyPage,
  attachPageDiagnostics,
  loginAsManager,
} from "./helpers";

const chipsE2e = process.env.E2E_CHIPS === "1";

test.describe("chips UI", () => {
  test.skip(
    !chipsE2e,
    "Set E2E_CHIPS=1 and run pnpm e2e:prepare-chips",
  );

  test("chips tab loads and passes axe", async ({ page }) => {
    const assertDiagnostics = attachPageDiagnostics(page);
    await loginAsManager(page);
    await page.goto("/pick", { waitUntil: "domcontentloaded" });
    await assertHealthyPage(page, "/pick");

    const transfersHeading = page.getByRole("heading", {
      level: 1,
      name: "Transfers",
    });
    if ((await transfersHeading.count()) === 0) {
      test.skip(true, "Transfer mode not active — run e2e-prepare-chips");
    }

    await page.getByRole("button", { name: "Chips" }).click();
    await expect(page.getByText(/One chip per gameweek/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Triple Captain" }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .exclude('[data-sonner-toaster]')
      .analyze();
    expect(results.violations, "axe on chips tab").toEqual([]);

    await assertDiagnostics("/pick chips tab");
  });

  test("triple captain drawer passes axe", async ({ page }) => {
    test.skip(!chipsE2e);
    await loginAsManager(page);
    await page.goto("/pick");
    const transfersHeading = page.getByRole("heading", {
      level: 1,
      name: "Transfers",
    });
    if ((await transfersHeading.count()) === 0) {
      test.skip(true, "Transfer mode not active");
    }

    await page.getByRole("button", { name: "Chips" }).click();
    await page.getByRole("button", { name: "Triple Captain" }).click();
    await expect(
      page.getByRole("dialog").getByText(/Hold to activate Triple Captain/i),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .exclude('[data-sonner-toaster]')
      .analyze();
    expect(results.violations, "axe on chip drawer").toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
