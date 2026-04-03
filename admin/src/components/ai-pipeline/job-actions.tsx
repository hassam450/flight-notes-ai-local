"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { retryFailedJob } from "@/lib/actions/ai-jobs";
import { RotateCcw } from "lucide-react";

interface JobRetryButtonProps {
  jobId: string;
  isSuperAdmin: boolean;
}

export function JobRetryButton({ jobId, isSuperAdmin }: JobRetryButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isSuperAdmin) return null;

  async function handleRetry() {
    setLoading(true);
    const result = await retryFailedJob(jobId);
    setLoading(false);
    setConfirmOpen(false);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={() => setConfirmOpen(true)}
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Retry
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Retry Failed Job"
        description="This will re-queue the job for processing. The worker will pick it up on the next cycle."
        confirmLabel="Retry"
        loading={loading}
        onConfirm={handleRetry}
      />
    </>
  );
}
