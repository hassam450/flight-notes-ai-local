"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reorderResources } from "@/lib/actions/resources";
import type { ResourceRow } from "@/types/toolkit-resource";
import { GripVertical, Save } from "lucide-react";

interface ResourceReorderProps {
  resources: ResourceRow[];
}

export function ResourceReorder({ resources }: ResourceReorderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(resources);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const updated = [...items];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setItems(updated);
    setDragIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSave = () => {
    startTransition(async () => {
      const reorderItems = items.map((item, index) => ({
        id: item.id,
        sort_order: (index + 1) * 10,
      }));
      await reorderResources(reorderItems);
      setHasChanges(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag items to reorder. Changes are saved when you click Save.
        </p>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          size="sm"
        >
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save Order"}
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing ${
              dragIndex === index ? "bg-muted/50" : "bg-background"
            } hover:bg-muted/30 transition-colors`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium flex-1">{item.title}</span>
            <span className="text-xs text-muted-foreground">
              {item.category}
            </span>
            <span className="text-xs text-muted-foreground w-8 text-right">
              #{(index + 1) * 10}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
