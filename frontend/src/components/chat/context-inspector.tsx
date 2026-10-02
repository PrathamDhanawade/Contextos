import { Brain, FileText, GitBranch, Network, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ChatEntity, ChatGraphRelationship, ChatSource } from "@/lib/api";
import { cn } from "@/lib/utils";

export type ChatMemoryUsed = {
  id?: string;
  memory_type?: string;
  content: string;
  similarity?: number;
};

export type AssistantContext = {
  sources?: ChatSource[];
  memoriesUsed?: ChatMemoryUsed[];
  graphRelationships?: ChatGraphRelationship[];
  entities?: ChatEntity[];
};

export type InspectorTab = "overview" | "relationships";

const RELATIONSHIP_GROUPS: { label: string; match: RegExp }[] = [
  { label: "Education", match: /educat|attend|studied|school|university|degree|college/i },
  { label: "Companies", match: /found|work|employ|company|microsoft|co-?found|joined|ceo|partnered_with/i },
  { label: "People", match: /met|related|coexist|friend|family|married|son|daughter|wife|husband/i },
  { label: "Projects", match: /built|created|developed|wrote|program|project|invent/i },
  { label: "Events", match: /became|donat|left|invest|retired|died|sold/i },
];

export function uniqueDocuments(sources: ChatSource[] = []) {
  const byId = new Map<string, ChatSource[]>();
  for (const source of sources) {
    const key = source.document_id ?? source.document ?? "document";
    const list = byId.get(key) ?? [];
    list.push(source);
    byId.set(key, list);
  }
  return Array.from(byId.entries()).map(([id, chunks]) => {
    const pages = chunks
      .flatMap((chunk) => [chunk.page_start, chunk.page_end])
      .filter((page): page is number => page != null);
    const minPage = pages.length ? Math.min(...pages) : null;
    const maxPage = pages.length ? Math.max(...pages) : null;
    return {
      id,
      title: chunks[0]?.document ?? "Document",
      count: chunks.length,
      pageLabel:
        minPage == null
          ? null
          : minPage === maxPage
            ? `p.${minPage}`
            : `p.${minPage}–${maxPage}`,
    };
  });
}

export function groupRelationships(
  relationships: ChatGraphRelationship[],
  focusName?: string,
) {
  const groups = new Map<string, ChatGraphRelationship[]>();

  for (const relationship of relationships) {
    const haystack = `${relationship.relationship} ${relationship.source} ${relationship.target}`;
    const group =
      RELATIONSHIP_GROUPS.find((item) => item.match.test(haystack))?.label ?? "Other";
    const list = groups.get(group) ?? [];
    list.push(relationship);
    groups.set(group, list);
  }

  const order = [...RELATIONSHIP_GROUPS.map((item) => item.label), "Other"];
  return order
    .filter((label) => (groups.get(label)?.length ?? 0) > 0)
    .map((label) => ({
      label,
      items: groups.get(label) ?? [],
      focusName,
    }));
}

