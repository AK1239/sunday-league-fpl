import { expect, type Page } from "@playwright/test";

export const managerCredentials = {
  email:
    process.env.E2E_MANAGER_EMAIL ?? process.env.ADMIN_EMAIL ?? "ci@mkate.test",
  password:
    process.env.E2E_MANAGER_PASSWORD ??
    process.env.ADMIN_PASSWORD ??
    "ci-password-12",
};

/** Next.js dev overlay / prerender failure copy we want E2E to catch. */
const UNHEALTHY_PAGE_PATTERNS = [
  /Blocking Route/i,
  /encountered uncached data during prerendering/i,
  /encountered runtime data during prerendering/i,
  /encountered the unstable value/i,
  /Application error: a server-side exception has occurred/i,
  /Internal Server Error/i,
];

export function attachPageDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("eval() is not supported")) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return async (label: string) => {
    expect(pageErrors, `${label}: uncaught page errors`).toEqual([]);
    expect(consoleErrors, `${label}: console errors`).toEqual([]);
  };
}

export async function assertHealthyPage(page: Page, label: string) {
  const bodyText = await page.locator("body").innerText();
  for (const pattern of UNHEALTHY_PAGE_PATTERNS) {
    expect(bodyText, `${label}: ${pattern}`).not.toMatch(pattern);
  }
}

export async function gotoHealthy(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `${path} should return 2xx`).toBeTruthy();
  await assertHealthyPage(page, path);
}

export async function loginAsManager(page: Page) {
  await gotoHealthy(page, "/login");
  await page.locator('input[name="email"]').fill(managerCredentials.email);
  await page
    .locator('input[name="password"]')
    .fill(managerCredentials.password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL("**/my", { timeout: 15_000 });
  await assertHealthyPage(page, "/my after login");
}
