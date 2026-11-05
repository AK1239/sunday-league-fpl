import { defineConfig, devices } from "@playwright/test";

const port = 3100;

const e2eEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://fantasy:fantasy@localhost:5432/fantasy",
  SESSION_SECRET:
    process.env.SESSION_SECRET ??
    "ci-session-secret-minimum-32-characters",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "ci@mkate.test",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "ci-password-12",
  NODE_ENV: "production" as const,
};

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `bash scripts/e2e-server.sh`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: e2eEnv,
  },
});
