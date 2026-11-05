import { execSync } from "node:child_process";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://fantasy:fantasy@localhost:5432/fantasy";

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};

export default function globalSetup() {
  execSync("pnpm db:migrate", { env, stdio: "inherit" });
  execSync("pnpm db:seed", { env, stdio: "inherit" });
  execSync("pnpm db:seed-admin", { env, stdio: "inherit" });
}
