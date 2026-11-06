import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  assertHealthyPage,
  attachPageDiagnostics,
  loginAsManager,
} from "./helpers";

const transfersE2e = process.env.E2E_TRANSFERS === "1";

test.describe("transfers UI", () => {
  test.skip(
    !transfersE2e,
    "Set E2E_TRANSFERS=1 and run scripts/e2e-prepare-transfers.ts",
  );

  test("transfers screen loads and passes axe", async ({ page }) => {
    const assertDiagnostics = attachPageDiagnostics(page);
    await loginAsManager(page);
    await page.goto("/pick", { waitUntil: "domcontentloaded" });
    await assertHealthyPage(page, "/pick");

    await expect(
      page.getByRole("heading", { level: 1, name: /Transfers|Pick Team/i }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .exclude("[data-sonner-toaster]")
      .analyze();
    expect(results.violations, "axe on /pick").toEqual([]);

    await assertDiagnostics("/pick transfers");
  });

  test("summary strip is visible in transfer mode", async ({ page }) => {
    test.skip(!transfersE2e);
    await loginAsManager(page);
    await page.goto("/pick");
    const transfersHeading = page.getByRole("heading", {
      level: 1,
      name: "Transfers",
    });
    if ((await transfersHeading.count()) === 0) {
      test.skip(true, "Transfer mode not active for this user/GW");
    }
    await expect(page.getByText(/Free available/i)).toBeVisible();
    await expect(page.getByText(/Made/i).first()).toBeVisible();
  });
});
