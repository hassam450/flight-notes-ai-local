"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorDetailSheet } from "./error-detail-sheet";
import { TaskTypeBadge } from "./task-type-badge";
import { JobRetryButton } from "./job-actions";
import { formatRelativeTime } from "@/lib/format";
import { bulkRetryFailedJobs } from "@/lib/actions/ai-jobs";
import { Eye, RotateCcw } from "lucide-react";
import type { AiJobRow } from "@/types/ai";
import type { PaginatedResult } from "@/types/user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";

interface ErrorLogTableProps {
  data: PaginatedResult<AiJobRow>;
  adminRole: string;
}

export function ErrorLogTable({ data, adminRole }: ErrorLogTableProps) {
  const router = useRouter();
  const isSuperAdmin = adminRole === "super_admin";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<AiJobRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === data.data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.data.map((j) => j.id)));
    }
  }, [data.data, selected.size]);

  async function handleBulkRetry() {
    setBulkLoading(true);
    await bulkRetryFailedJobs(Array.from(selected));
    setBulkLoading(false);
    setBulkConfirmOpen(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <>
      {isSuperAdmin && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
          <span className="text-sm">
            {selected.size} job{selected.size > 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkConfirmOpen(true)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Retry Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {data.data.length === 0 ? (
        <EmptyState icon={Inbox} message="No failed jobs found" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {isSuperAdmin && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={
                        selected.size === data.data.length &&
                        data.data.length > 0
                      }
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </TableHead>
                )}
                <TableHead>Job ID</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((job) => (
                <TableRow key={job.id}>
                  {isSuperAdmin && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(job.id)}
                        onChange={() => toggleSelect(job.id)}
                        className="rounded"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="font-mono text-xs">
                      {job.id.slice(0, 12)}...
                    </span>
                  </TableCell>
                  <TableCell>
                    <TaskTypeBadge task={job.task} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {job.user_email ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="max-w-xs truncate text-xs text-destructive"
                      title={job.error_message ?? ""}
                    >
                      {job.error_message?.slice(0, 80) ?? "—"}
                      {(job.error_message?.length ?? 0) > 80 ? "..." : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatRelativeTime(job.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          setSelectedJob(job);
                          setSheetOpen(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <JobRetryButton
                        jobId={job.id}
                        isSuperAdmin={isSuperAdmin}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ErrorDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Retry Failed Jobs"
        description={`Re-queue ${selected.size} failed job${selected.size > 1 ? "s" : ""} for processing?`}
        confirmLabel="Retry All"
        loading={bulkLoading}
        onConfirm={handleBulkRetry}
      />
    </>
  );
}