export function ContextUsedBar({
  context,
  onInspect,
}: {
  context: AssistantContext;
  onInspect: () => void;
}) {
  const passages = context.sources?.length ?? 0;
  const relationships = context.graphRelationships?.length ?? 0;
  const memories = context.memoriesUsed?.length ?? 0;

  if (passages + relationships + memories === 0) return null;

  return (
    <button
      type="button"
      onClick={onInspect}
      className="mt-4 w-full rounded-xl border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:bg-muted/30"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Context used
        </span>
        <span className="text-[11px] text-foreground/70">Inspect →</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="size-3.5 shrink-0" />
          {passages} passage{passages === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Brain className="size-3.5 shrink-0" />
          {memories} memor{memories === 1 ? "y" : "ies"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="size-3.5 shrink-0" />
          {relationships} relationship{relationships === 1 ? "" : "s"}
        </span>
      </div>
    </button>
  );
}

export function SourceChips({ sources }: { sources?: ChatSource[] }) {
  const documents = uniqueDocuments(sources);
  if (documents.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {documents.map((document) => (
        <span
          key={document.id}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-surface-raised/40 px-2.5 py-1 text-[11px]"
        >
          <FileText className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{document.title}</span>
          {document.pageLabel && (
            <span className="shrink-0 text-muted-foreground">{document.pageLabel}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function RelationshipPreview({
  relationships,
  onViewAll,
}: {
  relationships: ChatGraphRelationship[];
  onViewAll: () => void;
}) {
  if (relationships.length === 0) return null;
  const preview = relationships.slice(0, 6);

  return (
    <div className="mt-3">
      <p className="pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Key relationships
      </p>
      <ul className="space-y-1.5 text-[13px]">
        {preview.map((relationship, index) => (
          <li key={`${relationship.source}-${relationship.target}-${index}`}>
            <span className="font-medium">{relationship.source}</span>{" "}
            <span className="italic text-muted-foreground">{relationship.relationship}</span>{" "}
            <span className="font-medium">{relationship.target}</span>
          </li>
        ))}
      </ul>
      {relationships.length > preview.length && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 px-2 text-xs"
          onClick={onViewAll}
        >
          View all {relationships.length} relationships
        </Button>
      )}
    </div>
  );
}

function RelationshipLine({
  relationship,
}: {
  relationship: ChatGraphRelationship;
}) {
  return (
    <div className="rounded-md px-2 py-1.5 text-[13px] hover:bg-surface-raised/50">
      <span className="font-medium">{relationship.source}</span>{" "}
      <span className="italic text-muted-foreground">{relationship.relationship}</span>{" "}
      <span className="font-medium">{relationship.target}</span>
      {relationship.page != null && (
        <span className="text-muted-foreground"> · p.{relationship.page}</span>
      )}
    </div>
  );
}

export function ContextInspectorDrawer({
  open,
  onOpenChange,
  context,
  tab,
  onTabChange,
  focusEntity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AssistantContext | null;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  focusEntity?: string | undefined;
}) {
  const sources = context?.sources ?? [];
  const memories = context?.memoriesUsed ?? [];
  const relationships = context?.graphRelationships ?? [];
  const entities = context?.entities ?? [];
  const grouped = groupRelationships(relationships, focusEntity);
  const title = focusEntity ? `${focusEntity} — Relationships` : "Context inspector";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription>
            Evidence from documents, memories, and the knowledge graph.
          </SheetDescription>
        </SheetHeader>

        <div className="flex gap-1 border-b px-4 py-2">
          {(
            [
              ["overview", "Overview"],
              ["relationships", "Relationships"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onTabChange(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs",
                tab === value
                  ? "bg-surface-raised text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-5 py-5">
            {tab === "overview" && (
              <>
                <section>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <FileText className="size-3.5" />
                    Passages
                  </p>
                  {sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No document passages used.</p>
                  ) : (
                    <div className="space-y-2">
                      {sources.map((source, index) => (
                        <div
                          key={`${source.document_id}-${index}`}
                          className="rounded-lg border border-border/70 px-3 py-2"
                        >
                          <div className="flex gap-2 text-[13px] font-medium">
                            <span className="truncate">{source.document ?? "Document"}</span>
                            <span className="ml-auto shrink-0 text-muted-foreground">
                              p.{source.page_start ?? "?"}
                            </span>
                          </div>
                          {typeof source.similarity === "number" && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Similarity {(source.similarity * 100).toFixed(0)}%
                            </p>
                          )}
                          {source.preview && (
                            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                              {source.preview}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Brain className="size-3.5" />
                    Memories
                  </p>
                  {memories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No memories used.</p>
                  ) : (
                    <div className="space-y-2">
                      {memories.map((memory) => (
                        <div
                          key={memory.id ?? memory.content}
                          className="rounded-lg border border-border/70 px-3 py-2"
                        >
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {memory.memory_type || "memory"}
                            {typeof memory.similarity === "number"
                              ? ` · ${(memory.similarity * 100).toFixed(0)}%`
                              : ""}
                          </p>
                          <p className="mt-1 text-sm text-foreground/90">{memory.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    Entities
                  </p>
                  {entities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entities matched.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {entities.map((entity) => (
                        <span
                          key={`${entity.name}-${entity.type}`}
                          className="rounded-md border border-border/70 px-2 py-0.5 text-[11px]"
                        >
                          {entity.name}
                          <span className="text-muted-foreground"> · {entity.type}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {tab === "relationships" && (
              <>
                {grouped.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No graph relationships retrieved.</p>
                ) : (
                  grouped.map((group) => (
                    <section key={group.label}>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <GitBranch className="size-3.5" />
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((relationship, index) => (
                          <RelationshipLine
                            key={`${group.label}-${index}`}
                            relationship={relationship}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function AnswerActions({
  onViewSources,
  onOpenGraph,
  onFollowUp,
  hasSources,
  hasGraph,
}: {
  onViewSources: () => void;
  onOpenGraph: () => void;
  onFollowUp: () => void;
  hasSources: boolean;
  hasGraph: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={onViewSources}
        disabled={!hasSources}
      >
        View sources
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={onOpenGraph}
        disabled={!hasGraph}
      >
        <Network className="mr-1 size-3.5" />
        Open graph
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={onFollowUp}
      >
        Ask follow-up
      </Button>
    </div>
  );
}
