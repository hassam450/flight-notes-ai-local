"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateAiConfig } from "@/lib/actions/ai-config";
import type { AiConfig } from "@/types/ai-config";
import { formatRelativeTime } from "@/lib/format";
import { Save, RotateCcw } from "lucide-react";

interface SystemPromptEditorProps {
  configKey: string;
  label: string;
  description?: string;
  config: AiConfig | null;
  defaultPrompt?: string;
}

export function SystemPromptEditor({
  configKey,
  label,
  description,
  config,
  defaultPrompt,
}: SystemPromptEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(config?.config_value ?? defaultPrompt ?? "");
  const [saved, setSaved] = useState(false);

  const charCount = value.length;
  const tokenEstimate = Math.ceil(charCount / 4);
  const hasChanges = value !== (config?.config_value ?? defaultPrompt ?? "");

  const handleSave = () => {
    startTransition(async () => {
      await updateAiConfig(configKey, value);
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
  );
}
