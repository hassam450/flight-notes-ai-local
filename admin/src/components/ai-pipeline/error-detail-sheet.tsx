"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TaskTypeBadge } from "./task-type-badge";
import { JobStatusBadge } from "./job-status-badge";
import { formatRelativeTime } from "@/lib/format";
import type { AiJobRow } from "@/types/ai";

interface ErrorDetailSheetProps {
  job: AiJobRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ErrorDetailSheet({
  job,
  open,
  onOpenChange,
}: ErrorDetailSheetProps) {
  if (!job) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Job Details</SheetTitle>
          <SheetDescription>
            {job.id}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Task</p>
              <TaskTypeBadge task={job.task} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <JobStatusBadge status={job.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User</p>
              <p className="text-sm">{job.user_email ?? job.user_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm">{formatRelativeTime(job.created_at)}</p>
            </div>
            {job.duration_ms != null && (
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm">{(job.duration_ms / 1000).toFixed(1)}s</p>
              </div>
            )}
            {job.model && (
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="text-sm font-mono text-xs">{job.model}</p>
              </div>
            )}
          </div>

          {job.error_message && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Error Message
              </p>
              <pre className="whitespace-pre-wrap rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {job.error_message}
              </pre>
            </div>
          )}

          {job.request_payload && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Request Payload
              </p>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(job.request_payload, null, 2)}
              </pre>
            </div>
          )}

          {job.result_payload && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Result Payload
              </p>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(job.result_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
