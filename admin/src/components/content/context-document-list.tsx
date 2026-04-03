"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  uploadContextDocument,
  deleteContextDocument,
} from "@/lib/actions/ai-config";
import type { AiContextDocument } from "@/types/ai-config";
import { formatFileSize } from "@/types/ai-config";
import { formatRelativeTime } from "@/lib/format";
import {
  Plus,
  FileText,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface ContextDocumentListProps {
  configKey: string;
  documents: AiContextDocument[];
}

export function ContextDocumentList({
  configKey,
  documents,
}: ContextDocumentListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiContextDocument | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("config_key", configKey);

    startTransition(async () => {
      const result = await uploadContextDocument(formData);
      if (!result.success) {
        setUploadError(result.error ?? "Upload failed");
        return;
      }
      setShowUpload(false);
      setTitle("");
      setDescription("");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteContextDocument(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Context Documents</Label>
          <p className="text-sm text-muted-foreground">
            Reference documents fed to the AI for additional context
          </p>
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Plus className="mr-2 h-3 w-3" />
          Upload
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No context documents uploaded yet
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(doc.file_size_bytes)}</span>
                  <span>&middot;</span>
                  <span>{formatRelativeTime(doc.created_at)}</span>
                </div>
              </div>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(doc)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Context Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title *</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. FAA Regulations Reference"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-desc">Description</Label>
              <Input
                id="doc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document"
              />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                name="file"
                type="file"
                accept=".pdf,.txt,.md"
                required
              />
              <p className="text-xs text-muted-foreground">
                Accepted: PDF, TXT, Markdown (max 50MB)
              </p>
            </div>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUpload(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Document"
        description={`Are you sure you want to remove "${deleteTarget?.title}"?`}
        confirmLabel="Remove"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
