import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/ui-bits";
import { API_URL } from "@/lib/api";
import { useHealth } from "@/lib/hooks";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — ContextOS" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const health = useHealth();

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10 md:px-10 md:py-14">
      <PageHeader
        title="Settings"
        description="Frontend wiring for the local ContextOS FastAPI backend."
      />

      <section className="panel space-y-4 p-6">
        <div>
          <p className="text-mono-xs uppercase text-muted-foreground">API base URL</p>
          <p className="mt-1 font-mono text-sm">{API_URL}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Override with <code>VITE_CONTEXTOS_API_URL</code> in the frontend env.
          </p>
        </div>
        <div>
          <p className="text-mono-xs uppercase text-muted-foreground">Health</p>
          <p className="mt-1 text-sm">
            {health.isLoading
              ? "Checking…"
              : health.data?.status === "ok"
                ? "ok"
                : health.error
                  ? "unreachable"
                  : "unknown"}
          </p>
        </div>
        <div>
          <p className="text-mono-xs uppercase text-muted-foreground">Default user</p>
          <p className="mt-1 font-mono text-sm">
            00000000-0000-0000-0000-000000000001
          </p>
        </div>
      </section>
    </div>
  );
}
