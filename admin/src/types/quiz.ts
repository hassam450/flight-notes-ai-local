export type AssessmentSourceMode = "prebuilt" | "notes_ai";

export type QuizQuestion = {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  topic: string;
  reference?: string;
};

export type QuizConfig = {
  category: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
  sourceMode?: AssessmentSourceMode;
  noteIds?: string[];
  targetCategory?: string;
};

export type QuizAttempt = {
  questionIndex: number;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
};

export type TopicPerformance = {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
};

export type QuizResult = {
  score: number;
  total: number;
  percentage: number;
  attempts: QuizAttempt[];
  strengths: TopicPerformance[];
  weaknesses: TopicPerformance[];
  timeTakenSeconds: number;
};
