import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Network } from "lucide-react";
import { PageHeader, StatusPill } from "@/components/app/ui-bits";
import { api } from "@/lib/api";
import { useDocuments } from "@/lib/hooks";
import {
  documentTitle,
  formatRelative,
  mapDocStatus,
  mapDocStage,
  statusProgress,
} from "@/lib/mappers";
import { PipelineTimeline } from "@/components/app/ui-bits";
import { PIPELINE_STAGES } from "@/lib/contextos-data";

export const Route = createFileRoute("/documents/$documentId")({
  head: ({ params }) => ({
    meta: [{ title: `Document ${params.documentId} — ContextOS` }],
  }),
  component: DocumentDetailPage,
});

function DocumentDetailPage() {
  const { documentId } = Route.useParams();
  const docsQuery = useDocuments();
  const doc = (docsQuery.data ?? []).find((d) => d.id === documentId);

  const graphQuery = useQuery({
    queryKey: ["document-graph", documentId],
    queryFn: () => api.getDocumentGraph(documentId),
  });

  const status = mapDocStatus(doc?.status);
  const stage = mapDocStage(doc?.status);
  const progress = statusProgress(doc?.status);

  return (
    <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10 md:py-14">
      <Link
        to="/documents"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All documents
      </Link>

      <PageHeader
        title={doc ? documentTitle(doc) : "Document"}
        description={
          doc
            ? `Status ${doc.status ?? "unknown"} · uploaded ${formatRelative(doc.created_at)}`
            : `ID ${documentId}`
        }
        action={doc ? <StatusPill status={status} /> : undefined}
      />

      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-info transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="pb-4 text-sm font-semibold">Pipeline</h2>
          <PipelineTimeline
            stage={stage === "failed" ? "parsing" : stage}
            failed={status === "failed"}
            timings={PIPELINE_STAGES.map((s) => ({
              id: s.id,
              ms: status === "ready" || mapDocStage(doc?.status) === s.id ? 1000 : 0,
            }))}
          />
        </section>

        <section className="panel p-6">
          <div className="flex items-center gap-2 pb-4">
            <Network className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Document graph</h2>
            <Link
              to="/graph"
              search={{ documentId }}
              className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Open focused graph
            </Link>
          </div>
          {graphQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading graph…
            </div>
          ) : graphQuery.isError ? (
            <p className="text-sm text-destructive">Could not load document graph.</p>
          ) : (
            <>
              <p className="pb-4 text-xs text-muted-foreground">
                {graphQuery.data?.entity_count ?? 0} entities ·{" "}
                {graphQuery.data?.relationship_count ?? 0} relationships
              </p>
              <ul className="max-h-[360px] space-y-2 overflow-y-auto">
                {(graphQuery.data?.entities ?? []).slice(0, 40).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 rounded-md border bg-surface-raised/40 px-3 py-2 text-[13px]"
                  >
                    <span className="truncate font-medium">{e.name}</span>
                    <span className="ml-auto shrink-0 text-mono-xs text-muted-foreground">
                      {e.entity_type}
                    </span>
                  </li>
                ))}
                {(graphQuery.data?.entities ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    No entities extracted for this document yet.
                  </li>
                )}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
