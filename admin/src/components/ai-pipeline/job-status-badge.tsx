import { Badge } from "@/components/ui/badge";
import type { AiJobStatus } from "@/types/ai";

const statusConfig: Record<
  AiJobStatus,
  { label: string; className: string }
> = {
  queued: {
    label: "Queued",
    className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-500/15 text-blue-500 border-blue-500/25",
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/15 text-green-500 border-green-500/25",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-500 border-red-500/25",
  },
};

export function JobStatusBadge({ status }: { status: AiJobStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
