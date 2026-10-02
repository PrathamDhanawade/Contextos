import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CircleDot,
  Filter,
  GitBranch,
  Loader2,
  Network,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContextBundle } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/graph")({
  validateSearch: (search: Record<string, unknown>) => ({
    documentId: typeof search["documentId"] === "string" ? search["documentId"] : undefined,
    entity: typeof search["entity"] === "string" ? search["entity"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Knowledge Graph — ContextOS" }],
  }),
  component: GraphPage,
});

type EntityRecord = {
  id: string;
  name: string;
  entity_type: string;
  created_at?: string | null;
  source_document_id?: string | null;
};

type RelationshipRecord = {
  id?: string;
  relationship: string;
  source_page?: number | null;
  source_document_id?: string | null;
  source_type?: string | null;
  source?: { name: string; entity_type?: string } | null;
  target?: { name: string; entity_type?: string } | null;
};

type ExplorerNodeData = {
  label: string;
  type: string;
  active: boolean;
  muted?: boolean;
};

const MAX_DEFAULT_NODES = 8;
const MAX_RENDER_NODES = 36;
const EDGE_BASE = "rgba(226, 232, 240, 0.48)";
const EDGE_HIGHLIGHT = "rgba(248, 250, 252, 0.92)";
const EDGE_MUTED = "rgba(148, 163, 184, 0.24)";
const LABEL_BG = "rgba(10, 12, 16, 0.94)";

function scoreEntity(entity: EntityRecord, adjacency: Map<string, RelationshipRecord[]>) {
  const degree = adjacency.get(entity.id)?.length ?? 0;
  const createdAt = entity.created_at ? new Date(entity.created_at).getTime() : 0;
  // Prefer connected nodes, but keep recent entities visible in the default view.
  const ageHours = createdAt
    ? Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60))
    : 10_000;
  const recencyBoost = Math.max(0, 48 - ageHours);
  return degree * 4 + recencyBoost;
}

