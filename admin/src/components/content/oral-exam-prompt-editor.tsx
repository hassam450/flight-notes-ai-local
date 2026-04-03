"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveConfigWithHistory } from "@/lib/actions/oral-exam-config";
import type { AiConfig } from "@/types/ai-config";
import type { AiConfigHistory } from "@/types/oral-exam-config";
import { formatRelativeTime } from "@/lib/format";
import { Save, RotateCcw, History, Clock } from "lucide-react";

interface OralExamPromptEditorProps {
  configKey: string;
  label: string;
  description?: string;
  config: AiConfig | null;
  defaultPrompt?: string;
  history: AiConfigHistory[];
}

export function OralExamPromptEditor({
  configKey,
  label,
  description,
  config,
  defaultPrompt,
  history,
}: OralExamPromptEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(
    config?.config_value ?? defaultPrompt ?? ""
  );
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const charCount = value.length;
  const tokenEstimate = Math.ceil(charCount / 4);
  const hasChanges = value !== (config?.config_value ?? defaultPrompt ?? "");

  const handleSave = () => {
    startTransition(async () => {
      await saveConfigWithHistory(configKey, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  };

  const handleReset = () => {
    if (defaultPrompt) {
      setValue(defaultPrompt);
    }
  };

  const handleRestore = (historyValue: string) => {
    setValue(historyValue);
    setShowHistory(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="mr-2 h-3 w-3" />
              History ({history.length})
            </Button>
          )}
          {defaultPrompt && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isPending}
          >
            <Save className="mr-2 h-3 w-3" />
            {isPending ? "Saving..." : saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Editor */}
        <div className="flex-1 space-y-2">
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            rows={12}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{charCount.toLocaleString()} characters</span>
              <span>~{tokenEstimate.toLocaleString()} tokens</span>
            </div>
            {config?.updated_at && (
              <span>Last updated {formatRelativeTime(config.updated_at)}</span>
            )}
          </div>
        </div>

        {/* Version history sidebar */}
        {showHistory && (
          <div className="w-64 shrink-0 rounded-lg border p-3 space-y-2 max-h-[360px] overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Version History
            </p>
            {history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-md border p-2 space-y-1 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(entry.created_at)}
                </div>
                {entry.changed_by && (
                  <p className="text-xs text-muted-foreground truncate">
                    by {entry.changed_by}
                  </p>
                )}
                <p className="text-xs line-clamp-2">
                  {entry.config_value.substring(0, 100)}...
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-xs"
                  onClick={() => handleRestore(entry.config_value)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
