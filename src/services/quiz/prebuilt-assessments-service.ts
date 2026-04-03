import { NOTE_CATEGORIES } from "@/constants/categories";
import type { QuizQuestion } from "@/types/quiz";

type Category = (typeof NOTE_CATEGORIES)[number];

type McqTemplate = {
  topic: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  reference: string;
};

export type PrebuiltMcqSet = {
  id: string;
  title: string;
  category: Category;
  topic: string;
  questions: QuizQuestion[];
};

export type PrebuiltOralSet = {
  id: string;
  title: string;
  category: Category;
  topic: string;
  questions: string[];
};

const CORE_MCQ_TEMPLATES: McqTemplate[] = [
  {
    topic: "Regulations",
    question: "How recent must a flight review be for acting as PIC (if no exemption applies)?",
    options: ["12 calendar months", "24 calendar months", "18 calendar months", "36 calendar months"],
    correctIndex: 1,
    explanation: "A flight review is required every 24 calendar months.",
    reference: "14 CFR 61.56",
  },
  {
    topic: "Regulations",
    question: "To carry passengers during the day, how many takeoffs and landings are required in the preceding 90 days?",
    options: ["1", "2", "3", "5"],
    correctIndex: 2,
    explanation: "Passenger currency requires three takeoffs and landings in same category/class.",
    reference: "14 CFR 61.57",
  },
  {
    topic: "Regulations",
    question: "Minimum fuel for VFR daytime flight requires enough fuel to fly to destination and then for at least:",
    options: ["20 minutes", "30 minutes", "45 minutes", "60 minutes"],
    correctIndex: 1,
    explanation: "VFR day reserve is 30 minutes at normal cruise.",
    reference: "14 CFR 91.151",
  },
  {
    topic: "Regulations",
    question: "Which authority determines whether an aircraft is airworthy before flight?",
    options: ["Mechanic only", "ATC", "PIC", "Dispatcher"],
    correctIndex: 2,
    explanation: "PIC is responsible for determining airworthiness before departure.",
    reference: "14 CFR 91.7",
  },
  {
    topic: "Regulations",
    question: "When is a transponder generally required in U.S. airspace?",
    options: ["Only inside Class B", "Only at night", "In Mode C veil and specified controlled airspace", "Never for VFR"],
    correctIndex: 2,
    explanation: "Mode C transponder is required in listed airspace including Mode C veil areas.",
    reference: "14 CFR 91.215",
  },
  {
    topic: "Weather Theory",
    question: "A temperature and dew point spread that is narrowing indicates:",
    options: ["Lower humidity", "Possible cloud/fog formation", "Guaranteed clear skies", "Strong tailwind"],
    correctIndex: 1,
    explanation: "As spread narrows, relative humidity rises and saturation is more likely.",
    reference: "PHAK Chapter 12",
  },
  {
    topic: "Weather Theory",
    question: "Which cloud type is most associated with severe icing, turbulence, and thunderstorms?",
    options: ["Cirrus", "Cumulonimbus", "Stratus", "Altostratus"],
    correctIndex: 1,
    explanation: "Cumulonimbus clouds are convective and can contain severe hazards.",
    reference: "AIM 7-1-29",
  },
  {
    topic: "Weather Theory",
    question: "A METAR wind entry of 24015G25KT means:",
    options: ["Wind from 240 magnetic at 15 knots with gusts to 25", "Wind to 240 true at 15 knots steady", "Variable wind averaging 25", "Calm wind with occasional 25-knot gusts"],
    correctIndex: 0,
    explanation: "METAR winds are reported as direction FROM and speed in knots with gust value.",
    reference: "AC 00-45",
  },
  {
    topic: "Weather Theory",
    question: "What weather product is best for observing precipitation movement trends?",
    options: ["Winds aloft forecast", "Radar mosaic/echoes", "PIREP text only", "NOTAM summary"],
    correctIndex: 1,
    explanation: "Radar products show location and movement of precipitation echoes.",
    reference: "AIM 7-1-8",
  },
  {
    topic: "Weather Theory",
    question: "Frontal passage from a cold front is commonly associated with:",
    options: ["Gradual lifting stratus only", "Shift in wind and possible convective activity", "No pressure change", "Immediate fog dissipation always"],
    correctIndex: 1,
    explanation: "Cold fronts often produce wind shift, instability, and potential thunderstorms.",
    reference: "PHAK Chapter 12",
  },
  {
    topic: "Airspace",
    question: "What weather minimums apply to basic VFR in Class C airspace below 10,000 MSL?",
    options: ["1 SM and clear of clouds", "3 SM and 500 below/1000 above/2000 horizontal", "5 SM and clear of clouds", "No minimums with ATC contact"],
    correctIndex: 1,
    explanation: "Class C basic VFR follows 3-152 cloud clearance and 3 statute miles visibility.",
    reference: "14 CFR 91.155",
  },
  {
    topic: "Airspace",
    question: "Which statement about Class D entry is correct?",
    options: ["You must receive explicit clearance", "Two-way radio communication must be established", "No communication is required", "Mode C is always mandatory"],
    correctIndex: 1,
    explanation: "Class D requires established two-way communications prior to entry.",
    reference: "14 CFR 91.129",
  },
  {
    topic: "Airspace",
    question: "Special use airspace that may contain hazardous military activity is:",
    options: ["MOA", "Class E", "TRSA", "SFRA"],
    correctIndex: 0,
    explanation: "Military Operations Areas can include high-speed military training.",
    reference: "AIM 3-4-5",
  },
  {
    topic: "Airspace",
    question: "Class G airspace at night in most low-altitude areas requires at least:",
    options: ["1 SM and clear of clouds", "3 SM and cloud clearances", "No visibility minimum", "5 SM only"],
    correctIndex: 1,
    explanation: "At night, most Class G low-altitude areas require 3 SM with cloud clearances.",
    reference: "14 CFR 91.155",
  },
  {
    topic: "Airspace",
    question: "A Prohibited Area on a chart means:",
    options: ["Entry allowed with ATC clearance", "Entry restricted to VFR only", "Flight is prohibited unless specifically authorized", "Military traffic advisory only"],
    correctIndex: 2,
    explanation: "Prohibited Areas are closed to aircraft unless authorized by controlling agency.",
    reference: "AIM 3-4-2",
  },
  {
    topic: "Navigation",
    question: "True course differs from magnetic course by:",
    options: ["Deviation", "Variation", "Compass dip", "Groundspeed"],
    correctIndex: 1,
    explanation: "Variation is the angular difference between true and magnetic north.",
    reference: "PHAK Chapter 16",
  },
  {
    topic: "Navigation",
    question: "If a VOR CDI is centered with a FROM indication on the 180 radial, where are you relative to the station?",
    options: ["North of station", "South of station", "East of station", "Over the station"],
    correctIndex: 1,
    explanation: "The 180 radial extends south from the station.",
    reference: "IFH Chapter 9",
  },
  {
    topic: "Navigation",
    question: "Dead reckoning primarily uses which three inputs?",
    options: ["Heading, time, airspeed", "Altitude, fuel, RPM", "METAR, TAF, PIREP", "Latitude, longitude, pressure altitude"],
    correctIndex: 0,
    explanation: "Dead reckoning projects position from known heading, speed, and elapsed time.",
    reference: "PHAK Chapter 16",
  },
  {
    topic: "Navigation",
    question: "A GPS RAIM warning indicates potential issue with:",
    options: ["Fuel endurance", "Satellite integrity", "Airspeed calibration", "Magnetometer deviation"],
    correctIndex: 1,
    explanation: "RAIM monitors satellite integrity to verify reliable navigation solution.",
    reference: "AIM 1-1-19",
  },
  {
    topic: "Navigation",
    question: "To correct for a right crosswind while tracking a course, the crab angle should be:",
    options: ["Right", "Left", "Zero", "Alternating"],
    correctIndex: 0,
    explanation: "Crab into the wind; right crosswind requires right correction.",
    reference: "PHAK Chapter 16",
  },
  {
    topic: "Emergency Procedures",
    question: "In an engine fire during start, the best immediate action is typically to:",
    options: ["Evacuate instantly with no further action", "Continue cranking to draw flames into engine", "Turn on master and avionics", "Add primer"],
    correctIndex: 1,
    explanation: "Many POHs call for continued cranking to pull flames into the engine intake.",
    reference: "Airplane POH Emergency Procedures",
  },
  {
    topic: "Emergency Procedures",
    question: "If electrical smoke appears in cockpit, first priority is to:",
    options: ["Open side window and continue flight", "Identify and isolate electrical source as checklist directs", "Descend without checklist", "Switch fuel tanks"],
    correctIndex: 1,
    explanation: "Smoke/fire procedures focus on isolating source while maintaining aircraft control.",
    reference: "Airplane POH Emergency Procedures",
  },
  {
    topic: "Emergency Procedures",
    question: "During forced landing planning, the preferred touchdown area generally is:",
    options: ["Downwind runway segment", "Area within gliding distance with best survivability", "Any road with traffic", "Highest terrain nearby"],
    correctIndex: 1,
    explanation: "Select the safest reachable area, balancing wind, terrain, and obstacles.",
    reference: "PHAK Chapter 17",
  },
  {
    topic: "Emergency Procedures",
    question: "When communicating an emergency to ATC, the internationally recognized distress call is:",
    options: ["Pan-pan", "Mayday", "Urgent", "Help"],
    correctIndex: 1,
    explanation: "Mayday denotes grave and imminent danger requiring immediate assistance.",
    reference: "AIM 6-3-1",
  },
  {
    topic: "Emergency Procedures",
    question: "After partial power loss, best glide is still useful because it:",
    options: ["Maximizes fuel flow", "Provides predictable energy management", "Eliminates need for checklist", "Guarantees restart"],
    correctIndex: 1,
    explanation: "Best glide offers known performance while troubleshooting and planning landing options.",
    reference: "PHAK Chapter 17",
  },
  {
    topic: "Performance",
    question: "An increase in aircraft weight will generally:",
    options: ["Reduce stall speed", "Increase takeoff distance", "Improve climb rate", "Reduce landing distance"],
    correctIndex: 1,
    explanation: "Heavier aircraft require more lift and runway distance and often climb worse.",
    reference: "PHAK Chapter 11",
  },
  {
    topic: "Performance",
    question: "A headwind on takeoff usually:",
    options: ["Increases ground roll", "Decreases ground roll", "Has no effect", "Only affects climb rate"],
    correctIndex: 1,
    explanation: "Headwind reduces groundspeed needed to reach liftoff airspeed.",
    reference: "PHAK Chapter 11",
  },
  {
    topic: "Performance",
    question: "Takeoff over a 50-foot obstacle compared with takeoff with no obstacle generally requires:",
    options: ["Shorter total distance", "Longer total distance", "Same total distance", "No runway surface dependence"],
    correctIndex: 1,
    explanation: "Obstacle clearance calculations produce longer required distances.",
    reference: "Airplane POH Performance",
  },
  {
    topic: "Performance",
    question: "Which condition most reduces climb performance?",
    options: ["Low density altitude", "High density altitude", "Cool dry air", "Strong headwind aloft"],
    correctIndex: 1,
    explanation: "High density altitude reduces engine, propeller, and wing performance.",
    reference: "PHAK Chapter 11",
  },
  {
    topic: "Performance",
    question: "Runway slope affects takeoff roll such that an uphill slope will usually:",
    options: ["Shorten roll", "Lengthen roll", "Not change roll", "Only impact landing"],
    correctIndex: 1,
    explanation: "Uphill gradient increases distance needed for acceleration.",
    reference: "FAA-H-8083-25",
  },
  {
    topic: "Human Factors",
    question: "The acronym IMSAFE is primarily used to evaluate:",
    options: ["Aircraft maintenance status", "Pilot personal readiness", "Airspace compliance", "Navigation database currency"],
    correctIndex: 1,
    explanation: "IMSAFE checks illness, medication, stress, alcohol, fatigue, and emotion/eating.",
    reference: "PHAK Chapter 2",
  },
  {
    topic: "Human Factors",
    question: "Hazardous attitude invulnerability can be countered with:",
    options: ["It could happen to me", "Do it quickly", "Follow the crowd", "Take chances"],
    correctIndex: 0,
    explanation: "The antidote for invulnerability is acknowledging risk applies personally.",
    reference: "FAA Risk Management Handbook",
  },
  {
    topic: "Human Factors",
    question: "What is a common symptom of hyperventilation?",
    options: ["Blue fingernails", "Dizziness and tingling", "Tunnel vision only", "Rapid improvement in night vision"],
    correctIndex: 1,
    explanation: "Hyperventilation often causes lightheadedness, tingling, and anxiety.",
    reference: "PHAK Chapter 17",
  },
  {
    topic: "Human Factors",
    question: "To mitigate fatigue risk before flight, the best approach is to:",
    options: ["Use caffeine only", "Delay rest until after arrival", "Ensure adequate sleep and realistic schedule", "Fly lower to stay alert"],
    correctIndex: 2,
    explanation: "Adequate sleep and conservative planning are primary fatigue mitigations.",
    reference: "FAA Aeronautical Decision Making",
  },
  {
    topic: "Human Factors",
    question: "Situational awareness is best described as:",
    options: ["Knowing only current altitude", "Understanding current and future flight state", "Following automation blindly", "Memorizing checklists"],
    correctIndex: 1,
    explanation: "It includes perception, comprehension, and projection of system status.",
    reference: "FAA Risk Management Handbook",
  },
  {
    topic: "Weight and Balance",
    question: "Moving baggage aft typically shifts CG:",
    options: ["Forward", "Aft", "To datum only", "It does not shift CG"],
    correctIndex: 1,
    explanation: "Adding weight behind current CG shifts CG aft.",
    reference: "PHAK Chapter 10",
  },
  {
    topic: "Weight and Balance",
    question: "An aircraft loaded above maximum gross weight will most likely:",
    options: ["Take off sooner", "Have reduced performance margins", "Be more stable in all phases", "Use less runway"],
    correctIndex: 1,
    explanation: "Overweight operation degrades takeoff, climb, and landing performance.",
    reference: "Airplane POH Limitations",
  },
  {
    topic: "Weight and Balance",
    question: "Moment is calculated as:",
    options: ["Weight divided by arm", "Weight times arm", "Arm minus weight", "Weight times volume"],
    correctIndex: 1,
    explanation: "Moment is the rotational force from weight acting at an arm.",
    reference: "PHAK Chapter 10",
  },
  {
    topic: "Weight and Balance",
    question: "A forward CG generally causes:",
    options: ["Lower stall speed and easier flare", "Higher stall speed and reduced elevator authority", "No pitch effect", "Less longitudinal stability"],
    correctIndex: 1,
    explanation: "Forward CG increases stability but can hurt flare and raise stall speed.",
    reference: "PHAK Chapter 10",
  },
  {
    topic: "Weight and Balance",
    question: "Where are official weight and balance limits found for a specific aircraft?",
    options: ["AIM", "POH/AFM", "Sectional chart", "Pilot certificate"],
    correctIndex: 1,
    explanation: "Aircraft-specific limits and loading data are in POH/AFM documentation.",
    reference: "Airplane POH",
  },
  {
    topic: "Airport Operations",
    question: "A runway designation of 27 indicates approximate magnetic heading:",
    options: ["027 degrees", "270 degrees", "207 degrees", "090 degrees"],
    correctIndex: 1,
    explanation: "Runway numbers are magnetic headings rounded to nearest 10 degrees.",
    reference: "AIM 2-3-3",
  },
  {
    topic: "Airport Operations",
    question: "A flashing green light signal from tower to aircraft in flight means:",
    options: ["Cleared to land", "Return for landing", "Airport unsafe, do not land", "Give way and continue circling"],
    correctIndex: 1,
    explanation: "Flashing green to aircraft in flight means return for landing.",
    reference: "AIM 4-3-13",
  },
  {
    topic: "Airport Operations",
    question: "Standard traffic pattern direction is:",
    options: ["Left turns unless charted otherwise", "Right turns always", "Based on wind only", "Pilot preference"],
    correctIndex: 0,
    explanation: "Left traffic is standard unless airport markings/charts specify right traffic.",
    reference: "AIM 4-3-3",
  },
  {
    topic: "Airport Operations",
    question: "A solid double yellow line and dashed double yellow line on taxiway/runway boundary means:",
    options: ["ILS critical area", "Hold short unless cleared to cross", "Taxiway centerline", "Runway closed"],
    correctIndex: 1,
    explanation: "This marking denotes runway holding position; clearance is required to cross toward dashed side.",
    reference: "AIM 2-3-5",
  },
  {
    topic: "Airport Operations",
    question: "When departing a non-towered airport, best practice includes:",
    options: ["No radio use to reduce frequency congestion", "Broadcast intentions and monitor CTAF", "Use only guard frequency", "Rely solely on ADS-B traffic"],
    correctIndex: 1,
    explanation: "Clear CTAF calls and active scanning improve situational awareness for all traffic.",
    reference: "AIM 4-1-9",
  },
  {
    topic: "Aerodynamics",
    question: "Induced drag is greatest when:",
    options: ["Angle of attack is low", "Angle of attack is high at low speed", "Aircraft is in descent", "Flaps are fully retracted"],
    correctIndex: 1,
    explanation: "High angle of attack increases lift vector tilt and induced drag.",
    reference: "PHAK Chapter 5",
  },
  {
    topic: "Aerodynamics",
    question: "Load factor increases in a level turn as bank angle:",
    options: ["Decreases", "Increases", "Stays constant", "Depends only on altitude"],
    correctIndex: 1,
    explanation: "Steeper bank requires more lift, increasing load factor.",
    reference: "PHAK Chapter 5",
  },
  {
    topic: "Aerodynamics",
    question: "Which statement about a spin is correct?",
    options: ["It is a high-speed dive", "It is a stalled condition with yaw", "It occurs only with flaps down", "It cannot occur in coordinated flight"],
    correctIndex: 1,
    explanation: "A spin is an aggravated stall with autorotation due to yaw.",
    reference: "PHAK Chapter 5",
  },
  {
    topic: "Aerodynamics",
    question: "Ground effect during landing flare tends to:",
    options: ["Increase induced drag", "Reduce induced drag", "Eliminate lift", "Cause immediate stall"],
    correctIndex: 1,
    explanation: "Near the surface, wingtip vortices are reduced, lowering induced drag.",
    reference: "PHAK Chapter 5",
  },
  {
    topic: "Aerodynamics",
    question: "The critical angle of attack is determined primarily by:",
    options: ["Aircraft weight", "Wing design and airflow", "Indicated airspeed", "Engine power setting"],
    correctIndex: 1,
    explanation: "Critical angle is an aerodynamic property tied to wing/airflow behavior.",
    reference: "PHAK Chapter 5",
  },
];

function normalizeTopicLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function toCategoryQuestionText(category: Category, text: string) {
  return `[${category}] ${text}`;
}

function filterQuestionsByTopic(questions: QuizQuestion[], topic?: string) {
  if (!topic) return questions;

  const normalized = normalizeTopicLabel(topic);
  const aliases: Record<string, string[]> = {
    "emergency proc": ["emergency procedures"],
  };
  const accepted = new Set<string>([normalized, ...(aliases[normalized] ?? [])]);

  const filtered = questions.filter((question) =>
    accepted.has(normalizeTopicLabel(question.topic)),
  );

  return filtered.length > 0 ? filtered : questions;
}

function createMcqQuestion(
  id: number,
  topic: string,
  question: string,
  options: [string, string, string, string],
  correctIndex: number,
  explanation: string,
  reference: string,
): QuizQuestion {
  return { id, topic, question, options, correctIndex, explanation, reference };
}

function randomSample<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function buildCoreMcqSet(category: Category): PrebuiltMcqSet {
  const questions: QuizQuestion[] = CORE_MCQ_TEMPLATES.map((template, index) =>
    createMcqQuestion(
      index,
      template.topic,
      toCategoryQuestionText(category, template.question),
      template.options,
      template.correctIndex,
      template.explanation,
      template.reference,
    ),
  );

  return {
    id: `mcq-core-${category.toLowerCase()}`,
    title: `${category} Core Knowledge`,
    category,
    topic: "Mixed",
    questions,
  };
}

