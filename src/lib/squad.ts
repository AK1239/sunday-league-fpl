/** Registered Mkate Champions League squad (source of truth for names). */
export const SQUAD_PLAYERS = [
  { id: "akil", displayName: "Akil" },
  { id: "murti", displayName: "Murti" },
  { id: "yusuf", displayName: "Yusuf" },
  { id: "lolo", displayName: "Lolo" },
  { id: "ajam", displayName: "Ajam" },
  { id: "chapati", displayName: "Chapati" },
  { id: "june", displayName: "June" },
  { id: "ali", displayName: "Ali" },
  { id: "jeff", displayName: "Jeff" },
  { id: "alaqmar", displayName: "Alaqmar" },
  { id: "dula", displayName: "Dula" },
  { id: "garnacho", displayName: "Garnacho" },
  { id: "michu", displayName: "Michu" },
  { id: "spana", displayName: "Spana" },
] as const;

export type SquadPlayerId = (typeof SQUAD_PLAYERS)[number]["id"];

export const SQUAD_DISPLAY_NAMES = SQUAD_PLAYERS.map((p) => p.displayName);
