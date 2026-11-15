import { describe, expect, it } from "vitest";
import { mergeParsedLines, parsePlayerResults } from "./parse-player-results";

const NAMES = [
  "Ajam",
  "Akil",
  "Alaqmar",
  "Ali",
  "Chapati",
  "Dula",
  "Dulli",
  "Garnacho",
  "June",
  "Lolo",
  "Michu",
  "Murti",
  "Nasir",
  "Soldier",
  "Spana",
  "Yusuf",
];
const players = NAMES.map((n) => ({ id: n.toLowerCase(), displayName: n }));

const SAMPLE = `Dula - 6 goals, 1 missed penalty
Michu - 1 missed penalty,1 penalty save
June - 1 penalty save
Akil - 2 goals
Duli - 2 goals, 1 assist, 1 penalty miss
Murt - 1 assist
Yusuf - 2 penalty save, 1 goal, 1 assists
Lolo - 1 goal, 2 assists
Ajam - 1 penalty miss, 1 assist
Chapati - 1 goal, 1 assist`;

describe("parsePlayerResults", () => {
  const { lines } = parsePlayerResults(SAMPLE, players);
  const by = (id: string) => lines.find((l) => l.playerId === id)!;

  it("matches every line with nothing unparsed", () => {
    expect(lines).toHaveLength(10);
    for (const l of lines) {
      expect(l.playerId).not.toBeNull();
      expect(l.unparsed).toEqual([]);
    }
  });

  it("fuzzy-matches nicknames/typos to the right player", () => {
    expect(by("dulli").name).toBe("Duli");
    expect(by("murti").name).toBe("Murt");
    expect(by("dula").stats.goals).toBe(6);
  });

  it("parses singular/plural, missing spaces and synonyms", () => {
    expect(by("michu").stats).toMatchObject({
      penaltiesMissed: 1,
      penaltiesSaved: 1,
    });
    expect(by("yusuf").stats).toMatchObject({
      penaltiesSaved: 2,
      goals: 1,
      assists: 1,
    });
    expect(by("dulli").stats).toMatchObject({
      goals: 2,
      assists: 1,
      penaltiesMissed: 1,
    });
    expect(by("lolo").stats).toMatchObject({ goals: 1, assists: 2 });
  });

  it("handles missing commas, word numbers, default qty and extra kinds", () => {
    const r = parsePlayerResults(
      "Akil: 2 goals 1 assist\nAli - goal, two own goals, hat-trick, clean sheet, penalty goal x2, mvp",
      players,
    ).lines;
    expect(r[0]!.stats).toMatchObject({ goals: 2, assists: 1 });
    expect(r[1]!.stats).toMatchObject({
      goals: 1,
      ownGoals: 2,
      hatTricks: 1,
      cleanSheets: 1,
      penaltyGoals: 2,
      mvps: 1,
    });
    expect(r[1]!.unparsed).toEqual([]);
  });

  it("flags unknown names and unreadable tokens", () => {
    const r = parsePlayerResults(
      "Zzzzz - 1 goal\nAkil - 2 goals, banana",
      players,
    ).lines;
    expect(r[0]!.playerId).toBeNull();
    expect(r[1]!.playerId).toBe("akil");
    expect(r[1]!.unparsed).toEqual(["banana"]);
  });

  it("flags ambiguous names instead of guessing", () => {
    const r = parsePlayerResults("Du - 1 goal", players).lines[0]!;
    expect(r.playerId).toBeNull();
    expect(r.ambiguousIds.sort()).toEqual(["dula", "dulli"]);
  });

  it("merges repeated players", () => {
    const { lines: l } = parsePlayerResults(
      "Akil - 1 goal\nakil - 1 goal, 1 assist",
      players,
    );
    expect(mergeParsedLines(l).get("akil")).toMatchObject({
      goals: 2,
      assists: 1,
    });
  });
});
