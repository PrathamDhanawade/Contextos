import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [{ title: "Evaluation — ContextOS" }],
  }),
  component: EvaluationPage,
});

/** Snapshot from `python -m app.evals.retrieval_eval` — current benchmark · 9 queries. */
const strategies = [
  {
    name: "Vector",
    recall1: 0.7778,
    recall5: 1.0,
    recall10: 1.0,
    mrr: 0.8889,
    latencyMs: 737.5,
  },
  {
    name: "Hybrid RRF",
    recall1: 0.8889,
    recall5: 1.0,
    recall10: 1.0,
    mrr: 0.9444,
    latencyMs: 863.2,
    highlight: true,
  },
  {
    name: "Hybrid + Reranker",
    recall1: 0.8889,
    recall5: 1.0,
    recall10: 1.0,
    mrr: 0.9444,
    latencyMs: 3144.1,
  },
] as const;

const QUERY_COUNT = 9;
const BEST = strategies[1];

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function EvaluationPage() {
  return (
    <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10 md:py-14">
      <PageHeader
        title="Retrieval Evaluation"
        description="Real measurements from the ContextOS retrieval benchmark."
      />

      <p className="mb-6 text-xs text-muted-foreground">
        Current benchmark · {QUERY_COUNT} queries · Psychology of Money + related corpus
      </p>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-2xl font-semibold tracking-tight">{pct(BEST.recall1)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Recall@1 · Hybrid RRF
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-2xl font-semibold tracking-tight">{pct(BEST.mrr)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            MRR · Hybrid RRF
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-2xl font-semibold tracking-tight">{QUERY_COUNT}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Eval queries
          </p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Retrieval strategy
        </h2>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Strategy</th>
                <th className="px-3 py-3 font-medium">R@1</th>
                <th className="px-3 py-3 font-medium">R@5</th>
                <th className="px-3 py-3 font-medium">R@10</th>
                <th className="px-3 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((row) => (
                <tr
                  key={row.name}
                  className={cn(
                    "border-b border-border/60 last:border-0",
                    "highlight" in row && row.highlight && "bg-surface-raised/40",
                  )}
                >
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.recall1)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.recall5)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.recall10)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.mrr)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {Math.round(row.latencyMs)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          How retrieval works
        </h2>
        <div className="panel flex flex-col items-center gap-2 px-4 py-6 text-center text-[13px]">
          <div className="rounded-md border px-3 py-1.5">Query</div>
          <span className="text-muted-foreground">↓</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="rounded-md border bg-surface-raised/50 px-3 py-1.5">Vector</div>
            <span className="text-muted-foreground">+</span>
            <div className="rounded-md border bg-surface-raised/50 px-3 py-1.5">Lexical</div>
          </div>
          <span className="text-muted-foreground">↓</span>
          <div className="rounded-md border px-3 py-1.5">RRF fusion</div>
          <span className="text-muted-foreground">↓</span>
          <div className="rounded-md border px-3 py-1.5">Top candidates</div>
          <span className="text-muted-foreground">↓</span>
          <div className="rounded-md border border-dashed px-3 py-1.5 text-muted-foreground">
            Optional cross-encoder reranker
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Finding
        </h2>
        <div className="panel space-y-3 p-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            Hybrid retrieval improved Recall@1 from{" "}
            <span className="font-medium text-foreground">
              {pct(strategies[0].recall1)} → {pct(strategies[1].recall1)}
            </span>
            .
          </p>
          <p>
            The reranker increased latency without improving aggregate retrieval quality on
            this evaluation set.
          </p>
          <p className="text-xs">
            Numbers are from a small fixed dataset and should be treated as engineering
            evidence — not production accuracy claims.
          </p>
        </div>
      </section>
    </div>
  );
}