function buildCoreOralSet(category: Category): PrebuiltOralSet {
  return {
    id: `oral-core-${category.toLowerCase()}`,
    title: `${category} Oral Checkride Prep`,
    category,
    topic: "Mixed",
    questions: [
      `Walk me through your preflight risk assessment for a ${category} flight.`,
      "Explain how you would evaluate weather briefing products before departure.",
      "Describe airspace and equipment requirements for your planned route.",
      "How would you handle an abnormal or emergency event in cruise?",
      "What are your personal minimums and how did you establish them?",
      "What common checkride errors in this category would you actively avoid today?",
    ],
  };
}

const PREBUILT_MCQ_SETS: PrebuiltMcqSet[] = NOTE_CATEGORIES.map((category) => buildCoreMcqSet(category));
const PREBUILT_ORAL_SETS: PrebuiltOralSet[] = NOTE_CATEGORIES.map((category) => buildCoreOralSet(category));

export function listPrebuiltMcqSets(category: string) {
  return PREBUILT_MCQ_SETS.filter((item) => item.category === category);
}

export function listPrebuiltOralSets(category: string) {
  return PREBUILT_ORAL_SETS.filter((item) => item.category === category);
}

export function getPrebuiltMcqQuestions(options: {
  category: string;
  prebuiltSetId?: string;
  topic?: string;
  count?: number;
}) {
  const sets = listPrebuiltMcqSets(options.category);
  const selected = options.prebuiltSetId
    ? sets.find((item) => item.id === options.prebuiltSetId)
    : sets[0];
  if (!selected) return [];
  const topicFiltered = filterQuestionsByTopic(selected.questions, options.topic);
  const count = Math.max(1, Math.min(options.count ?? topicFiltered.length, topicFiltered.length));
  return randomSample(topicFiltered, count);
}

export function getPrebuiltOralQuestions(options: {
  category: string;
  prebuiltSetId?: string;
  topic?: string;
  count?: number;
}) {
  const sets = listPrebuiltOralSets(options.category);
  const selected = options.prebuiltSetId
    ? sets.find((item) => item.id === options.prebuiltSetId)
    : sets[0];
  if (!selected) return [];
  const count = Math.max(1, Math.min(options.count ?? selected.questions.length, selected.questions.length));
  return randomSample(selected.questions, count);
}
