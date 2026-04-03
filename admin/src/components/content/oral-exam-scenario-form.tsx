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
  createOralExamScenario,
  updateOralExamScenario,
} from "@/lib/actions/oral-exam-config";
import type { OralExamScenario } from "@/types/oral-exam-config";
import { QUIZ_CATEGORIES } from "@/types/quiz-question";

interface OralExamScenarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario?: OralExamScenario;
  onSuccess: () => void;
}

export function OralExamScenarioFormDialog({
  open,
  onOpenChange,
  scenario,
  onSuccess,
}: OralExamScenarioFormDialogProps) {
  const isEdit = !!scenario;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PPL");
  const [topic, setTopic] = useState("");
  const [personaPrompt, setPersonaPrompt] = useState("");

  useEffect(() => {
    if (open && scenario) {
      setTitle(scenario.title);
      setDescription(scenario.description ?? "");
      setCategory(scenario.category);
      setTopic(scenario.topic ?? "");
      setPersonaPrompt(scenario.persona_prompt ?? "");
    } else if (open && !scenario) {
      setTitle("");
      setDescription("");
      setCategory("PPL");
      setTopic("");
      setPersonaPrompt("");
    }
    setError(null);
  }, [open, scenario]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const input = {
      title,
      description: description || undefined,
      category,
      topic: topic || undefined,
      persona_prompt: personaPrompt || undefined,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateOralExamScenario(scenario.id, input)
        : await createOralExamScenario(input);

      if (!result.success) {
        setError(result.error ?? "An error occurred");
        return;
      }
      onSuccess();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Scenario" : "Add Scenario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scenario-title">Title *</Label>
            <Input
              id="scenario-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cross-Country Planning Oral"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenario-desc">Description</Label>
            <textarea
              id="scenario-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scenario focus and objectives"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={category}
                onValueChange={(v) => v && setCategory(v)}
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
              <Label htmlFor="scenario-topic">Topic</Label>
              <Input
                id="scenario-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Navigation, Weather"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-prompt">
              Custom Examiner Persona (optional)
            </Label>
            <textarea
              id="persona-prompt"
              value={personaPrompt}
              onChange={(e) => setPersonaPrompt(e.target.value)}
              placeholder="Override the default examiner personality for this scenario. Leave blank to use the global examiner prompt."
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              If provided, this overrides the global examiner system prompt for
              this specific scenario.
            </p>
          </div>

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
                  ? "Update Scenario"
                  : "Create Scenario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
