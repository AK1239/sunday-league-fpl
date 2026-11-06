import "dotenv/config";
import {
  bootstrapTestDatabase,
  readDevDatabaseUrl,
} from "../tests/test-database";

async function main() {
  const devUrl = readDevDatabaseUrl();
  const testUrl = await bootstrapTestDatabase();
  console.log("Test database ready:");
  console.log(`  dev:  ${devUrl}`);
  console.log(`  test: ${testUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
