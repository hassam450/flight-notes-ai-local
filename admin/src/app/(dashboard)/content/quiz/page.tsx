import { headers } from "next/headers";
import {
  getQuizQuestions,
  getQuizQuestionStats,
  getDistinctTopics,
} from "@/lib/actions/quiz-questions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { QuizQuestionTable } from "@/components/content/quiz-question-table";
import { formatNumber } from "@/lib/format";
import type {
  QuizQuestionListParams,
  QuizCategory,
  QuizDifficulty,
} from "@/types/quiz-question";
import { HelpCircle, CheckCircle2, BarChart3, Layers } from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function QuizBankPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const adminRole = headersList.get("x-admin-role") ?? "viewer";

  const listParams: QuizQuestionListParams = {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 25,
    category: (params.category as QuizCategory) || undefined,
    topic: params.topic || undefined,
    difficulty: (params.difficulty as QuizDifficulty) || undefined,
    search: params.search || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: (params.sortOrder as "asc" | "desc") || undefined,
  };

  const [questions, stats, distinctTopics] = await Promise.all([
    getQuizQuestions(listParams),
    getQuizQuestionStats(),
    getDistinctTopics(),
  ]);

  const categoryCount = Object.keys(stats.byCategory).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quiz Question Bank"
        description="Manage MCQ questions for the Test Yourself module"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Questions"
          value={formatNumber(stats.total)}
          icon={HelpCircle}
        />
        <StatCard
          title="Active"
          value={formatNumber(stats.active)}
          icon={CheckCircle2}
        />
        <StatCard
          title="Categories"
          value={formatNumber(categoryCount)}
          icon={Layers}
        />
        <StatCard
          title="Easy / Med / Hard"
          value={`${stats.byDifficulty["easy"] ?? 0} / ${stats.byDifficulty["medium"] ?? 0} / ${stats.byDifficulty["hard"] ?? 0}`}
          icon={BarChart3}
        />
      </div>

      <QuizQuestionTable
        data={questions}
        adminRole={adminRole}
        distinctTopics={distinctTopics}
      />
    </div>
  );
}
