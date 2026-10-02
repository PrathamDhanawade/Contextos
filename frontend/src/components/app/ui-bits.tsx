import { cn } from "@/lib/utils";
import { Check, Loader2, AlertTriangle, Circle } from "lucide-react";
import { PIPELINE_STAGES, type PipelineStage, type DocStatus } from "@/lib/contextos-data";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
      <div className="space-y-1.5">
        <h1 className="text-[1.7rem] font-semibold leading-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const statusTone: Record<DocStatus, string> = {
  ready: "text-success border-success/30 bg-success/10",
  failed: "text-destructive border-destructive/30 bg-destructive/10",
  uploading: "text-info border-info/30 bg-info/10",
  parsing: "text-info border-info/30 bg-info/10",
  chunking: "text-info border-info/30 bg-info/10",
  embedding: "text-info border-info/30 bg-info/10",
  "extracting knowledge": "text-info border-info/30 bg-info/10",
};

export function StatusPill({ status, className }: { status: DocStatus; className?: string }) {
  const active = status !== "ready" && status !== "failed";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-mono-xs uppercase",
        statusTone[status],
        className,
      )}
    >
      {status === "ready" ? (
        <Check className="size-3" />
      ) : status === "failed" ? (
        <AlertTriangle className="size-3" />
      ) : (
        <Loader2 className="size-3 animate-spin" />
      )}
      {status}
      {active && <span className="sr-only">in progress</span>}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="panel group p-5 transition-colors duration-200 hover:border-foreground/20">
      <div className="flex items-center justify-between">
        <span className="text-mono-xs uppercase text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
      </div>
      <div className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function fmt(ms: number) {
  if (!ms) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function PipelineTimeline({
  stage,
  timings,
  failed,
  compact,
}: {
  stage: PipelineStage;
  timings: { id: PipelineStage; ms: number }[];
  failed?: boolean;
  compact?: boolean;
}) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className="relative">
      {PIPELINE_STAGES.map((s, i) => {
        const done = failed ? i < currentIndex : i < currentIndex || stage === "ready";
        const active = !failed && i === currentIndex && stage !== "ready";
        const errored = failed && i === currentIndex;
        const timing = timings.find((t) => t.id === s.id);
        return (
          <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < PIPELINE_STAGES.length - 1 && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px",
                  done ? "bg-success/40" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-surface transition-colors duration-200",
                done && "border-success/40 text-success",
                active && "border-info/50 text-info",
                errored && "border-destructive/50 text-destructive",
                !done && !active && !errored && "text-muted-foreground/60",
              )}
            >
              {done ? (
                <Check className="size-3" />
              ) : active ? (
                <Loader2 className="size-3 animate-spin" />
              ) : errored ? (
                <AlertTriangle className="size-3" />
              ) : (
                <Circle className="size-2" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "text-sm",
                    done || active ? "text-foreground" : "text-muted-foreground",
                    active && "font-medium",
                  )}
                >
                  {s.label}
                </span>
                <span className="text-mono-xs text-muted-foreground">
                  {errored ? "failed" : fmt(timing?.ms ?? 0)}
                </span>
              </div>
              {!compact && <p className="text-xs text-muted-foreground">{s.hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border bg-surface-raised">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
