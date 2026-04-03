import { headers } from "next/headers";
import { getAiConfig } from "@/lib/actions/ai-config";
import {
  getOralExamScenarios,
  getConfigHistory,
} from "@/lib/actions/oral-exam-config";
import { PageHeader } from "@/components/shared/page-header";
import { OralExamPromptEditor } from "@/components/content/oral-exam-prompt-editor";
import { OralExamScenarioTable } from "@/components/content/oral-exam-scenario-table";
import { AI_CONFIG_KEYS } from "@/types/ai-config";
import type { OralExamScenarioListParams } from "@/types/oral-exam-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DEFAULT_EXAMINER_PROMPT = `You are an FAA Designated Pilot Examiner (DPE) conducting an oral examination. You are thorough but fair, and you want the applicant to succeed.

Guidelines:
- Ask questions appropriate to the certificate level being tested
- Start with broader concepts and drill down based on the applicant's responses
- Reference the Airman Certification Standards (ACS) for evaluation criteria
- Provide constructive feedback when the applicant's answer is incomplete
- Maintain a professional and encouraging demeanor`;

const DEFAULT_EVAL_PROMPT = `Evaluate the applicant's response against the Airman Certification Standards (ACS). Consider:
- Accuracy of the information provided
- Completeness of the response
- Understanding of underlying concepts
- Ability to apply knowledge to practical scenarios

Provide a rating (satisfactory/unsatisfactory) with specific feedback.`;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function OralExamPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const adminRole = headersList.get("x-admin-role") ?? "viewer";

  const listParams: OralExamScenarioListParams = {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 25,
    category: params.category || undefined,
    search: params.search || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: (params.sortOrder as "asc" | "desc") || undefined,
  };

  const [examinerPrompt, evalPrompt, examinerHistory, evalHistory, scenarios] =
    await Promise.all([
      getAiConfig(AI_CONFIG_KEYS.ORAL_EXAM_SYSTEM_PROMPT),
      getAiConfig(AI_CONFIG_KEYS.ORAL_EXAM_EVAL_PROMPT),
      getConfigHistory(AI_CONFIG_KEYS.ORAL_EXAM_SYSTEM_PROMPT),
      getConfigHistory(AI_CONFIG_KEYS.ORAL_EXAM_EVAL_PROMPT),
      getOralExamScenarios(listParams),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oral Exam Configuration"
        description="Manage examiner prompts, evaluation criteria, and exam scenarios"
      />

      {/* Examiner System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Examiner System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <OralExamPromptEditor
            configKey={AI_CONFIG_KEYS.ORAL_EXAM_SYSTEM_PROMPT}
            label="Examiner Persona"
            description="Defines how the AI examiner behaves during oral exams"
            config={examinerPrompt}
            defaultPrompt={DEFAULT_EXAMINER_PROMPT}
            history={examinerHistory}
          />
        </CardContent>
      </Card>

      {/* Evaluation Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <OralExamPromptEditor
            configKey={AI_CONFIG_KEYS.ORAL_EXAM_EVAL_PROMPT}
            label="Evaluation Criteria"
            description="How the AI evaluates applicant responses"
            config={evalPrompt}
            defaultPrompt={DEFAULT_EVAL_PROMPT}
            history={evalHistory}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Exam Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OralExamScenarioTable data={scenarios} adminRole={adminRole} />
        </CardContent>
      </Card>
    </div>
  );
}
