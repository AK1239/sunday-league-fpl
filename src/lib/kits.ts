/**
 * Shirt designs per footballer, keyed by lower-cased display name.
 * Anyone not listed gets the neutral kit.
 */
export type KitPattern = "solid" | "stripes" | "band";

export type Kit = {
  label: string;
  body: string;
  /** Secondary colour: stripes / band / sleeve cuffs */
  accent: string;
  /** Collar + trim */
  trim: string;
  pattern: KitPattern;
  /** Optional chest mark, e.g. "RR" */
  mark?: string;
};

export const KITS = {
  neutral: {
    label: "Neutral",
    body: "#64748b",
    accent: "#475569",
    trim: "#e2e8f0",
    pattern: "solid",
  },
  chelsea: {
    label: "Chelsea",
    body: "#034694",
    accent: "#ffffff",
    trim: "#ffffff",
    pattern: "solid",
  },
  liverpool: {
    label: "Liverpool",
    body: "#c8102e",
    accent: "#f6eb61",
    trim: "#f6eb61",
    pattern: "solid",
  },
  manutd: {
    label: "Man United",
    body: "#da291c",
    accent: "#111111",
    trim: "#111111",
    pattern: "solid",
  },
  newcastle: {
    label: "Newcastle",
    body: "#f5f5f5",
    accent: "#111111",
    trim: "#111111",
    pattern: "stripes",
  },
  psg: {
    label: "PSG",
    body: "#00265c",
    accent: "#da291c",
    trim: "#ffffff",
    pattern: "band",
  },
  rangerover: {
    label: "Range Rover",
    body: "#1b3a2b",
    accent: "#b8bcc2",
    trim: "#b8bcc2",
    pattern: "solid",
    mark: "RR",
  },
} as const satisfies Record<string, Kit>;

export type KitKey = keyof typeof KITS;

const PLAYER_KIT: Record<string, KitKey> = {
  akil: "chelsea",
  yusuf: "liverpool",
  lolo: "liverpool",
  jeff: "liverpool",
  murti: "newcastle",
  chapati: "psg",
  ali: "rangerover",
  ajam: "manutd",
  michu: "manutd",
  june: "manutd",
  garnacho: "neutral",
  spana: "neutral",
  alaqmar: "neutral",
};

export function kitKeyForPlayer(displayName: string): KitKey {
  return PLAYER_KIT[displayName.trim().toLowerCase()] ?? "neutral";
}

export function kitForPlayer(displayName: string): Kit {
  return KITS[kitKeyForPlayer(displayName)];
}
