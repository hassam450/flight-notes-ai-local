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
import { ResourceFormDialog } from "@/components/content/resource-form-dialog";
import {
  deleteResource,
  toggleResourceStatus,
  toggleResourceFeatured,
} from "@/lib/actions/resources";
import type { ResourceRow } from "@/types/toolkit-resource";
import type { PaginatedResult } from "@/types/user";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Plus,
  FileText,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  handbooks: "bg-blue-500/10 text-blue-500",
  regulations: "bg-red-500/10 text-red-500",
  standards: "bg-amber-500/10 text-amber-500",
  advisory: "bg-green-500/10 text-green-500",
};

interface ResourceDataTableProps {
  data: PaginatedResult<ResourceRow>;
  adminRole: string;
}

export function ResourceDataTable({ data, adminRole }: ResourceDataTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editResource, setEditResource] = useState<ResourceRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null);

  const isEditor = adminRole === "super_admin";

  const handleToggleActive = (resource: ResourceRow) => {
    startTransition(async () => {
      await toggleResourceStatus(resource.id, !resource.is_active);
      router.refresh();
    });
  };

  const handleToggleFeatured = (resource: ResourceRow) => {
    startTransition(async () => {
      await toggleResourceFeatured(resource.id, !resource.is_featured);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteResource(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const handleFormSuccess = () => {
    setShowCreate(false);
    setEditResource(null);
    router.refresh();
  };

  const columns: ColumnDef<ResourceRow>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2 min-w-[200px]">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">{item.title}</p>
            {item.document_code && (
              <p className="text-xs text-muted-foreground">
                {item.document_code}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            CATEGORY_COLORS[item.category] ?? ""
          }`}
        >
          {item.category}
        </span>
      ),
    },
    {
      key: "is_featured",
      header: "Featured",
      render: (item) =>
        item.is_featured ? (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        ) : (
          <StarOff className="h-4 w-4 text-muted-foreground" />
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
      key: "sort_order",
      header: "Order",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">{item.sort_order}</span>
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
              <DropdownMenuItem onClick={() => setEditResource(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleFeatured(item)}>
                {item.is_featured ? (
                  <>
                    <StarOff className="mr-2 h-4 w-4" />
                    Unfeature
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Feature
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                {item.is_active ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
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
      options: [
        { label: "Handbooks", value: "handbooks" },
        { label: "Regulations", value: "regulations" },
        { label: "Standards", value: "standards" },
        { label: "Advisory", value: "advisory" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  return (
    <>
      {isEditor && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
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
        searchPlaceholder="Search resources..."
        filters={filters}
        keyExtractor={(item) => item.id}
      />

      {/* Create dialog */}
      <ResourceFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={handleFormSuccess}
      />

      {/* Edit dialog */}
      <ResourceFormDialog
        open={!!editResource}
        onOpenChange={(open) => !open && setEditResource(null)}
        resource={editResource ?? undefined}
        onSuccess={handleFormSuccess}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Resource"
        description={`Are you sure you want to deactivate "${deleteTarget?.title}"? It will be hidden from the mobile app but can be reactivated later.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
