import { createFileRoute } from "@tanstack/react-router";
import { Loader2, UserSquare2 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/ui-bits";
import { useContextBundle } from "@/lib/hooks";
import { formatRelative, memoryTypeLabel } from "@/lib/mappers";

export const Route = createFileRoute("/my-context")({
  head: () => ({
    meta: [{ title: "My Context — ContextOS" }],
  }),
  component: MyContextPage,
});

function MyContextPage() {
  const contextQuery = useContextBundle();
  const memories = contextQuery.data?.memories ?? [];
  const entities = contextQuery.data?.entities ?? [];

  const byType = entities.reduce<Record<string, typeof entities>>((acc, e) => {
    const key = (e.entity_type || "other").toLowerCase();
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10 md:py-14">
      <PageHeader
        title="My Context"
        description="A living profile assembled from memories and graph entities about you and your work."
      />

      {contextQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading context…
        </div>
      ) : memories.length === 0 && entities.length === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title="No personal context yet"
          description="Chat about yourself or upload docs — memories and entities will appear here."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel p-6">
            <h2 className="pb-4 text-sm font-semibold">Known facts</h2>
            <ul className="space-y-3">
              {memories.slice(0, 20).map((m) => (
                <li key={m.id} className="rounded-md border bg-surface-raised/40 px-3 py-2">
                  <div className="flex items-center gap-2 pb-1 text-mono-xs uppercase text-muted-foreground">
                    <span>{memoryTypeLabel(m)}</span>
                    <span className="ml-auto">{formatRelative(m.created_at)}</span>
                  </div>
                  <p className="text-[13px]">{m.content}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-6">
            <h2 className="pb-4 text-sm font-semibold">Entity clusters</h2>
            <div className="space-y-4">
              {Object.entries(byType).map(([type, list]) => (
                <div key={type}>
                  <p className="pb-2 text-mono-xs uppercase text-muted-foreground">
                    {type} · {list.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {list.slice(0, 24).map((e) => (
                      <span
                        key={e.id}
                        className="rounded-md border bg-surface px-2 py-1 text-[12px]"
                      >
                        {e.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
