import { Badge } from "@/components/ui/badge";
import type { AiTask } from "@/types/ai";

const taskLabels: Record<AiTask, string> = {
  transcription: "Transcription",
  summary: "Summary",
  flashcards: "Flashcards",
};

export function TaskTypeBadge({ task }: { task: AiTask }) {
  return <Badge variant="secondary">{taskLabels[task]}</Badge>;
}
