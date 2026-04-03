/**
 * Study topics and their metadata for the Tutor / Quiz system.
 */

export type StudyTopic = {
    id: string;
    label: string;
    icon: string; // MaterialIcons name
    color: string;
    bgColor: string;
};

export const STUDY_TOPICS: StudyTopic[] = [
    {
        id: "weather-theory",
        label: "Weather Theory",
        icon: "cloud",
        color: "#3b82f6",
        bgColor: "rgba(59,130,246,0.1)",
    },
    {
        id: "airspace",
        label: "Airspace",
        icon: "radar",
        color: "#10b981",
        bgColor: "rgba(16,185,129,0.1)",
    },
    {
        id: "emergency-procedures",
        label: "Emergency Proc.",
        icon: "warning",
        color: "#f59e0b",
        bgColor: "rgba(245,158,11,0.1)",
    },
    {
        id: "navigation",
        label: "Navigation",
        icon: "explore",
        color: "#a855f7",
        bgColor: "rgba(168,85,247,0.1)",
    },
    {
        id: "regulations",
        label: "Regulations",
        icon: "gavel",
        color: "#ef4444",
        bgColor: "rgba(239,68,68,0.1)",
    },
    {
        id: "aerodynamics",
        label: "Aerodynamics",
        icon: "flight",
        color: "#06b6d4",
        bgColor: "rgba(6,182,212,0.1)",
    },
];

/** Available question count options (intervals of 5, max 30) */
export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

/** Default number of questions per quiz */
export const DEFAULT_QUIZ_COUNT = 10;

/** Quiz timer duration in seconds (15 minutes) */
export const QUIZ_TIMER_SECONDS = 15 * 60;
