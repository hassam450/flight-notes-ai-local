"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createResource, updateResource } from "@/lib/actions/resources";
import type { ResourceRow, ToolkitResourceCategory } from "@/types/toolkit-resource";
import { Upload } from "lucide-react";

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: ResourceRow;
  onSuccess: () => void;
}

const CATEGORIES: { label: string; value: ToolkitResourceCategory }[] = [
  { label: "Handbooks", value: "handbooks" },
  { label: "Regulations", value: "regulations" },
  { label: "Standards", value: "standards" },
  { label: "Advisory", value: "advisory" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  resource,
  onSuccess,
}: ResourceFormDialogProps) {
  const isEdit = !!resource;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<ToolkitResourceCategory>("handbooks");
  const [documentCode, setDocumentCode] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

  // Reset form when dialog opens/closes or resource changes
  useEffect(() => {
    if (open && resource) {
      setTitle(resource.title);
      setSlug(resource.slug);
      setCategory(resource.category);
      setDocumentCode(resource.document_code ?? "");
      setDescription(resource.description);
      setKeywords(resource.keywords.join(", "));
      setPdfUrl(resource.pdf_url);
      setIsFeatured(resource.is_featured);
      setSortOrder(String(resource.sort_order));
    } else if (open && !resource) {
      setTitle("");
      setSlug("");
      setCategory("handbooks");
      setDocumentCode("");
      setDescription("");
      setKeywords("");
      setPdfUrl("");
      setIsFeatured(false);
      setSortOrder("0");
    }
    setError(null);
  }, [open, resource]);

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEdit) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("title", title);
    formData.set("slug", slug);
    formData.set("category", category);
    formData.set("document_code", documentCode);
    formData.set("description", description);
    formData.set("keywords", keywords);
    formData.set("pdf_url", pdfUrl);
    formData.set("is_featured", String(isFeatured));
    formData.set("sort_order", sortOrder);

    startTransition(async () => {
      const result = isEdit
        ? await updateResource(resource.id, formData)
        : await createResource(formData);

      if (!result.success) {
        setError(result.error ?? "An error occurred");
        return;
      }
      onSuccess();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Resource" : "Add Resource"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Pilot's Handbook of Aeronautical Knowledge"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated-from-title"
            />
          </div>

          {/* Category + Document Code row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ToolkitResourceCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_code">Document Code</Label>
              <Input
                id="document_code"
                value={documentCode}
                onChange={(e) => setDocumentCode(e.target.value)}
                placeholder="e.g. FAA-H-8083-25C"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the resource"
              required
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="ppl, weather, airspace"
            />
          </div>

          {/* PDF Upload / URL */}
          <div className="space-y-2">
            <Label>PDF Source *</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <Input
                  name="pdf_file"
                  type="file"
                  accept="application/pdf"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Or provide a URL directly:
              </p>
              <Input
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://www.faa.gov/..."
              />
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Thumbnail (optional)</Label>
            <Input
              name="thumbnail_file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </div>

          {/* Featured + Sort Order row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_featured"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_featured" className="cursor-pointer">
                Featured resource
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                min={0}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEdit
                  ? "Update Resource"
                  : "Create Resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
