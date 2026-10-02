import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText,
  Brain,
  Network,
  GitBranch,
  LayoutGrid,
  Plug,
  MessagesSquare,
  FlaskConical,
} from "lucide-react";
import { useContextBundle, useDocuments } from "@/lib/hooks";
import { documentTitle } from "@/lib/mappers";

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const docsQuery = useDocuments();
  const contextQuery = useContextBundle();

  const go = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    // Dynamic destinations come from live API data.
    void navigate({ to, params } as never);
  };

  const groups = useMemo(() => {
    const documents = (docsQuery.data ?? []).slice(0, 8).map((d) => ({
      title: documentTitle(d),
      meta: d.status ?? "document",
      href: "/documents/$documentId" as const,
      params: { documentId: d.id },
    }));
    const memories = (contextQuery.data?.memories ?? []).slice(0, 8).map((m) => ({
      title: m.content,
      meta: m.memory_type ?? "memory",
      href: "/memories" as const,
      params: undefined as Record<string, string> | undefined,
    }));
    const entities = (contextQuery.data?.entities ?? []).slice(0, 8).map((e) => ({
      title: e.name,
      meta: e.entity_type,
      href: "/graph" as const,
      params: undefined as Record<string, string> | undefined,
    }));
    const relationships = (contextQuery.data?.relationships ?? [])
      .slice(0, 8)
      .map((r) => ({
        title: `${r.source?.name ?? "?"} — ${r.relationship} → ${r.target?.name ?? "?"}`,
        meta: "relationship",
        href: "/graph" as const,
        params: undefined as Record<string, string> | undefined,
      }));

    return [
      { key: "documents", label: "Documents", icon: FileText, items: documents },
      { key: "memories", label: "Memories", icon: Brain, items: memories },
      { key: "entities", label: "Entities", icon: Network, items: entities },
      {
        key: "relationships",
        label: "Relationships",
        icon: GitBranch,
        items: relationships,
      },
    ];
  }, [docsQuery.data, contextQuery.data]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search documents, memories, entities…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No context matched that query.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/")}>
            <LayoutGrid className="size-4" /> Overview
          </CommandItem>
          <CommandItem onSelect={() => go("/chat")}>
            <MessagesSquare className="size-4" /> Chat
          </CommandItem>
          <CommandItem onSelect={() => go("/evaluation")}>
            <FlaskConical className="size-4" /> Evaluation
          </CommandItem>
          <CommandItem onSelect={() => go("/connections")}>
            <Plug className="size-4" /> Connections
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        {groups.map((g) =>
          g.items.length === 0 ? null : (
            <CommandGroup key={g.key} heading={g.label}>
              {g.items.map((item) => (
                <CommandItem
                  key={`${g.key}-${item.title}`}
                  value={`${g.label} ${item.title}`}
                  onSelect={() => go(item.href, item.params)}
                >
                  <g.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.title}</span>
                  <span className="ml-auto shrink-0 text-mono-xs text-muted-foreground">
                    {item.meta}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ),
        )}
      </CommandList>
    </CommandDialog>
  );
}
