"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DataTable,
  type ColumnDef,
  type DataTableFilter,
} from "@/components/shared/data-table";
import { JobStatusBadge } from "./job-status-badge";
import { TaskTypeBadge } from "./task-type-badge";
import { JobRetryButton } from "./job-actions";
import { ErrorDetailSheet } from "./error-detail-sheet";
import { formatRelativeTime } from "@/lib/format";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiJobRow, AiJobStatus, AiTask } from "@/types/ai";
import type { PaginatedResult } from "@/types/user";

interface JobQueueTableProps {
  data: PaginatedResult<AiJobRow>;
  adminRole: string;
}

export function JobQueueTable({ data, adminRole }: JobQueueTableProps) {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<AiJobRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isSuperAdmin = adminRole === "super_admin";

  const handleView = useCallback((job: AiJobRow) => {
    setSelectedJob(job);
    setSheetOpen(true);
  }, []);

  // Auto-refresh every 30 seconds
  useState(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => clearInterval(interval);
  });

  const columns: ColumnDef<AiJobRow>[] = [
    {
      key: "id",
      header: "Job ID",
      render: (job) => (
        <span className="font-mono text-xs">{job.id.slice(0, 12)}...</span>
      ),
    },
    {
      key: "task",
      header: "Task",
      sortable: true,
      render: (job) => <TaskTypeBadge task={job.task} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (job) => <JobStatusBadge status={job.status} />,
    },
    {
      key: "user_email",
      header: "User",
      render: (job) => (
        <span className="text-sm">{job.user_email ?? "—"}</span>
      ),
    },
    {
      key: "duration_ms",
      header: "Duration",
      sortable: true,
      render: (job) =>
        job.duration_ms != null ? `${(job.duration_ms / 1000).toFixed(1)}s` : "—",
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (job) => (
        <span className="text-sm">{formatRelativeTime(job.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (job) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleView(job)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {job.status === "failed" && (
            <JobRetryButton jobId={job.id} isSuperAdmin={isSuperAdmin} />
          )}
        </div>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Queued", value: "queued" },
        { label: "Processing", value: "processing" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" },
      ] satisfies { label: string; value: AiJobStatus }[],
    },
    {
      key: "task",
      label: "Task Type",
      options: [
        { label: "Transcription", value: "transcription" },
        { label: "Summary", value: "summary" },
        { label: "Flashcards", value: "flashcards" },
      ] satisfies { label: string; value: AiTask }[],
    },
  ];

  return (
    <>
      <DataTable
        data={data.data}
        columns={columns}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        totalPages={data.totalPages}
        searchPlaceholder="Search by job ID or user email..."
        filters={filters}
        keyExtractor={(job) => job.id}
      />
      <ErrorDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
