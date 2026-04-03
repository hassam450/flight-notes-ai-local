"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DataTable,
  type ColumnDef,
  type DataTableFilter,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QuizQuestionFormDialog } from "@/components/content/quiz-question-form";
import { QuizBulkImportDialog } from "@/components/content/quiz-bulk-import";
import { deleteQuizQuestion } from "@/lib/actions/quiz-questions";
import type { QuizQuestionRow } from "@/types/quiz-question";
import {
  QUIZ_CATEGORIES,
  QUIZ_DIFFICULTIES,
  QUIZ_TOPICS,
  formatQuizTopic,
} from "@/types/quiz-question";
import type { PaginatedResult } from "@/types/user";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  Upload,
  CheckCircle2,
} from "lucide-react";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/10 text-green-500",
  medium: "bg-amber-500/10 text-amber-500",
  hard: "bg-red-500/10 text-red-500",
};

interface QuizQuestionTableProps {
  data: PaginatedResult<QuizQuestionRow>;
  adminRole: string;
  distinctTopics: string[];
}

export function QuizQuestionTable({
  data,
  adminRole,
  distinctTopics,
}: QuizQuestionTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editQuestion, setEditQuestion] = useState<QuizQuestionRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuizQuestionRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isEditor = adminRole === "super_admin";

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteQuizQuestion(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const handleFormSuccess = () => {
    setShowCreate(false);
    setEditQuestion(null);
    setShowBulkImport(false);
    router.refresh();
  };

  // Build topic filter options from both constants and DB topics
  const allTopics = new Set([
    ...QUIZ_TOPICS,
    ...distinctTopics,
  ]);

  const columns: ColumnDef<QuizQuestionRow>[] = [
    {
      key: "question_text",
      header: "Question",
      sortable: true,
      render: (item) => (
        <div className="min-w-[250px] max-w-[400px]">
          <button
            className="text-left hover:underline"
            onClick={() =>
              setExpandedId(expandedId === item.id ? null : item.id)
            }
          >
            <p className="text-sm line-clamp-2">{item.question_text}</p>
          </button>
          {expandedId === item.id && (
            <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">{item.question_text}</p>
              <div className="space-y-1">
                {item.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 rounded px-2 py-1 ${
                      idx === item.correct_index
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                        : ""
                    }`}
                  >
                    <span className="text-xs font-mono w-4">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{opt}</span>
                    {idx === item.correct_index && (
                      <CheckCircle2 className="h-3 w-3 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
              {item.explanation && (
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Explanation:</strong> {item.explanation}
                </p>
              )}
              {item.reference && (
                <p className="text-xs text-muted-foreground">
                  <strong>Reference:</strong> {item.reference}
                </p>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => <Badge variant="outline">{item.category}</Badge>,
    },
    {
      key: "topic",
      header: "Topic",
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {formatQuizTopic(item.topic)}
        </span>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            DIFFICULTY_COLORS[item.difficulty] ?? ""
          }`}
        >
          {item.difficulty}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (item) => (
        <Badge variant={item.is_active ? "default" : "secondary"}>
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item) =>
        isEditor ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditQuestion(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteTarget(item)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "category",
      label: "Category",
      options: QUIZ_CATEGORIES.map((c) => ({ label: c, value: c })),
    },
    {
      key: "topic",
      label: "Topic",
      options: Array.from(allTopics).map((t) => ({
        label: formatQuizTopic(t),
        value: t,
      })),
    },
    {
      key: "difficulty",
      label: "Difficulty",
      options: QUIZ_DIFFICULTIES.map((d) => ({
        label: d.charAt(0).toUpperCase() + d.slice(1),
        value: d,
      })),
    },
  ];

  return (
    <>
      {isEditor && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      )}

      <DataTable
        data={data.data}
        columns={columns}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        totalPages={data.totalPages}
        searchPlaceholder="Search questions..."
        filters={filters}
        keyExtractor={(item) => item.id}
      />

      <QuizQuestionFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={handleFormSuccess}
        distinctTopics={Array.from(allTopics)}
      />

      <QuizQuestionFormDialog
        open={!!editQuestion}
        onOpenChange={(open) => !open && setEditQuestion(null)}
        question={editQuestion ?? undefined}
        onSuccess={handleFormSuccess}
        distinctTopics={Array.from(allTopics)}
      />

      <QuizBulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onSuccess={handleFormSuccess}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Question"
        description={`Are you sure you want to deactivate this question? It will be hidden from quizzes but can be reactivated later.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
