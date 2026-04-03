"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createQuizQuestion,
  updateQuizQuestion,
} from "@/lib/actions/quiz-questions";
import type {
  QuizQuestionRow,
  QuizCategory,
  QuizDifficulty,
} from "@/types/quiz-question";
import {
  QUIZ_CATEGORIES,
  QUIZ_DIFFICULTIES,
  formatQuizTopic,
} from "@/types/quiz-question";
import { CheckCircle2 } from "lucide-react";

interface QuizQuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: QuizQuestionRow;
  onSuccess: () => void;
  distinctTopics: string[];
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function QuizQuestionFormDialog({
  open,
  onOpenChange,
  question,
  onSuccess,
  distinctTopics,
}: QuizQuestionFormDialogProps) {
  const isEdit = !!question;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [category, setCategory] = useState<QuizCategory>("PPL");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (open && question) {
      setQuestionText(question.question_text);
      setOptions([...question.options]);
      setCorrectIndex(question.correct_index);
      setExplanation(question.explanation);
      setTopic(question.topic);
      setCustomTopic("");
      setCategory(question.category);
      setDifficulty(question.difficulty);
      setReference(question.reference ?? "");
    } else if (open && !question) {
      setQuestionText("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      setExplanation("");
      setTopic("");
      setCustomTopic("");
      setCategory("PPL");
      setDifficulty("medium");
      setReference("");
    }
    setError(null);
  }, [open, question]);

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const finalTopic = topic === "__custom" ? customTopic : topic;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!finalTopic.trim()) {
      setError("Topic is required");
      return;
    }

    const input = {
      question_text: questionText,
      options,
      correct_index: correctIndex,
      explanation,
      topic: finalTopic.trim(),
      category,
      difficulty,
      reference: reference || undefined,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateQuizQuestion(question.id, input)
        : await createQuizQuestion(input);

      if (!result.success) {
        setError(result.error ?? "An error occurred");
        return;
      }
      onSuccess();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Question" : "Add Question"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question text */}
          <div className="space-y-2">
            <Label htmlFor="question_text">Question *</Label>
            <textarea
              id="question_text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the question text"
              required
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options * (select the correct answer)</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectIndex(idx)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-mono transition-colors ${
                    correctIndex === idx
                      ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {correctIndex === idx ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    OPTION_LABELS[idx]
                  )}
                </button>
                <Input
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${OPTION_LABELS[idx]}`}
                  required
                />
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation</Label>
            <textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Why is this the correct answer?"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Category + Difficulty row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as QuizCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty *</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as QuizDifficulty)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Topic + Reference row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Topic *</Label>
              <Select
                value={topic}
                onValueChange={(v) => setTopic(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {distinctTopics.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatQuizTopic(t)}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom">Custom topic...</SelectItem>
                </SelectContent>
              </Select>
              {topic === "__custom" && (
                <Input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Enter custom topic (e.g. aeromedical)"
                  className="mt-1"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. FAR 91.173"
              />
            </div>
          </div>

          {/* Live preview */}
          {questionText && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Preview
              </p>
              <p className="text-sm font-medium">{questionText}</p>
              <div className="space-y-1">
                {options.map(
                  (opt, idx) =>
                    opt && (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                          idx === correctIndex
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                            : ""
                        }`}
                      >
                        <span className="text-xs font-mono w-4">
                          {OPTION_LABELS[idx]}.
                        </span>
                        <span>{opt}</span>
                        {idx === correctIndex && (
                          <CheckCircle2 className="h-3 w-3 ml-auto" />
                        )}
                      </div>
                    )
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEdit
                  ? "Update Question"
                  : "Create Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
