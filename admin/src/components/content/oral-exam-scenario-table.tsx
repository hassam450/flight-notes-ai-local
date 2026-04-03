"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DataTable,
  type ColumnDef,
  type DataTableFilter,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OralExamScenarioFormDialog } from "@/components/content/oral-exam-scenario-form";
import { deleteOralExamScenario } from "@/lib/actions/oral-exam-config";
import type { OralExamScenario } from "@/types/oral-exam-config";
import { QUIZ_CATEGORIES } from "@/types/quiz-question";
import type { PaginatedResult } from "@/types/user";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";

interface OralExamScenarioTableProps {
  data: PaginatedResult<OralExamScenario>;
  adminRole: string;
}

export function OralExamScenarioTable({
  data,
  adminRole,
}: OralExamScenarioTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editScenario, setEditScenario] = useState<OralExamScenario | null>(
    null
  );
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OralExamScenario | null>(
    null
  );

  const isEditor = adminRole === "super_admin";

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteOralExamScenario(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const handleFormSuccess = () => {
    setShowCreate(false);
    setEditScenario(null);
    router.refresh();
  };

  const columns: ColumnDef<OralExamScenario>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (item) => (
        <div className="min-w-[200px]">
          <p className="font-medium">{item.title}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => <Badge variant="outline">{item.category}</Badge>,
    },
    {
      key: "topic",
      header: "Topic",
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.topic ?? "—"}
        </span>
      ),
    },
    {
      key: "persona_prompt",
      header: "Custom Persona",
      render: (item) =>
        item.persona_prompt ? (
          <Badge variant="secondary">Custom</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Default</span>
        ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (item) => (
        <Badge variant={item.is_active ? "default" : "secondary"}>
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item) =>
        isEditor ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditScenario(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteTarget(item)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "category",
      label: "Category",
      options: QUIZ_CATEGORIES.map((c) => ({ label: c, value: c })),
    },
  ];

  return (
    <>
      {isEditor && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Scenario
          </Button>
        </div>
      )}

      <DataTable
        data={data.data}
        columns={columns}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        totalPages={data.totalPages}
        searchPlaceholder="Search scenarios..."
        filters={filters}
        keyExtractor={(item) => item.id}
      />

      <OralExamScenarioFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={handleFormSuccess}
      />

      <OralExamScenarioFormDialog
        open={!!editScenario}
        onOpenChange={(open) => !open && setEditScenario(null)}
        scenario={editScenario ?? undefined}
        onSuccess={handleFormSuccess}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Scenario"
        description={`Are you sure you want to deactivate "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
