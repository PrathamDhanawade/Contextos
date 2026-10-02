import type { ApiDocument, ApiMemory } from "@/lib/api";
import type { DocStatus, PipelineStage } from "@/lib/contextos-data";

export function mapDocStatus(status?: string | null): DocStatus {
  switch ((status ?? "").toLowerCase()) {
    case "ready":
      return "ready";
    case "failed":
      return "failed";
    case "uploaded":
    case "uploading":
      return "uploading";
    case "parsing":
      return "parsing";
    case "chunking":
      return "chunking";
    case "embedding":
      return "embedding";
    case "processing":
      return "embedding";
    case "extracting_knowledge":
    case "extracting knowledge":
      return "extracting knowledge";
    default:
      return "parsing";
  }
}

export function mapDocStage(status?: string | null): PipelineStage {
  const s = mapDocStatus(status);
  if (s === "extracting knowledge") return "extracting_knowledge";
  if (s === "ready") return "ready";
  if (s === "failed") return "failed";
  return s as PipelineStage;
}

export function statusProgress(status?: string | null): number {
  switch (mapDocStatus(status)) {
    case "uploading":
      return 10;
    case "parsing":
      return 30;
    case "chunking":
      return 45;
    case "embedding":
      return 65;
    case "extracting knowledge":
      return 85;
    case "ready":
      return 100;
    case "failed":
      return 40;
    default:
      return 20;
  }
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function fileTypeFromName(name?: string | null): string {
  if (!name) return "FILE";
  const ext = name.split(".").pop()?.toUpperCase();
  return ext || "FILE";
}

export function documentTitle(doc: ApiDocument): string {
  return doc.title || doc.filename || "Untitled";
}

export function memoryTypeLabel(memory: ApiMemory): string {
  return (memory.memory_type || "semantic").toLowerCase();
}
