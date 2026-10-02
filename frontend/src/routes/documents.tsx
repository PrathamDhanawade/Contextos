import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { EmptyState, PageHeader, StatusPill } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import {
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
} from "@/lib/hooks";
import {
  documentTitle,
  fileTypeFromName,
  formatRelative,
  mapDocStatus,
  statusProgress,
} from "@/lib/mappers";
import { toast } from "sonner";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [{ title: "Documents — ContextOS" }],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const docsQuery = useDocuments();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const documents = docsQuery.data ?? [];

  const onPick = async (file: File | null) => {
    if (!file) return;
    try {
      toast("Uploading…", { description: file.name });
      const result = await upload.mutateAsync(file);
      toast.success("Upload complete", {
        description: `${result.document?.title ?? file.name} · ${result.chunks_saved ?? 0} chunks`,
      });
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}”?`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Document deleted");
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-10 md:py-14">
      <PageHeader
        title="Documents"
        description="Upload PDFs into the ingestion pipeline — parse, chunk, embed, extract knowledge."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
            />
            <Button
              size="sm"
              className="gap-1.5"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload PDF
            </Button>
          </>
        }
      />

      {docsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading documents…
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload a PDF to start building your retrieval corpus and knowledge graph."
          action={
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              Upload PDF
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-surface-raised/50 text-mono-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const title = documentTitle(doc);
                const status = mapDocStatus(doc.status);
                const progress = statusProgress(doc.status);
                return (
                  <tr key={doc.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to="/documents/$documentId"
                        params={{ documentId: doc.id }}
                        className="font-medium hover:underline"
                      >
                        {title}
                      </Link>
                      {status !== "ready" && status !== "failed" && (
                        <div className="mt-2 h-1 max-w-[180px] overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-info"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fileTypeFromName(doc.filename || doc.title)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelative(doc.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={remove.isPending}
                        onClick={() => void onDelete(doc.id, title)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
