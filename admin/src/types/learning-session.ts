export type TopicPerformance = {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
};

export type LearningSession = {
  id: string;
  user_id: string;
  mode: "mcq" | "oral_exam";
  category: string;
  topic: string | null;
  score: number;
  total: number;
  percentage: number;
  time_taken_seconds: number | null;
  strengths: TopicPerformance[] | null;
  weaknesses: TopicPerformance[] | null;
  created_at: string;
};

export type LearningSessionInsert = Omit<LearningSession, "id" | "created_at">;

export type CategoryReadiness = {
  category: string;
  averagePercentage: number;
  totalSessions: number;
  rawWeightedAverage?: number;
  coverageFactor?: number;
  confidenceFactor?: number;
  topicsCovered?: number;
};

export type TopicMastery = {
  topic: string;
  averagePercentage: number;
  totalSessions: number;
};
