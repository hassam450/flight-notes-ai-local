/**
 * Service for persisting and querying learning sessions.
 * Powers Certification Readiness and Study Topics Mastery on the Tutor screen.
 *
 * Readiness formula:  round(weightedAvg × coverageFactor × confidenceFactor)
 *   - weightedAvg:      exponential-decay weighted mean of session percentages
 *   - coverageFactor:    penalises when not all 6 standard topics are tested
 *   - confidenceFactor:  penalises when session count is low
 *
 * Mastery formula:  recency-weighted average per topic (all 6 always returned)
 */

import { STUDY_TOPICS } from "@/constants/quiz-topics";
import { supabase } from "@/lib/supabase";
import type {
    CategoryReadiness,
    LearningSession,
    LearningSessionInsert,
    TopicMastery,
} from "@/types/learning-session";

// ── Tunable Constants ───────────────────────────────────────────────────────

/** Sessions older than this many days lose half their weight. */
const RECENCY_HALF_LIFE_DAYS = 14;

/** Decay constant: λ = ln(2) / halfLife */
const RECENCY_LAMBDA = Math.LN2 / RECENCY_HALF_LIFE_DAYS;

/** Number of sessions needed for full confidence (1.0). */
const CONFIDENCE_THRESHOLD = 5;

/** Minimum confidence multiplier so new users still see meaningful values. */
const CONFIDENCE_FLOOR = 0.4;

/** Minimum coverage multiplier so few-topic sessions aren't crushed. */
const COVERAGE_FLOOR = 0.3;

/** Canonical lowercase labels for the 6 standard study topics. */
const STANDARD_TOPIC_LABELS = new Set(
    STUDY_TOPICS.map((t) => t.label.toLowerCase()),
);

// ── Helper Types ────────────────────────────────────────────────────────────

type TopicEntry = { topic: string; percentage: number };

// ── Pure Computation Helpers ────────────────────────────────────────────────

/**
 * Exponential decay weight based on session age.
 * Today ≈ 1.0, 14 days ago ≈ 0.5, 30 days ago ≈ 0.23.
 */
export function computeRecencyWeight(createdAt: string, now: Date): number {
    const sessionDate = new Date(createdAt);
    const daysDiff =
        (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-RECENCY_LAMBDA * Math.max(0, daysDiff));
}

/**
 * Weighted arithmetic mean. Returns 0 when no items.
 */
export function computeWeightedAverage(
    items: { value: number; weight: number }[],
): number {
    let weightedSum = 0;
    let weightTotal = 0;

    for (const item of items) {
        weightedSum += item.value * item.weight;
        weightTotal += item.weight;
    }

    return weightTotal > 0 ? weightedSum / weightTotal : 0;
}

/**
 * Topic coverage factor: how many of the 6 standard topics are represented.
 * Returns a multiplier in [COVERAGE_FLOOR, 1.0].
 */
export function computeCoverageFactor(
    sessions: {
        strengths: TopicEntry[] | null;
        weaknesses: TopicEntry[] | null;
    }[],
): { factor: number; topicsCovered: number } {
    const covered = new Set<string>();

    for (const session of sessions) {
        const allTopics: TopicEntry[] = [
            ...((session.strengths as TopicEntry[]) || []),
            ...((session.weaknesses as TopicEntry[]) || []),
        ];
        for (const t of allTopics) {
            if (!t.topic) continue;
            const normalised = t.topic.toLowerCase();
            if (STANDARD_TOPIC_LABELS.has(normalised)) {
                covered.add(normalised);
            }
        }
    }

    const ratio = covered.size / STANDARD_TOPIC_LABELS.size;
    return {
        factor: COVERAGE_FLOOR + (1 - COVERAGE_FLOOR) * ratio,
        topicsCovered: covered.size,
    };
}

/**
 * Confidence factor based on session count.
 * Returns a multiplier in [CONFIDENCE_FLOOR, 1.0].
 */
export function computeConfidenceFactor(sessionCount: number): number {
    const raw = Math.min(1, sessionCount / CONFIDENCE_THRESHOLD);
    return CONFIDENCE_FLOOR + (1 - CONFIDENCE_FLOOR) * raw;
}

// ── Save a session ──────────────────────────────────────────────────────────

/**
 * Persist a completed quiz or oral exam session to Supabase.
 */
export async function saveSession(
    session: LearningSessionInsert,
): Promise<void> {
    const { error } = await supabase
        .from("learning_sessions")
        .insert(session);

    if (error) {
        console.error("Failed to save learning session:", error.message);
        throw new Error(error.message);
    }
}

