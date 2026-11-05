import { checkDatabase } from "@/server/db";

export async function GET() {
  const database = await checkDatabase();
  return Response.json(
    { status: database ? "ok" : "degraded", database },
    { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
