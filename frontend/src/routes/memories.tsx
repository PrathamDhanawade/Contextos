import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, Brain, Loader2, Search } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/ui-bits";
import { Input } from "@/components/ui/input";
import type { ApiMemory } from "@/lib/api";
import { useContextBundle } from "@/lib/hooks";
import { formatRelative, memoryTypeLabel } from "@/lib/mappers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/memories")({
  head: () => ({
    meta: [{ title: "Memories — ContextOS" }],
  }),
  component: MemoriesPage,
});

function memoryStatus(memory: ApiMemory): "active" | "superseded" {
  return memory.status === "superseded" ? "superseded" : "active";
}

function MemoryCard({ memory }: { memory: ApiMemory }) {
  const status = memoryStatus(memory);

  return (
    <li
      className={cn(
        "panel p-4",
        status === "superseded" && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="rounded border px-1.5 py-0.5 text-mono-xs uppercase text-muted-foreground">
          {memoryTypeLabel(memory)}
        </span>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 text-mono-xs uppercase",
            status === "active"
              ? "border-emerald-500/30 text-emerald-400/90"
              : "text-muted-foreground",
          )}
        >
          {status}
        </span>
        <span className="ml-auto text-mono-xs text-muted-foreground">
          {formatRelative(memory.created_at)}
        </span>
      </div>
      <p className="text-[14px] leading-relaxed">{memory.content}</p>
    </li>
  );
}

function MemoriesPage() {
  const contextQuery = useContextBundle();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "semantic" | "episodic">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "superseded">("all");

  const allMemories = contextQuery.data?.memories ?? [];

  const summary = useMemo(() => {
    let active = 0;
    let superseded = 0;
    let semantic = 0;
    let episodic = 0;

    for (const memory of allMemories) {
      if (memoryStatus(memory) === "superseded") superseded += 1;
      else active += 1;

      const type = memoryTypeLabel(memory);
      if (type === "episodic") episodic += 1;
      else semantic += 1;
    }

    return { active, superseded, semantic, episodic, total: allMemories.length };
  }, [allMemories]);

  const filtered = useMemo(() => {
    return allMemories.filter((memory) => {
      const type = memoryTypeLabel(memory);
      const status = memoryStatus(memory);

      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q.trim()) return true;
      return memory.content.toLowerCase().includes(q.toLowerCase());
    });
  }, [allMemories, q, statusFilter, typeFilter]);

  const chains = useMemo(() => {
    const byId = new Map(filtered.map((memory) => [memory.id, memory]));
    const supersededIds = new Set(
      filtered
        .filter((memory) => memoryStatus(memory) === "superseded")
        .map((memory) => memory.id),
    );

    const history: { older: ApiMemory; newer: ApiMemory }[] = [];
    const used = new Set<string>();

    for (const memory of filtered) {
      if (memoryStatus(memory) !== "superseded" || !memory.superseded_by) continue;
      const newer = byId.get(memory.superseded_by);
      if (!newer) continue;
      history.push({ older: memory, newer });
      used.add(memory.id);
      used.add(newer.id);
    }

    const active = filtered.filter(
      (memory) =>
        memoryStatus(memory) === "active" && !used.has(memory.id),
    );

    const leftoverHistory = filtered.filter(
      (memory) =>
        memoryStatus(memory) === "superseded" && !used.has(memory.id),
    );

    return { active, history, leftoverHistory };
  }, [filtered]);

  const showHistory =
    statusFilter !== "active" &&
    (chains.history.length > 0 || chains.leftoverHistory.length > 0);

  const showActive =
    statusFilter !== "superseded" && chains.active.length > 0;

  return (
    <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10 md:py-14">
      <PageHeader
        title="Memories"
        description="Persistent knowledge ContextOS has learned and updated over time."
      />

      <div className="mb-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{summary.active}</span> Active
        </span>
        <span className="text-border">·</span>
        <span>
          <span className="font-medium text-foreground">{summary.superseded}</span>{" "}
          Superseded
        </span>
        <span className="text-border">·</span>
        <span>
          <span className="font-medium text-foreground">{summary.semantic}</span> Semantic
        </span>
        <span className="text-border">·</span>
        <span>
          <span className="font-medium text-foreground">{summary.episodic}</span> Episodic
        </span>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Filter memories…"
            className="pl-8"
          />
        </div>
        {(["all", "semantic", "episodic"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs capitalize transition-colors",
              typeFilter === type
                ? "border-foreground/30 bg-surface-raised"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {type}
          </button>
        ))}
        <span className="hidden h-4 w-px bg-border sm:block" />
        {(["all", "active", "superseded"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs capitalize transition-colors",
              statusFilter === status
                ? "border-foreground/30 bg-surface-raised"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {contextQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading memories…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No memories yet"
          description="Chat with ContextOS and facts about you will land here via memory extraction."
        />
      ) : (
        <div className="space-y-8">
          {showActive && (
            <section>
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Active memories
              </h2>
              <ul className="space-y-3">
                {chains.active.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </ul>
            </section>
          )}

          {showHistory && (
            <section>
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Memory history
              </h2>
              <div className="space-y-5">
                {chains.history.map(({ older, newer }) => (
                  <div key={`${older.id}-${newer.id}`} className="space-y-2">
                    <ul className="space-y-2">
                      <MemoryCard memory={older} />
                    </ul>
                    <div className="flex items-center gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <ArrowDown className="size-3.5" />
                      updated
                    </div>
                    <ul className="space-y-2">
                      <MemoryCard memory={newer} />
                    </ul>
                  </div>
                ))}
                {chains.leftoverHistory.length > 0 && (
                  <ul className="space-y-3">
                    {chains.leftoverHistory.map((memory) => (
                      <MemoryCard key={memory.id} memory={memory} />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {!showActive && !showHistory && statusFilter === "superseded" && (
            <ul className="space-y-3">
              {filtered.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