function resolveRelationshipIds(entities: EntityRecord[], relationships: RelationshipRecord[]) {
  const byName = new Map(entities.map((entity) => [entity.name.toLowerCase(), entity]));
  return relationships
    .map((relationship, index) => {
      const source = relationship.source?.name
        ? byName.get(relationship.source.name.toLowerCase())
        : undefined;
      const target = relationship.target?.name
        ? byName.get(relationship.target.name.toLowerCase())
        : undefined;
      if (!source || !target) return null;
      return {
        ...relationship,
        edgeId: relationship.id ?? `edge-${index}`,
        sourceId: source.id,
        targetId: target.id,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function buildAdjacency(entities: EntityRecord[], relationships: RelationshipRecord[]) {
  const adjacency = new Map<string, RelationshipRecord[]>();
  entities.forEach((entity) => adjacency.set(entity.id, []));

  for (const relationship of resolveRelationshipIds(entities, relationships)) {
    adjacency.get(relationship.sourceId)?.push(relationship);
    adjacency.get(relationship.targetId)?.push(relationship);
  }

  return adjacency;
}

function collectNeighborhood(
  rootId: string,
  depth: 1 | 2,
  adjacency: Map<string, RelationshipRecord[]>,
) {
  const visited = new Set<string>([rootId]);
  let frontier = new Set<string>([rootId]);

  for (let hop = 0; hop < depth; hop += 1) {
    const next = new Set<string>();
    for (const nodeId of frontier) {
      for (const relationship of adjacency.get(nodeId) ?? []) {
        const sourceId = (relationship as RelationshipRecord & { sourceId: string }).sourceId;
        const targetId = (relationship as RelationshipRecord & { targetId: string }).targetId;
        const neighborId = sourceId === nodeId ? targetId : sourceId;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          next.add(neighborId);
        }
      }
    }
    frontier = next;
  }

  return visited;
}

function layoutNodes(
  entities: EntityRecord[],
  focusId: string | null,
  adjacency: Map<string, RelationshipRecord[]>,
): Node<ExplorerNodeData>[] {
  if (entities.length === 0) return [];

  const centerX = 0;
  const centerY = 0;
  const ringRadius = 320;
  const focusEntity = focusId ? entities.find((entity) => entity.id === focusId) : null;

  if (!focusEntity) {
    return entities.map((entity, index) => {
      const cols = Math.ceil(Math.sqrt(Math.max(entities.length, 1)));
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        id: entity.id,
        type: "entityNode",
        position: { x: col * 220, y: row * 120 },
        data: {
          label: entity.name,
          type: entity.entity_type,
          active: false,
        },
      };
    });
  }

  const neighbors = entities.filter((entity) => entity.id !== focusEntity.id);
  return [
    {
      id: focusEntity.id,
      type: "entityNode",
      position: { x: centerX, y: centerY },
      data: {
        label: focusEntity.name,
        type: focusEntity.entity_type,
        active: true,
      },
    },
    ...neighbors.map((entity, index) => {
      const angle = (index / Math.max(neighbors.length, 1)) * Math.PI * 2;
      const isDirect = (adjacency.get(focusEntity.id) ?? []).some((relationship) => {
        const resolved = relationship as RelationshipRecord & {
          sourceId: string;
          targetId: string;
        };
        return resolved.sourceId === entity.id || resolved.targetId === entity.id;
      });
      return {
        id: entity.id,
        type: "entityNode",
        position: {
          x: centerX + Math.cos(angle) * ringRadius,
          y: centerY + Math.sin(angle) * ringRadius,
        },
        data: {
          label: entity.name,
          type: entity.entity_type,
          active: false,
          muted: !isDirect,
        },
      };
    }),
  ];
}

function EntityNode({ data }: NodeProps<Node<ExplorerNodeData>>) {
  return (
    <div
      className={cn(
        "min-w-[170px] max-w-[220px] rounded-xl border px-3 py-2 text-left shadow-sm",
        data.active
          ? "border-slate-300/35 bg-slate-950 text-slate-50 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.35)]"
          : data.muted
            ? "border-slate-700/55 bg-slate-950/92 text-slate-400"
            : "border-slate-600/70 bg-slate-950/96 text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.22)]",
      )}
    >
      <Handle type="target" position={Position.Top} className="!border-0 !bg-slate-300/80" />
      <div className="truncate text-[13px] font-medium">{data.label}</div>
      <div className="mt-1 text-mono-xs uppercase tracking-wide text-slate-400">{data.type}</div>
      <Handle type="source" position={Position.Bottom} className="!border-0 !bg-slate-300/80" />
    </div>
  );
}

function GraphPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const contextQuery = useContextBundle();
  const entities = useMemo(() => contextQuery.data?.entities ?? [], [contextQuery.data?.entities]);
  const relationships = useMemo(
    () => contextQuery.data?.relationships ?? [],
    [contextQuery.data?.relationships],
  );
  const documents = useMemo(
    () => contextQuery.data?.documents ?? [],
    [contextQuery.data?.documents],
  );
  const memories = useMemo(() => contextQuery.data?.memories ?? [], [contextQuery.data?.memories]);
  const [searchText, setSearchText] = useState(search.entity ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [mode, setMode] = useState<"graph" | "list">("graph");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string[]>([]);
  const [documentFilter, setDocumentFilter] = useState(search.documentId ?? "all");
  const [flow, setFlow] = useState<ReactFlowInstance<Node<ExplorerNodeData>, Edge> | null>(null);

  useEffect(() => {
    if (search.entity && search.entity !== searchText) {
      setSearchText(search.entity);
    }
  }, [search.entity, searchText]);

  useEffect(() => {
    if (search.documentId && search.documentId !== documentFilter) {
      setDocumentFilter(search.documentId);
    }
  }, [documentFilter, search.documentId]);

  const resolvedRelationships = useMemo(
    () => resolveRelationshipIds(entities, relationships),
    [entities, relationships],
  );
  const adjacency = useMemo(
    () => buildAdjacency(entities, relationships),
    [entities, relationships],
  );
  const documentsById = useMemo(
    () => new Map(documents.map((document) => [document.id, document])),
    [documents],
  );
  const entityTypes = useMemo(
    () => Array.from(new Set(entities.map((entity) => entity.entity_type))).sort(),
    [entities],
  );

  const entityIdsInDocument = useMemo(() => {
    if (documentFilter === "all") return null;

    const ids = new Set<string>();
    const byName = new Map(entities.map((entity) => [entity.name.toLowerCase(), entity]));

    for (const entity of entities) {
      if (entity.source_document_id === documentFilter) {
        ids.add(entity.id);
      }
    }

    for (const relationship of relationships) {
      if (relationship.source_document_id !== documentFilter) continue;
      const source = relationship.source?.name
        ? byName.get(relationship.source.name.toLowerCase())
        : undefined;
      const target = relationship.target?.name
        ? byName.get(relationship.target.name.toLowerCase())
        : undefined;
      if (source) ids.add(source.id);
      if (target) ids.add(target.id);
    }

    return ids;
  }, [documentFilter, entities, relationships]);

  const filteredEntities = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return entities.filter((entity) => {
      if (entityIdsInDocument && !entityIdsInDocument.has(entity.id)) {
        return false;
      }
      if (entityTypeFilter.length > 0 && !entityTypeFilter.includes(entity.entity_type)) {
        return false;
      }
      if (!q) return true;
      return entity.name.toLowerCase().includes(q);
    });
  }, [entities, entityIdsInDocument, entityTypeFilter, searchText]);

  const defaultEntityIds = useMemo(() => {
    return [...filteredEntities]
      .sort((left, right) => scoreEntity(right, adjacency) - scoreEntity(left, adjacency))
      .slice(0, MAX_DEFAULT_NODES)
      .map((entity) => entity.id);
  }, [adjacency, filteredEntities]);

  useEffect(() => {
    if (filteredEntities.length === 0) {
      setSelectedId(null);
      setFocusedId(null);
      setExpandedIds([]);
      return;
    }

    const currentVisible = new Set(filteredEntities.map((entity) => entity.id));
    if (selectedId && !currentVisible.has(selectedId)) {
      setSelectedId(null);
    }
    if (focusedId && !currentVisible.has(focusedId)) {
      setFocusedId(null);
      setExpandedIds([]);
    }
  }, [filteredEntities, focusedId, selectedId]);

  useEffect(() => {
    if (focusedId || filteredEntities.length === 0) return;

    const exact = filteredEntities.find(
      (entity) => entity.name.toLowerCase() === searchText.trim().toLowerCase(),
    );
    if (exact) {
      setFocusedId(exact.id);
      setSelectedId(exact.id);
      return;
    }

    if (searchText.trim()) {
      const firstMatch = filteredEntities[0];
      if (firstMatch) {
        setFocusedId(firstMatch.id);
        setSelectedId(firstMatch.id);
      }
    }
  }, [filteredEntities, focusedId, searchText]);

  const visibleEntityIds = useMemo(() => {
    if (!focusedId) {
      return new Set(defaultEntityIds);
    }

    const ids = collectNeighborhood(focusedId, depth, adjacency);
    for (const expandedId of expandedIds) {
      const expandedNeighborhood = collectNeighborhood(expandedId, 1, adjacency);
      for (const neighborId of expandedNeighborhood) ids.add(neighborId);
    }
    return new Set([...ids].filter((id) => filteredEntities.some((entity) => entity.id === id)));
  }, [adjacency, defaultEntityIds, depth, expandedIds, filteredEntities, focusedId]);

  const visibleEntities = useMemo(() => {
    return filteredEntities
      .filter((entity) => visibleEntityIds.has(entity.id))
      .slice(0, MAX_RENDER_NODES);
  }, [filteredEntities, visibleEntityIds]);

  const visibleEntityIdSet = useMemo(
    () => new Set(visibleEntities.map((entity) => entity.id)),
    [visibleEntities],
  );

  const visibleEdges = useMemo<Edge[]>(() => {
    return resolvedRelationships
      .filter((relationship) => {
        return (
          visibleEntityIdSet.has(relationship.sourceId) &&
          visibleEntityIdSet.has(relationship.targetId)
        );
      })
      .map((relationship) => {
        const touchesFocus =
          focusedId != null &&
          (relationship.sourceId === focusedId || relationship.targetId === focusedId);

        return {
          id: relationship.edgeId,
          source: relationship.sourceId,
          target: relationship.targetId,
          type: "smoothstep",
          label: relationship.relationship,
          animated: touchesFocus,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: touchesFocus ? EDGE_HIGHLIGHT : EDGE_BASE,
          },
          style: {
            stroke: focusedId ? (touchesFocus ? EDGE_HIGHLIGHT : EDGE_MUTED) : EDGE_BASE,
            strokeWidth: touchesFocus ? 2.1 : 1.7,
          },
          labelStyle: {
            fontSize: 11,
            fill: touchesFocus ? "rgba(248, 250, 252, 0.96)" : "rgba(203, 213, 225, 0.9)",
          },
          labelBgStyle: {
            fill: LABEL_BG,
            fillOpacity: 1,
            stroke: touchesFocus ? "rgba(255,255,255,0.18)" : "rgba(148,163,184,0.12)",
          },
          labelBgPadding: [8, 4] as [number, number],
          labelBgBorderRadius: 6,
          labelShowBg: true,
        };
      });
  }, [focusedId, resolvedRelationships, visibleEntityIdSet]);

  const builtNodes = useMemo(
    () => layoutNodes(visibleEntities, focusedId, adjacency),
    [adjacency, focusedId, visibleEntities],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ExplorerNodeData>>(builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

  useEffect(() => {
    setNodes(builtNodes);
    setEdges(visibleEdges);
  }, [builtNodes, setNodes, setEdges, visibleEdges]);

  useEffect(() => {
    if (!flow || builtNodes.length === 0) return;
    const focusNode = focusedId ? builtNodes.find((node) => node.id === focusedId) : null;
    if (focusNode) {
      flow.setCenter(focusNode.position.x + 90, focusNode.position.y + 30, {
        zoom: depth === 1 ? 1.05 : 0.85,
        duration: 350,
      });
      return;
    }
    flow.fitView({ padding: 0.2, duration: 300 });
  }, [builtNodes, depth, flow, focusedId]);

  const selected =
    entities.find((entity) => entity.id === selectedId) ??
    visibleEntities.find((entity) => entity.id === selectedId) ??
    null;
  const selectedRelationships = useMemo(() => {
    if (!selected) return [];
    return resolvedRelationships.filter(
      (relationship) =>
        relationship.sourceId === selected.id || relationship.targetId === selected.id,
    );
  }, [resolvedRelationships, selected]);
  const relatedMemories = useMemo(() => {
    if (!selected) return [];
    const lowerName = selected.name.toLowerCase();
    return memories
      .filter((memory) => memory.content.toLowerCase().includes(lowerName))
      .slice(0, 6);
  }, [memories, selected]);
  const pageReferences = useMemo(() => {
    if (!selected) return [];
    const pages = new Set<number>();
    for (const relationship of selectedRelationships) {
      if (relationship.source_page != null) {
        pages.add(relationship.source_page);
      }
    }
    return [...pages].sort((left, right) => left - right);
  }, [selected, selectedRelationships]);

  function focusNode(nodeId: string) {
    setFocusedId(nodeId);
    setSelectedId(nodeId);
    setExpandedIds([]);
  }

  function expandNode(nodeId: string) {
    setExpandedIds((current) => (current.includes(nodeId) ? current : [...current, nodeId]));
    setFocusedId((current) => current ?? nodeId);
  }

  function resetView() {
    setSearchText(search.documentId ? "" : "");
    setEntityTypeFilter([]);
    setExpandedIds([]);
    setDepth(1);
    setMode("graph");
    setSelectedId(null);
    setFocusedId(null);
    setDocumentFilter(search.documentId ?? "all");
  }

  const listRows = useMemo(() => {
    return filteredEntities
      .map((entity) => ({
        entity,
        degree: adjacency.get(entity.id)?.length ?? 0,
        recentDocument: entity.source_document_id
          ? (documentsById.get(entity.source_document_id)?.title ?? "Document")
          : "Session / unknown",
      }))
      .sort((left, right) => right.degree - left.degree)
      .slice(0, 50);
  }, [adjacency, documentsById, filteredEntities]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col">
      <div className="border-b px-6 py-4 md:px-8">
        <PageHeader
          title="Knowledge Graph"
          description="Explore a focused subgraph. Search or click an entity to center it, inspect it, and expand outward progressively."
        />
      </div>

      {contextQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading graph…
        </div>
      ) : entities.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            icon={Network}
            title="Graph is empty"
            description="Upload documents or chat so entity extraction can populate the graph."
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-h-0 flex-col">
            <div className="border-b px-6 py-4 md:px-8">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="relative min-w-[260px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search entities..."
                      className="h-10 border-border/80 bg-card pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setMode("graph")}
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs transition-colors",
                        mode === "graph" ? "border-foreground/20 bg-card" : "text-muted-foreground",
                      )}
                    >
                      Graph
                    </button>
                    <button
                      onClick={() => setMode("list")}
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs transition-colors",
                        mode === "list" ? "border-foreground/20 bg-card" : "text-muted-foreground",
                      )}
                    >
                      List
                    </button>
                    <button
                      onClick={() => setDepth(1)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs transition-colors",
                        depth === 1 ? "border-foreground/20 bg-card" : "text-muted-foreground",
                      )}
                    >
                      1-hop
                    </button>
                    <button
                      onClick={() => setDepth(2)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs transition-colors",
                        depth === 2 ? "border-foreground/20 bg-card" : "text-muted-foreground",
                      )}
                    >
                      2-hop
                    </button>
                    <Button
                      variant="outline"
                      className="h-10 border-border/80 bg-card text-xs"
                      onClick={resetView}
                    >
                      <RotateCcw className="size-3.5" />
                      Reset View
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-mono-xs uppercase text-muted-foreground">
                      <Filter className="size-3" />
                      Entity types
                    </span>
                    {entityTypes.map((type) => {
                      const active = entityTypeFilter.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() =>
                            setEntityTypeFilter((current) =>
                              active
                                ? current.filter((value) => value !== type)
                                : [...current, type],
                            )
                          }
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-mono-xs uppercase transition-colors",
                            active
                              ? "border-foreground/20 bg-card text-foreground"
                              : "border-border/80 text-muted-foreground",
                          )}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-mono-xs uppercase text-muted-foreground">Source</span>
                    <select
                      value={documentFilter}
                      onChange={(event) => setDocumentFilter(event.target.value)}
                      className="h-9 rounded-md border border-border/80 bg-card px-3 text-sm text-foreground outline-none"
                    >
                      <option value="all">All sources</option>
                      {documents.map((document) => (
                        <option key={document.id} value={document.id}>
                          {document.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {searchText.trim() && filteredEntities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filteredEntities.slice(0, 8).map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => {
                          focusNode(entity.id);
                          void navigate({
                            to: "/graph",
                            search: {
                              documentId: documentFilter !== "all" ? documentFilter : undefined,
                              entity: entity.name,
                            },
                            replace: true,
                          });
                        }}
                        className="rounded-md border border-border/80 bg-card px-2.5 py-1 text-left text-xs hover:border-foreground/20"
                      >
                        <span className="font-medium">{entity.name}</span>
                        <span className="ml-2 text-mono-xs uppercase text-muted-foreground">
                          {entity.entity_type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              {mode === "list" ? (
                <div className="h-full overflow-y-auto px-6 py-4 md:px-8">
                  <div className="space-y-2">
                    {listRows.map(({ entity, degree, recentDocument }) => (
                      <button
                        key={entity.id}
                        onClick={() => focusNode(entity.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border/80 bg-card/85 px-4 py-3 text-left hover:border-foreground/20"
                      >
                        <CircleDot className="size-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{entity.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {entity.entity_type} · {recentDocument}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-mono-xs text-muted-foreground">
                          <div>{degree} links</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : visibleEntities.length === 0 ? (
                <div className="flex h-full items-center justify-center p-8">
                  <EmptyState
                    icon={Search}
                    title="No entities match these filters"
                    description="Clear a filter, switch source, or search for a different entity."
                  />
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={(_, node) => setSelectedId(node.id)}
                  onInit={setFlow}
                  nodeTypes={{ entityNode: EntityNode }}
                  fitView
                  colorMode="dark"
                  minZoom={0.45}
                  maxZoom={1.6}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={20} size={1.15} color="rgba(255,255,255,0.08)" />
                  <Controls showInteractive={false} />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={() => "rgba(226, 232, 240, 0.72)"}
                    maskColor="rgba(2, 6, 23, 0.7)"
                    className="!border !border-slate-700/70 !bg-slate-950/95"
                  />
                </ReactFlow>
              )}
            </div>
          </div>

          <aside className="min-h-0 border-t bg-background/80 p-4 lg:border-l lg:border-t-0">
            {selected ? (
              <div className="flex h-full flex-col">
                <div className="space-y-2 border-b pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">{selected.name}</h2>
                      <p className="text-mono-xs uppercase text-muted-foreground">
                        {selected.entity_type}
                      </p>
                    </div>
                    {focusedId === selected.id && (
                      <span className="rounded-md border px-2 py-1 text-mono-xs uppercase text-muted-foreground">
                        Focused
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/80 bg-card text-xs"
                      onClick={() => focusNode(selected.id)}
                    >
                      <GitBranch className="size-3.5" />
                      Focus node
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/80 bg-card text-xs"
                      onClick={() => expandNode(selected.id)}
                    >
                      <Network className="size-3.5" />
                      Expand neighbors
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        void navigate({
                          to: "/chat",
                          search: {
                            entity: selected.name,
                          } as never,
                        })
                      }
                    >
                      <Sparkles className="size-3.5" />
                      Ask about this
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pt-4">
                  <section>
                    <p className="pb-2 text-mono-xs uppercase text-muted-foreground">
                      Relationships
                    </p>
                    <ul className="space-y-2 text-[13px]">
                      {selectedRelationships.map((relationship) => {
                        const otherName =
                          relationship.sourceId === selected.id
                            ? relationship.target?.name
                            : relationship.source?.name;
                        const otherEntity = entities.find((entity) => entity.name === otherName);
                        return (
                          <li
                            key={relationship.edgeId}
                            className="rounded-lg border border-border/80 bg-card/85 px-3 py-2"
                          >
                            <div className="text-sm">
                              {relationship.source?.name}{" "}
                              <span className="text-muted-foreground">
                                — {relationship.relationship} →
                              </span>{" "}
                              {relationship.target?.name}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {relationship.source_page != null && (
                                <span className="text-mono-xs text-muted-foreground">
                                  p.{relationship.source_page}
                                </span>
                              )}
                              {otherEntity && (
                                <button
                                  onClick={() => focusNode(otherEntity.id)}
                                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                >
                                  Focus {otherEntity.name}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                      {selectedRelationships.length === 0 && (
                        <li className="rounded-lg border border-dashed border-border/80 px-3 py-3 text-muted-foreground">
                          No linked relationships.
                        </li>
                      )}
                    </ul>
                  </section>

                  <section>
                    <p className="pb-2 text-mono-xs uppercase text-muted-foreground">
                      Related memories
                    </p>
                    <ul className="space-y-2">
                      {relatedMemories.map((memory) => (
                        <li
                          key={memory.id}
                          className="rounded-lg border border-border/80 bg-card/85 px-3 py-2 text-[13px]"
                        >
                          {memory.content}
                        </li>
                      ))}
                      {relatedMemories.length === 0 && (
                        <li className="rounded-lg border border-dashed border-border/80 px-3 py-3 text-[13px] text-muted-foreground">
                          No related memories found.
                        </li>
                      )}
                    </ul>
                  </section>

                  <section>
                    <p className="pb-2 text-mono-xs uppercase text-muted-foreground">Sources</p>
                    <div className="space-y-2">
                      {selected.source_document_id ? (
                        <div className="rounded-lg border border-border/80 bg-card/85 px-3 py-2">
                          <div className="text-sm font-medium">
                            {documentsById.get(selected.source_document_id)?.title ?? "Document"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Source entity record
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/80 px-3 py-3 text-[13px] text-muted-foreground">
                          No document source attached to this entity.
                        </div>
                      )}
                      {pageReferences.length > 0 && (
                        <div className="rounded-lg border border-border/80 bg-card/85 px-3 py-2">
                          <div className="text-xs text-muted-foreground">Page references</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {pageReferences.map((page) => (
                              <span
                                key={page}
                                className="rounded-md border px-2 py-1 text-mono-xs text-muted-foreground"
                              >
                                p.{page}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Inspector</h2>
                <p className="text-sm text-muted-foreground">
                  Select a node to inspect its relationships, memories, and document sources.
                </p>
                <div className="rounded-lg border border-border/80 bg-card/70 p-3 text-xs text-muted-foreground">
                  Default view is intentionally small. Search, filter, or click an entity to open a
                  focused subgraph.
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
