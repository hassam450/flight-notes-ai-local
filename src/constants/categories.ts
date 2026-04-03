export const NOTE_CATEGORIES = [
  "PPL",
  "Instrument",
  "Commercial",
  "Multi-Engine",
  "CFI",
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];
