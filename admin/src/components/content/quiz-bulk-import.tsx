"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bulkImportQuizQuestions } from "@/lib/actions/quiz-questions";
import type { BulkImportResult } from "@/types/quiz-question";
import { Upload, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface QuizBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuizBulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuizBulkImportDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileContent(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!fileContent) return;

    startTransition(async () => {
      const importResult = await bulkImportQuizQuestions(fileContent, format);
      setResult(importResult);
      if (importResult.imported > 0 && importResult.errors.length === 0) {
        // Auto-close on full success after brief delay
        setTimeout(() => onSuccess(), 1500);
      }
    });
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFileContent(null);
      setFileName(null);
      setResult(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format selector */}
          <div className="space-y-2">
            <Label>File Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as "csv" | "json")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>Upload File</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 hover:border-primary/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {fileName ?? `Choose a .${format} file`}
                  </span>
                </div>
                <input
                  type="file"
                  accept={format === "csv" ? ".csv" : ".json"}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* CSV format help */}
          {format === "csv" && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">CSV Headers (required):</p>
              <code className="block text-[10px]">
                question_text,option_a,option_b,option_c,option_d,correct_index,explanation,topic,category,difficulty,reference
              </code>
              <p>
                <strong>category:</strong> PPL, Instrument, Commercial,
                Multi-Engine, CFI
              </p>
              <p>
                <strong>correct_index:</strong> 0-3 (A=0, B=1, C=2, D=3)
              </p>
              <p>
                <strong>difficulty:</strong> easy, medium, hard
              </p>
            </div>
          )}

          {/* JSON format help */}
          {format === "json" && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">JSON format — array of objects:</p>
              <pre className="text-[10px] overflow-x-auto">
                {`[{ "question_text": "...", "option_a": "...", "option_b": "...",
  "option_c": "...", "option_d": "...", "correct_index": 0,
  "explanation": "...", "topic": "...", "category": "PPL",
  "difficulty": "medium", "reference": "FAR 91.173" }]`}
              </pre>
            </div>
          )}

          {/* Import result */}
          {result && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-4 text-sm">
                {result.imported > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {result.imported} imported
                  </span>
                )}
                {result.skipped > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    {result.skipped} skipped
                  </span>
                )}
                {result.errors.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                    {result.errors.length} errors
                  </span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-destructive">
                      {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            {result?.imported ? "Done" : "Cancel"}
          </Button>
          {!result?.imported && (
            <Button
              onClick={handleImport}
              disabled={!fileContent || isPending}
            >
              {isPending ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
