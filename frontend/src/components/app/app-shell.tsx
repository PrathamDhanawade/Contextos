import { useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  MessagesSquare,
  Brain,
  FileText,
  Network,
  UserSquare2,
  Plug,
  Settings,
  Search,
  Upload,
  PanelLeftClose,
  PanelLeft,
  Boxes,
  Loader2,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { useUploadDocument, useHealth } from "@/lib/hooks";
import { toast } from "sonner";

const primaryNav = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/chat", label: "Chat", icon: MessagesSquare },
  { to: "/memories", label: "Memories", icon: Brain },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/graph", label: "Knowledge Graph", icon: Network },
  { to: "/my-context", label: "My Context", icon: UserSquare2 },
] as const;

const systemNav = [
  { to: "/evaluation", label: "Evaluation", icon: FlaskConical },
  { to: "/connections", label: "Connections", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useCommandPalette();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const upload = useUploadDocument();
  const health = useHealth();
  const inputRef = useRef<HTMLInputElement>(null);
  const apiOnline = health.data?.status === "ok";

  const onUpload = async (file: File | null) => {
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

  const renderNavItem = (item: (typeof primaryNav)[number] | (typeof systemNav)[number]) => {
    const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
    const link = (
      <Link
        key={item.to}
        to={item.to}
        className={cn(
          "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <item.icon className="size-[15px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
    return collapsed ? (
      <Tooltip key={item.to}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    ) : (
      link
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-background">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:flex",
            collapsed ? "w-[60px]" : "w-[212px]",
          )}
        >
          <div className="flex h-14 items-center gap-2 px-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-surface-raised">
              <Boxes className="size-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight">ContextOS</div>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
            {primaryNav.map(renderNavItem)}
            <div className={cn("px-2 pb-1 pt-4", collapsed && "pt-3")}>
              {!collapsed && (
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  System
                </p>
              )}
              {collapsed && <div className="mx-auto mb-1 h-px w-4 bg-border" />}
            </div>
            {systemNav.map(renderNavItem)}
          </nav>

          <div className="border-t p-2">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              {collapsed ? <PanelLeft className="size-[15px]" /> : <PanelLeftClose className="size-[15px]" />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md md:px-6">
            <div className="flex items-center gap-2 md:hidden">
              <Boxes className="size-4" />
              <span className="text-sm font-semibold">ContextOS</span>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="group ml-auto flex h-8 w-full max-w-sm items-center gap-2 rounded-md border bg-surface px-2.5 text-left text-[13px] text-muted-foreground transition-colors duration-150 hover:border-foreground/20 md:ml-0"
            >
              <Search className="size-3.5" />
              <span className="truncate">Search context…</span>
              <kbd className="ml-auto hidden rounded border bg-surface-raised px-1.5 py-0.5 text-mono-xs text-muted-foreground sm:block">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={upload.isPending}
                onClick={() => inputRef.current?.click()}
              >
                {upload.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                <span className="hidden sm:inline">Upload</span>
              </Button>
              <div className="flex items-center gap-2 rounded-md border bg-surface px-2 py-1">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    apiOnline ? "bg-success" : "bg-destructive",
                  )}
                  title={apiOnline ? "API online" : "API offline"}
                />
                <span className="hidden text-[13px] text-muted-foreground lg:inline">
                  shubham / personal
                </span>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </TooltipProvider>
  );
}
