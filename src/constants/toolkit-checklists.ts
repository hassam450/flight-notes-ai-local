export type ChecklistSectionId =
  | "preflight"
  | "before-start"
  | "run-up"
  | "before-takeoff"
  | "emergency";

export type ChecklistSection = {
  id: ChecklistSectionId;
  title: string;
  subtitle: string;
  items: string[];
};

export const TOOLKIT_CHECKLISTS: ChecklistSection[] = [
  {
    id: "preflight",
    title: "Preflight",
    subtitle: "Aircraft documents, controls, fuel, and walk-around.",
    items: [
      "AROW documents aboard and current",
      "Control lock removed and ignition off",
      "Fuel quantity visually confirmed and caps secure",
      "Oil level checked and cowl secured",
      "Flight controls move freely and correctly",
      "Tires, brakes, and tie-downs inspected",
    ],
  },
  {
    id: "before-start",
    title: "Before Start",
    subtitle: "Cabin secure and engine start setup.",
    items: [
      "Seats, seatbelts, and shoulder harnesses secure",
      "Circuit breakers checked in",
      "Fuel selector set as required",
      "Brakes set and area clear",
      "Beacon on and avionics off",
      "Mixture rich and throttle cracked",
    ],
  },
  {
    id: "run-up",
    title: "Run-Up",
    subtitle: "Engine, flight controls, and instruments.",
    items: [
      "Parking brake set and nose into wind if practical",
      "Engine instruments in the green",
      "Magneto check completed within limits",
      "Carb heat / alternate air checked",
      "Vacuum, suction, and ammeter checked",
      "Flight instruments set and cross-checked",
    ],
  },
  {
    id: "before-takeoff",
    title: "Before Takeoff",
    subtitle: "Final departure checks and brief.",
    items: [
      "Flaps set for departure",
      "Trim set for takeoff",
      "Doors and windows latched",
      "Flight controls free and correct",
      "Takeoff briefing complete",
      "Transponder, lights, and timer set",
    ],
  },
  {
    id: "emergency",
    title: "Emergency",
    subtitle: "Immediate-action memory prompts.",
    items: [
      "Airspeed maintain best glide",
      "Landing area identify and commit",
      "Fuel selector, mixture, and ignition check",
      "Declare emergency and squawk 7700 if time permits",
      "Seatbelts secure and cabin brief complete",
      "Master and fuel off before touchdown when required",
    ],
  },
];
