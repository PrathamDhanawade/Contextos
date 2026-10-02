import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  FileText,
  Network,
  GitBranch,
  Plug,
  ArrowUpRight,
  Sparkles,
  FileUp,
  Loader2,
} from "lucide-react";
import { PageHeader, Stat, StatusPill, EmptyState } from "@/components/app/ui-bits";
import { useContextBundle, useDocuments, useHealth } from "@/lib/hooks";
import {
  documentTitle,
  formatRelative,
  mapDocStatus,
  statusProgress,
} from "@/lib/mappers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — ContextOS" },
      {
        name: "description",
        content:
          "System status for your context layer: memories, documents, entities, relationships, ingestion pipeline and connected agents.",
      },
      { property: "og:title", content: "Overview — ContextOS" },
      { property: "og:description", content: "A control center for everything your AI knows." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const health = useHealth();
  const docsQuery = useDocuments();
  const contextQuery = useContextBundle();

  const documents = docsQuery.data ?? contextQuery.data?.documents ?? [];
  const memories = contextQuery.data?.memories ?? [];
  const entities = contextQuery.data?.entities ?? [];
  const relationships = contextQuery.data?.relationships ?? [];

  const processing = documents.filter((d) => {
    const status = mapDocStatus(d.status);
    return status !== "ready" && status !== "failed";
  });

  const recentActivity = [
    ...documents.slice(0, 4).map((d) => ({
      id: `doc-${d.id}`,
      kind: "document" as const,
      label: mapDocStatus(d.status) === "ready" ? "Document ready" : "Document updating",
      detail: documentTitle(d),
      at: formatRelative(d.created_at),
    })),
    ...memories.slice(0, 3).map((m) => ({
      id: `mem-${m.id}`,
      kind: "memory" as const,
      label: "Memory stored",
      detail: m.content,
      at: formatRelative(m.created_at),
    })),
    ...entities.slice(0, 2).map((e) => ({
      id: `ent-${e.id}`,
      kind: "graph" as const,
      label: "Entity indexed",
      detail: `${e.name} · ${e.entity_type}`,
      at: formatRelative(e.created_at),
    })),
  ].slice(0, 8);

  const apiOnline = health.data?.status === "ok";

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-10 md:px-10 md:py-14">
      <PageHeader
        title="Overview"
        description="Live view of your ContextOS backend — documents, memory, graph and API health."
        action={
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs",
              health.isLoading || health.isFetching || !health.isFetched
                ? "border-border text-muted-foreground"
                : apiOnline
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                health.isLoading || health.isFetching || !health.isFetched
                  ? "bg-muted-foreground/50"
                  : apiOnline
                    ? "bg-success"
                    : "bg-destructive",
              )}
            />
            {health.isLoading || !health.isFetched
              ? "Checking API…"
              : apiOnline
                ? "API online"
                : "API offline"}
          </div>
        }
      />

      {(docsQuery.isError || contextQuery.isError) && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not reach ContextOS at the configured API URL. Start the FastAPI server on port 8000.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Memories"
          value={String(memories.length)}
          sub="from /context"
          icon={Brain}
        />
        <Stat
          label="Documents"
          value={String(documents.length)}
          sub={`${processing.length} processing`}
          icon={FileText}
        />
        <Stat
          label="Entities"
          value={String(entities.length)}
          sub="knowledge graph"
          icon={Network}
        />
        <Stat
          label="Relationships"
          value={String(relationships.length)}
          sub="across entities"
          icon={GitBranch}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="panel p-6">
          <div className="flex items-center justify-between pb-5">
            <div>
              <h2 className="text-sm font-semibold">Ingestion pipeline</h2>
              <p className="text-xs text-muted-foreground">
                Documents currently processing on the backend
              </p>
            </div>
            <Link
              to="/documents"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              All documents
            </Link>
          </div>

          {docsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading documents…
            </div>
          ) : processing.length === 0 ? (
            <EmptyState
              icon={FileUp}
              title="Nothing in the pipeline"
              description="Upload a PDF and Docling + chunking + embeddings will show up here while status is processing."
            />
          ) : (
            <div className="space-y-5">
              {processing.map((doc) => {
                const status = mapDocStatus(doc.status);
                const progress = statusProgress(doc.status);
                return (
                  <Link
                    key={doc.id}
                    to="/documents/$documentId"
                    params={{ documentId: doc.id }}
                    className="block rounded-lg border bg-surface-raised/40 p-4 transition-colors duration-200 hover:border-foreground/20"
                  >
                    <div className="flex items-center justify-between gap-3 pb-3">
                      <span className="truncate text-[13px] font-medium">
                        {documentTitle(doc)}
                      </span>
                      <StatusPill status={status} />
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-info transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2 text-mono-xs text-muted-foreground">
                      <span>{doc.status ?? "processing"}</span>
                      <span>{progress}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="pb-5 text-sm font-semibold">Recent activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet — upload a doc or chat.</p>
          ) : (
            <ol className="relative space-y-4">
              {recentActivity.map((a, i) => (
                <li key={a.id} className="relative flex gap-3">
                  {i < recentActivity.length - 1 && (
                    <span className="absolute left-[13px] top-7 h-[calc(100%-0.5rem)] w-px bg-border" />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex size-[26px] shrink-0 items-center justify-center rounded-md border bg-surface",
                      a.kind === "memory" && "text-success",
                      a.kind === "graph" && "text-info",
                    )}
                  >
                    {a.kind === "memory" ? (
                      <Brain className="size-3.5" />
                    ) : a.kind === "graph" ? (
                      <Network className="size-3.5" />
                    ) : (
                      <FileUp className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px]">{a.label}</span>
                      <span className="shrink-0 text-mono-xs text-muted-foreground">{a.at}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="panel p-6">
          <h2 className="pb-4 text-sm font-semibold">Recently uploaded</h2>
          <ul className="space-y-3">
            {documents.slice(0, 4).map((d) => (
              <li key={d.id} className="flex items-center gap-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-[13px]">{documentTitle(d)}</span>
                <StatusPill status={mapDocStatus(d.status)} className="ml-auto" />
              </li>
            ))}
            {documents.length === 0 && (
              <li className="text-sm text-muted-foreground">No documents yet.</li>
            )}
          </ul>
        </section>

        <section className="panel p-6">
          <h2 className="pb-4 text-sm font-semibold">Recently learned</h2>
          <ul className="space-y-3">
            {memories.slice(0, 4).map((m) => (
              <li key={m.id} className="flex gap-3">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="line-clamp-2 text-[13px] text-muted-foreground">{m.content}</p>
              </li>
            ))}
            {memories.length === 0 && (
              <li className="text-sm text-muted-foreground">Chat to start building memory.</li>
            )}
          </ul>
        </section>

        <section className="panel p-6">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-sm font-semibold">Connected agents</h2>
            <Plug className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span className={cn("size-1.5 rounded-full", apiOnline ? "bg-success" : "bg-muted-foreground/50")} />
              FastAPI /search
              <span className="ml-auto text-mono-xs text-muted-foreground">
                {apiOnline ? "ready" : "offline"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-muted-foreground/50" /> MCP (Claude)
              <span className="ml-auto text-mono-xs">:8001</span>
            </div>
            <Link
              to="/connections"
              className="inline-flex items-center gap-1 pt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Manage connections <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
