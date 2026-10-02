import { createFileRoute } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { PageHeader } from "@/components/app/ui-bits";
import { useHealth } from "@/lib/hooks";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { connections } from "@/lib/contextos-data";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [{ title: "Connections — ContextOS" }],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const health = useHealth();
  const apiOnline = health.data?.status === "ok";

  return (
    <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10 md:py-14">
      <PageHeader
        title="Connections"
        description="MCP clients and the ContextOS HTTP API that agents call via /search."
      />

      <div className="mb-6 panel p-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "size-2 rounded-full",
              apiOnline ? "bg-success" : "bg-destructive",
            )}
          />
          <div>
            <p className="text-sm font-medium">ContextOS API</p>
            <p className="text-xs text-muted-foreground">{API_URL}</p>
          </div>
          <span className="ml-auto text-mono-xs text-muted-foreground">
            {health.isLoading ? "checking…" : apiOnline ? "online" : "offline"}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          MCP server exposes <code className="text-mono-xs">search_context</code> on{" "}
          <code className="text-mono-xs">http://127.0.0.1:8001/mcp</code> and proxies to{" "}
          <code className="text-mono-xs">POST /search</code>.
        </p>
      </div>

      <div className="grid gap-4">
        {connections.map((c) => (
          <section key={c.id} className="panel p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-md border bg-surface-raised">
                <Plug className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{c.name}</h2>
                  <span className="text-mono-xs uppercase text-muted-foreground">
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.vendor}</p>
                {c.tools.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.tools.map((t) => (
                      <code
                        key={t}
                        className="rounded border bg-surface-raised/50 px-1.5 py-0.5 text-mono-xs"
                      >
                        {t}
                      </code>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right text-mono-xs text-muted-foreground">
                <div>{c.lastAccess}</div>
                <div>{c.calls24h} calls / 24h</div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
