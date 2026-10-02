import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Send } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/ui-bits";
import {
  AnswerActions,
  ContextInspectorDrawer,
  ContextUsedBar,
  SourceChips,
  type AssistantContext,
  type InspectorTab,
} from "@/components/chat/context-inspector";
import { ChatMarkdown } from "@/components/chat/markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat, useCreateSession, useSessionMessages, useSessions } from "@/lib/hooks";
import { formatRelative } from "@/lib/mappers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>) => ({
    entity: typeof search["entity"] === "string" ? search["entity"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Chat — ContextOS" }],
  }),
  component: ChatPage,
});

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
} & AssistantContext;

function messageKey(role: string, content: string) {
  return `${role}:${content}`;
}

function primaryEntity(message: LocalMessage) {
  return (
    message.entities?.find((entity) =>
      /person|people|org|company|book/i.test(entity.type),
    )?.name ??
    message.entities?.[0]?.name ??
    message.graphRelationships?.[0]?.source
  );
}

function followUps(message: LocalMessage) {
  const suggestions: string[] = [];
  const focus = primaryEntity(message);
  const people = (message.entities ?? []).filter(
    (entity) =>
      /person/i.test(entity.type) &&
      entity.name.toLowerCase() !== focus?.toLowerCase(),
  );
  const compareWith = people[0]?.name;

  if (compareWith && focus) {
    suggestions.push(`Compare ${focus} with ${compareWith}`);
  }
  if (focus) {
    suggestions.push(`Show ${focus} in the knowledge graph`);
  }
  if ((message.sources?.length ?? 0) > 0) {
    suggestions.push("Show only document evidence for this");
  }

  return suggestions.slice(0, 3);
}

const demoQuestions = [
  "What did Ronald Read invest his money in?",
  "How were Ronald Read and Richard Fuscone different?",
  "What do you remember about me?",
  "How is Ronald Read connected to Richard Fuscone?",
];

function hasEvidence(message: LocalMessage) {
  return (
    (message.sources?.length ?? 0) > 0 ||
    (message.graphRelationships?.length ?? 0) > 0 ||
    (message.memoriesUsed?.length ?? 0) > 0 ||
    (message.entities?.length ?? 0) > 0
  );
}

function ChatPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const sessionsQuery = useSessions();
  const createSession = useCreateSession();
  const chatMutation = useChat();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<LocalMessage[]>([]);
  const [inspectorMessage, setInspectorMessage] = useState<LocalMessage | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("overview");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useSessionMessages(sessionId);
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  useEffect(() => {
    if (!sessionId && sessions[0]) {
      setSessionId(sessions[0].id);
    }
  }, [sessionId, sessions]);

  useEffect(() => {
    if (search.entity) {
      setDraft(`Tell me about ${search.entity} and its relationships.`);
    }
  }, [search.entity]);

  const selectSession = (id: string) => {
    setPending([]);
    setInspectorMessage(null);
    setSessionId(id);
  };

  const messages: LocalMessage[] = useMemo(() => {
    const fromApi = (messagesQuery.data ?? []).map((message, index) => ({
      id: `${sessionId}-${index}-${message.role}`,
      role: message.role,
      content: message.content,
    }));

    const apiKeys = new Set(
      fromApi.map((message) => messageKey(message.role, message.content)),
    );

    const enrichedApi = fromApi.map((apiMessage) => {
      if (apiMessage.role !== "assistant") return apiMessage;

      const enriched = pending.find(
        (message) =>
          message.role === "assistant" &&
          message.content === apiMessage.content &&
          (message.sources ||
            message.memoriesUsed ||
            message.graphRelationships ||
            message.entities),
      );

      if (!enriched) return apiMessage;

      return {
        ...apiMessage,
        sources: enriched.sources,
        memoriesUsed: enriched.memoriesUsed,
        graphRelationships: enriched.graphRelationships,
        entities: enriched.entities,
      };
    });

    const pendingOnly = pending.filter(
      (message) => !apiKeys.has(messageKey(message.role, message.content)),
    );

    return [...enrichedApi, ...pendingOnly];
  }, [messagesQuery.data, pending, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatMutation.isPending]);

  const sendQuestion = async (question: string) => {
    if (!question || chatMutation.isPending) return;

    setDraft("");
    setPending((prev) => [
      ...prev,
      { id: `local-u-${Date.now()}`, role: "user", content: question },
    ]);

    try {
      const result = await chatMutation.mutateAsync({
        question,
        session_id: sessionId,
      });

      setPending((prev) => [
        ...prev,
        {
          id: `local-a-${Date.now()}`,
          role: "assistant",
          content: result.answer,
          sources: result.sources ?? [],
          memoriesUsed: (result.memories_used ?? []).map((memory) => {
            const used: {
              id?: string;
              memory_type?: string;
              content: string;
              similarity?: number;
            } = {
              content: memory.content,
            };
            if (memory.id) used.id = memory.id;
            if (memory.memory_type) used.memory_type = memory.memory_type;
            if (typeof memory.similarity === "number") used.similarity = memory.similarity;
            return used;
          }),
          graphRelationships: result.graph_relationships ?? [],
          entities:
            result.entities ??
            (result.knowledge?.entities ?? []).map((entity) => ({
              name: entity.name,
              type: entity.type || "topic",
            })),
        },
      ]);
      setSessionId(result.session_id);
    } catch (err) {
      setPending((prev) => prev.slice(0, -1));
      toast.error("Chat failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const send = async () => {
    await sendQuestion(draft.trim());
  };

  const onNewSession = async () => {
    try {
      const session = await createSession.mutateAsync();
      setPending([]);
      setInspectorMessage(null);
      setSessionId(session.id);
    } catch (err) {
      toast.error("Could not create session", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const openInspector = (message: LocalMessage, tab: InspectorTab = "overview") => {
    setInspectorTab(tab);
    setInspectorMessage(message);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
          <span className="text-sm font-medium">Sessions</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2"
            onClick={() => void onNewSession()}
            disabled={createSession.isPending}
          >
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessionsQuery.isLoading && (
            <p className="px-2 py-4 text-xs text-muted-foreground">Loading…</p>
          )}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session.id)}
              className={cn(
                "mb-0.5 w-full rounded-md px-2.5 py-2 text-left transition-colors",
                sessionId === session.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <div className="truncate text-[13px]">{session.title || "Untitled session"}</div>
              <div className="text-mono-xs text-muted-foreground">
                {formatRelative(session.created_at)}
              </div>
            </button>
          ))}
          {!sessionsQuery.isLoading && sessions.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No sessions yet. Ask a question to start.
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b px-6 py-4 md:px-8">
          <PageHeader
            title="Context Chat"
            description="Ask across documents, memory, and relationships — then inspect exactly what ContextOS used."
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          {messages.length === 0 && !chatMutation.isPending ? (
            <div className="mx-auto max-w-3xl">
              <EmptyState
                icon={Send}
                title="Explore what ContextOS knows"
                description="Ask across documents, long-term memory, and the knowledge graph."
              />

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {demoQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendQuestion(question)}
                    className="rounded-xl border border-border/70 bg-surface-raised/40 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-raised"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8">
              {messages.map((message) => {
                const suggestions = message.role === "assistant" ? followUps(message) : [];
                const focus = primaryEntity(message);

                return (
                  <div key={message.id} className="space-y-1">
                    {message.role === "user" ? (
                      <div className="ml-12 rounded-2xl bg-surface-raised/70 px-4 py-3">
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    ) : (
                      <div className="pr-4">
                        <ChatMarkdown content={message.content} />

                        <SourceChips sources={message.sources ?? []} />

                        {hasEvidence(message) && (
                          <>
                            <ContextUsedBar
                              context={message}
                              onInspect={() => openInspector(message, "overview")}
                            />

                            <AnswerActions
                              hasSources={(message.sources?.length ?? 0) > 0}
                              hasGraph={
                                (message.graphRelationships?.length ?? 0) > 0 ||
                                Boolean(focus)
                              }
                              onViewSources={() => openInspector(message, "overview")}
                              onOpenGraph={() =>
                                void navigate({
                                  to: "/graph",
                                  search: {
                                    documentId: undefined,
                                    entity: focus,
                                  },
                                })
                              }
                              onFollowUp={() => {
                                if (suggestions[0]) setDraft(suggestions[0]);
                              }}
                            />
                          </>
                        )}

                        {suggestions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                className="rounded-full border border-border/70 px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                                onClick={() => void sendQuestion(suggestion)}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {chatMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Retrieving context…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 md:px-8">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your documents or personal context…"
              className="min-h-[44px] resize-none"
              rows={2}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              className="h-auto shrink-0 self-end"
              onClick={() => void send()}
              disabled={!draft.trim() || chatMutation.isPending}
            >
              {chatMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <ContextInspectorDrawer
        open={inspectorMessage != null}
        onOpenChange={(open) => {
          if (!open) setInspectorMessage(null);
        }}
        context={inspectorMessage}
        tab={inspectorTab}
        onTabChange={setInspectorTab}
        focusEntity={inspectorMessage ? primaryEntity(inspectorMessage) : undefined}
      />
    </div>
  );
}
