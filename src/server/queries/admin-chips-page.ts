import { asc, eq } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { matchdays, seasons, users } from "@/server/db/schema";
import { CHIP_REGISTRY, CHIP_CODES } from "@/server/chips/registry";
import {
  isSeasonChipConfigLocked,
  listChipUsageForSeason,
  loadSeasonChipsAdmin,
  type ChipUsageRow,
  type SeasonChipAdminRow,
} from "@/server/domain/admin-chips";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";

export type AdminChipsPageData = {
  seasonId: string;
  seasonName: string;
  chipsEnabled: boolean;
  configLocked: boolean;
  seasonChips: SeasonChipAdminRow[];
  usage: ChipUsageRow[];
  matchdays: { id: string; number: number; status: string }[];
  managers: { id: string; displayName: string }[];
  chipOptions: { code: string; label: string }[];
};

export async function getAdminChipsPageData(
  db: AppDb,
  filters?: {
    chipCode?: string;
    matchdayId?: string;
    managerId?: string;
    status?: "active" | "void";
  },
): Promise<AdminChipsPageData | null> {
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return null;

  const [seasonMeta] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!seasonMeta) return null;

  const seasonChips = await loadSeasonChipsAdmin(db, seasonId);
  const configLocked = await isSeasonChipConfigLocked(db, seasonId);

  const usage = await listChipUsageForSeason(db, seasonId, filters);

  const mdRows = await db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(eq(matchdays.seasonId, seasonId))
    .orderBy(asc(matchdays.number));

  const managerRows = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(eq(users.role, "manager"))
    .orderBy(asc(users.displayName));

  return {
    seasonId,
    seasonName: seasonMeta.name,
    chipsEnabled: seasonChips.length > 0,
    configLocked,
    seasonChips,
    usage,
    matchdays: mdRows,
    managers: managerRows,
    chipOptions: CHIP_CODES.map((code) => ({
      code,
      label: CHIP_REGISTRY[code].label,
    })),
  };
}