// ── Certification Readiness ─────────────────────────────────────────────────

/**
 * Fetch certification readiness per category using the three-factor formula:
 *   readiness = round(weightedAvg × coverageFactor × confidenceFactor)
 */
export async function fetchReadiness(): Promise<CategoryReadiness[]> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("learning_sessions")
        .select("category, percentage, created_at, strengths, weaknesses")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to fetch readiness:", error.message);
        return [];
    }

    if (!data || data.length === 0) return [];

    const now = new Date();

    // Group sessions by category
    const grouped = new Map<
        string,
        {
            percentage: number;
            created_at: string;
            strengths: TopicEntry[] | null;
            weaknesses: TopicEntry[] | null;
        }[]
    >();

    for (const row of data) {
        const list = grouped.get(row.category) || [];
        list.push(row);
        grouped.set(row.category, list);
    }

    const results: CategoryReadiness[] = [];

    for (const [category, sessions] of grouped) {
        // 1. Recency-weighted average
        const weighted = sessions.map((s) => ({
            value: s.percentage,
            weight: computeRecencyWeight(s.created_at, now),
        }));
        const rawWeightedAverage = computeWeightedAverage(weighted);

        // 2. Topic coverage factor
        const { factor: coverageFactor, topicsCovered } =
            computeCoverageFactor(sessions);

        // 3. Confidence factor
        const confidenceFactor = computeConfidenceFactor(sessions.length);

        // Combined
        const readiness = Math.round(
            rawWeightedAverage * coverageFactor * confidenceFactor,
        );

        results.push({
            category,
            averagePercentage: readiness,
            totalSessions: sessions.length,
            rawWeightedAverage: Math.round(rawWeightedAverage),
            coverageFactor: Math.round(coverageFactor * 100) / 100,
            confidenceFactor: Math.round(confidenceFactor * 100) / 100,
            topicsCovered,
        });
    }

    return results;
}

// ── Study Topics Mastery ────────────────────────────────────────────────────

/**
 * Fetch per-topic mastery using recency-weighted averages.
 * Always returns all 6 standard topics (untested topics show 0%).
 */
export async function fetchTopicMastery(): Promise<TopicMastery[]> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("learning_sessions")
        .select("strengths, weaknesses, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to fetch topic mastery:", error.message);
        return [];
    }

    // Accumulate weighted values per topic
    const topicMap = new Map<
        string,
        { items: { value: number; weight: number }[]; count: number }
    >();

    if (data && data.length > 0) {
        const now = new Date();

        for (const row of data) {
            const weight = computeRecencyWeight(row.created_at, now);
            const allTopics: TopicEntry[] = [
                ...((row.strengths as TopicEntry[]) || []),
                ...((row.weaknesses as TopicEntry[]) || []),
            ];

            for (const t of allTopics) {
                if (!t.topic) continue;
                const key = t.topic.toLowerCase();
                const entry = topicMap.get(key) || { items: [], count: 0 };
                entry.items.push({ value: t.percentage, weight });
                entry.count += 1;
                topicMap.set(key, entry);
            }
        }
    }

    // Build results for all 6 standard topics
    return STUDY_TOPICS.map((st) => {
        const key = st.label.toLowerCase();
        const entry = topicMap.get(key);

        if (!entry || entry.items.length === 0) {
            return { topic: st.label, averagePercentage: 0, totalSessions: 0 };
        }

        return {
            topic: st.label,
            averagePercentage: Math.round(
                computeWeightedAverage(entry.items),
            ),
            totalSessions: entry.count,
        };
    });
}

// ── Total Practice Time ─────────────────────────────────────────────────────

/**
 * Fetch the total practice time (in seconds) across all sessions.
 */
export async function fetchTotalPracticeTime(): Promise<number> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data, error } = await supabase
        .from("learning_sessions")
        .select("time_taken_seconds")
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to fetch practice time:", error.message);
        return 0;
    }

    if (!data || data.length === 0) return 0;

    return data.reduce(
        (sum, row) => sum + (row.time_taken_seconds ?? 0),
        0,
    );
}

// ── Session History ─────────────────────────────────────────────────────────

/**
 * Fetch paginated session history for the History screen.
 * Returns learning sessions ordered by most recent first.
 */
export async function fetchSessionHistory(
    limit = 20,
    offset = 0,
): Promise<LearningSession[]> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(
            error.message || "Failed to fetch session history.",
        );
    }

    return (data ?? []) as LearningSession[];
}
