// Mock data shaped after the existing ContextOS API responses
// (GET /documents, GET /context, POST /chat, POST /search, ...).

export type PipelineStage =
  | "uploading"
  | "extracting"
  | "parsing"
  | "chunking"
  | "embedding"
  | "extracting_knowledge"
  | "graph"
  | "ready"
  | "failed";

export const PIPELINE_STAGES: { id: PipelineStage; label: string; hint: string }[] = [
  { id: "uploading", label: "Uploading", hint: "Transferring file to storage" },
  { id: "extracting", label: "Extracting PDF text", hint: "Raw text + layout blocks" },
  { id: "parsing", label: "Parsing with Docling", hint: "Structure, tables, headings" },
  { id: "chunking", label: "Creating chunks", hint: "Semantic windows with overlap" },
  { id: "embedding", label: "Generating embeddings", hint: "1536-dim vectors" },
  { id: "extracting_knowledge", label: "Extracting entities & relationships", hint: "LLM extraction pass" },
  { id: "graph", label: "Building knowledge graph", hint: "Merging into global graph" },
  { id: "ready", label: "Ready", hint: "Available to all agents" },
];

export type DocStatus =
  | "uploading"
  | "parsing"
  | "chunking"
  | "embedding"
  | "extracting knowledge"
  | "ready"
  | "failed";

export interface DocumentItem {
  id: string;
  title: string;
  fileType: string;
  pages: number;
  status: DocStatus;
  stage: PipelineStage;
  progress: number;
  chunks: number;
  entities: number;
  relationships: number;
  sizeMb: number;
  uploadedAt: string;
  stageTimings: { id: PipelineStage; ms: number }[];
}

export const documents: DocumentItem[] = [
  {
    id: "doc_8f21",
    title: "Ronald Read — Estate Filing.pdf",
    fileType: "PDF",
    pages: 42,
    status: "ready",
    stage: "ready",
    progress: 100,
    chunks: 128,
    entities: 54,
    relationships: 91,
    sizeMb: 3.4,
    uploadedAt: "2026-09-01T09:12:00Z",
    stageTimings: [
      { id: "uploading", ms: 820 },
      { id: "extracting", ms: 2400 },
      { id: "parsing", ms: 11200 },
      { id: "chunking", ms: 1600 },
      { id: "embedding", ms: 7300 },
      { id: "extracting_knowledge", ms: 15400 },
      { id: "graph", ms: 3100 },
      { id: "ready", ms: 0 },
    ],
  },
  {
    id: "doc_3a7c",
    title: "ContextOS Architecture v3.pdf",
    fileType: "PDF",
    pages: 18,
    status: "extracting knowledge",
    stage: "extracting_knowledge",
    progress: 74,
    chunks: 62,
    entities: 21,
    relationships: 14,
    sizeMb: 1.2,
    uploadedAt: "2026-09-03T08:41:00Z",
    stageTimings: [
      { id: "uploading", ms: 410 },
      { id: "extracting", ms: 1200 },
      { id: "parsing", ms: 6400 },
      { id: "chunking", ms: 900 },
      { id: "embedding", ms: 4100 },
      { id: "extracting_knowledge", ms: 9800 },
    ],
  },
  {
    id: "doc_91bd",
    title: "Docling Evaluation Notes.md",
    fileType: "MD",
    pages: 6,
    status: "ready",
    stage: "ready",
    progress: 100,
    chunks: 19,
    entities: 12,
    relationships: 17,
    sizeMb: 0.1,
    uploadedAt: "2026-08-28T15:02:00Z",
    stageTimings: PIPELINE_STAGES.map((s) => ({ id: s.id, ms: 700 })),
  },
  {
    id: "doc_44e0",
    title: "Supabase RLS Playbook.pdf",
    fileType: "PDF",
    pages: 24,
    status: "embedding",
    stage: "embedding",
    progress: 52,
    chunks: 71,
    entities: 0,
    relationships: 0,
    sizeMb: 2.1,
    uploadedAt: "2026-09-03T10:05:00Z",
    stageTimings: [
      { id: "uploading", ms: 620 },
      { id: "extracting", ms: 1900 },
      { id: "parsing", ms: 8100 },
      { id: "chunking", ms: 1200 },
      { id: "embedding", ms: 3300 },
    ],
  },
  {
    id: "doc_2cc1",
    title: "Q3 Investor Memo.docx",
    fileType: "DOCX",
    pages: 9,
    status: "parsing",
    stage: "parsing",
    progress: 24,
    chunks: 0,
    entities: 0,
    relationships: 0,
    sizeMb: 0.6,
    uploadedAt: "2026-09-03T10:31:00Z",
    stageTimings: [
      { id: "uploading", ms: 300 },
      { id: "extracting", ms: 1100 },
      { id: "parsing", ms: 2600 },
    ],
  },
  {
    id: "doc_77aa",
    title: "Scanned Contract (low quality).pdf",
    fileType: "PDF",
    pages: 12,
    status: "failed",
    stage: "failed",
    progress: 38,
    chunks: 0,
    entities: 0,
    relationships: 0,
    sizeMb: 8.9,
    uploadedAt: "2026-08-30T11:20:00Z",
    stageTimings: [
      { id: "uploading", ms: 1500 },
      { id: "extracting", ms: 4200 },
      { id: "parsing", ms: 22000 },
    ],
  },
];

export type MemoryType = "semantic" | "episodic";
export type MemoryStatus = "active" | "superseded";

export interface MemoryItem {
  id: string;
  content: string;
  type: MemoryType;
  status: MemoryStatus;
  source: string;
  createdAt: string;
  confidence: number;
  supersedes?: { content: string; createdAt: string };
}

export const memories: MemoryItem[] = [
  {
    id: "mem_1001",
    content: "User works at Google on infrastructure tooling.",
    type: "semantic",
    status: "active",
    source: "chat · session 42",
    createdAt: "2026-08-29T12:04:00Z",
    confidence: 0.94,
    supersedes: { content: "User works at Raava.", createdAt: "2026-05-11T09:20:00Z" },
  },
  {
    id: "mem_1002",
    content: "User is building ContextOS, a persistent AI context system.",
    type: "semantic",
    status: "active",
    source: "ContextOS Architecture v3.pdf · p.2",
    createdAt: "2026-09-03T08:52:00Z",
    confidence: 0.98,
  },
  {
    id: "mem_1003",
    content: "Prefers short, simple explanations without filler.",
    type: "semantic",
    status: "active",
    source: "chat · session 39",
    createdAt: "2026-08-21T18:33:00Z",
    confidence: 0.88,
  },
  {
    id: "mem_1004",
    content: "On Sep 1 the user uploaded the Ronald Read estate filing and asked for a holdings summary.",
    type: "episodic",
    status: "active",
    source: "chat · session 44",
    createdAt: "2026-09-01T09:26:00Z",
    confidence: 0.91,
  },
  {
    id: "mem_1005",
    content: "Stack of choice: FastAPI, Supabase, Docling.",
    type: "semantic",
    status: "active",
    source: "graph · entity ContextOS",
    createdAt: "2026-08-30T10:11:00Z",
    confidence: 0.96,
  },
  {
    id: "mem_1006",
    content: "User evaluated LlamaParse before choosing Docling.",
    type: "episodic",
    status: "superseded",
    source: "Docling Evaluation Notes.md · p.3",
    createdAt: "2026-08-28T15:14:00Z",
    confidence: 0.62,
  },
  {
    id: "mem_1007",
    content: "Timezone is Asia/Kolkata; prefers meetings after 14:00 local.",
    type: "semantic",
    status: "active",
    source: "chat · session 31",
    createdAt: "2026-07-14T07:48:00Z",
    confidence: 0.83,
  },
  {
    id: "mem_1008",
    content: "Interested in value investing case studies (Ronald Read).",
    type: "semantic",
    status: "active",
    source: "Ronald Read — Estate Filing.pdf · p.1",
    createdAt: "2026-09-01T09:31:00Z",
    confidence: 0.79,
  },
];

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  at: string;
  kind: "document" | "pipeline" | "memory" | "graph" | "agent";
}

export const activity: ActivityItem[] = [
  { id: "a1", kind: "agent", label: "Claude accessed ContextOS through MCP", detail: "search_context(query=\"ronald read holdings\")", at: "2m ago" },
  { id: "a2", kind: "memory", label: "Memory superseded", detail: "“User works at Raava” → “User works at Google”", at: "14m ago" },
  { id: "a3", kind: "graph", label: "Knowledge graph extracted", detail: "21 entities · 14 relationships from ContextOS Architecture v3", at: "38m ago" },
  { id: "a4", kind: "pipeline", label: "Embeddings generated", detail: "62 vectors · text-embedding-3-small", at: "41m ago" },
  { id: "a5", kind: "pipeline", label: "28 chunks created", detail: "Supabase RLS Playbook.pdf", at: "52m ago" },
  { id: "a6", kind: "pipeline", label: "Docling parsing complete", detail: "18 pages · 4 tables preserved", at: "1h ago" },
  { id: "a7", kind: "pipeline", label: "Parsing started", detail: "Q3 Investor Memo.docx", at: "1h ago" },
  { id: "a8", kind: "document", label: "PDF uploaded", detail: "ContextOS Architecture v3.pdf · 1.2 MB", at: "1h ago" },
];

export interface ChatSource {
  document: string;
  page: number;
  score: number;
  preview: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  memoriesUsed?: string[];
  graphUsed?: string[];
}

export const chatSessions = [
  { id: "s_44", title: "Ronald Read holdings", updatedAt: "Today" },
  { id: "s_43", title: "ContextOS ingestion design", updatedAt: "Today" },
  { id: "s_42", title: "Where do I work now?", updatedAt: "Yesterday" },
  { id: "s_39", title: "Docling vs LlamaParse", updatedAt: "Aug 28" },
];

export const chatMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "What did Ronald Read hold, and how does that relate to what I'm building?",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Ronald Read's estate filing lists a concentrated dividend portfolio — Wells Fargo, Procter & Gamble, Colgate-Palmolive and JPMorgan were the largest positions, held for decades with reinvested dividends.\n\nRelating that to your work: you're building ContextOS, a persistent context layer, and you've been collecting long-horizon case studies as reference material. The estate filing is currently the only finance document in your corpus, linked to the topic “value investing”.",
    sources: [
      { document: "Ronald Read — Estate Filing.pdf", page: 4, score: 0.91, preview: "Schedule B — Securities held at date of death: Wells Fargo & Co. (12,400 sh), Procter & Gamble…" },
      { document: "Ronald Read — Estate Filing.pdf", page: 11, score: 0.86, preview: "Dividends reinvested through the transfer agent from 1974 onward, with no recorded sales…" },
      { document: "ContextOS Architecture v3.pdf", page: 2, score: 0.74, preview: "ContextOS unifies documents, memory and a knowledge graph behind one retrieval surface…" },
    ],
    memoriesUsed: [
      "Interested in value investing case studies (Ronald Read).",
      "User is building ContextOS, a persistent AI context system.",
    ],
    graphUsed: [
      "Ronald Read — held → Wells Fargo",
      "Ronald Read — subject_of → Estate Filing",
      "ContextOS — built_by → Shubham",
      "ContextOS — uses → Supabase",
      "Estate Filing — about_topic → Value Investing",
    ],
  },
];

export type EntityType = "person" | "company" | "project" | "technology" | "document" | "topic";

export interface GraphEntity {
  id: string;
  name: string;
  type: EntityType;
  summary: string;
  relationships: { predicate: string; target: string }[];
  memories: string[];
  sources: { document: string; page: number }[];
}

export const entities: GraphEntity[] = [
  {
    id: "contextos",
    name: "ContextOS",
    type: "project",
    summary: "Persistent AI context system unifying documents, memory, graph and MCP.",
    relationships: [
      { predicate: "uses", target: "FastAPI" },
      { predicate: "uses", target: "Supabase" },
      { predicate: "uses", target: "Docling" },
      { predicate: "built_by", target: "Shubham" },
    ],
    memories: ["User is building ContextOS, a persistent AI context system.", "Stack of choice: FastAPI, Supabase, Docling."],
    sources: [{ document: "ContextOS Architecture v3.pdf", page: 2 }, { document: "ContextOS Architecture v3.pdf", page: 7 }],
  },
  {
    id: "shubham",
    name: "Shubham",
    type: "person",
    summary: "Primary user and author of ContextOS.",
    relationships: [
      { predicate: "works_at", target: "Google" },
      { predicate: "builds", target: "ContextOS" },
    ],
    memories: ["User works at Google on infrastructure tooling.", "Prefers short, simple explanations without filler."],
    sources: [{ document: "ContextOS Architecture v3.pdf", page: 1 }],
  },
  {
    id: "google",
    name: "Google",
    type: "company",
    summary: "Current employer, replacing Raava as of Aug 2026.",
    relationships: [{ predicate: "employs", target: "Shubham" }],
    memories: ["User works at Google on infrastructure tooling."],
    sources: [],
  },
  {
    id: "fastapi",
    name: "FastAPI",
    type: "technology",
    summary: "Python API framework powering the ContextOS backend.",
    relationships: [{ predicate: "used_by", target: "ContextOS" }],
    memories: ["Stack of choice: FastAPI, Supabase, Docling."],
    sources: [{ document: "ContextOS Architecture v3.pdf", page: 5 }],
  },
  {
    id: "supabase",
    name: "Supabase",
    type: "technology",
    summary: "Postgres + pgvector store for chunks, embeddings and memory.",
    relationships: [{ predicate: "used_by", target: "ContextOS" }],
    memories: ["Stack of choice: FastAPI, Supabase, Docling."],
    sources: [{ document: "Supabase RLS Playbook.pdf", page: 3 }],
  },
  {
    id: "docling",
    name: "Docling",
    type: "technology",
    summary: "Document parser producing structured layout for chunking.",
    relationships: [{ predicate: "used_by", target: "ContextOS" }],
    memories: ["User evaluated LlamaParse before choosing Docling."],
    sources: [{ document: "Docling Evaluation Notes.md", page: 1 }],
  },
  {
    id: "estate",
    name: "Ronald Read — Estate Filing",
    type: "document",
    summary: "42-page estate filing, 128 chunks, source of the value-investing topic.",
    relationships: [
      { predicate: "about", target: "Ronald Read" },
      { predicate: "about_topic", target: "Value Investing" },
    ],
    memories: ["Interested in value investing case studies (Ronald Read)."],
    sources: [{ document: "Ronald Read — Estate Filing.pdf", page: 1 }],
  },
  {
    id: "ronald",
    name: "Ronald Read",
    type: "person",
    summary: "Vermont janitor and investor; subject of the estate filing.",
    relationships: [
      { predicate: "held", target: "Wells Fargo" },
      { predicate: "subject_of", target: "Ronald Read — Estate Filing" },
    ],
    memories: ["Interested in value investing case studies (Ronald Read)."],
    sources: [{ document: "Ronald Read — Estate Filing.pdf", page: 4 }],
  },
  {
    id: "wellsfargo",
    name: "Wells Fargo",
    type: "company",
    summary: "Largest disclosed holding in the estate filing.",
    relationships: [{ predicate: "held_by", target: "Ronald Read" }],
    memories: [],
    sources: [{ document: "Ronald Read — Estate Filing.pdf", page: 4 }],
  },
  {
    id: "value",
    name: "Value Investing",
    type: "topic",
    summary: "Recurring research interest across documents and chat.",
    relationships: [{ predicate: "topic_of", target: "Ronald Read — Estate Filing" }],
    memories: ["Interested in value investing case studies (Ronald Read)."],
    sources: [],
  },
];

export const connections = [
  {
    id: "claude",
    name: "Claude",
    vendor: "Anthropic · MCP",
    status: "connected" as const,
    lastAccess: "2 minutes ago",
    calls24h: 148,
    tools: ["search_context(query)", "get_memories(filter)", "get_graph(entity)"],
    recent: [
      { tool: "search_context(query)", arg: "\"ronald read holdings\"", at: "2m ago", ms: 412 },
      { tool: "get_memories(filter)", arg: "type=semantic", at: "9m ago", ms: 118 },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    vendor: "Anysphere · MCP",
    status: "disconnected" as const,
    lastAccess: "3 days ago",
    calls24h: 0,
    tools: ["search_context(query)", "get_document(id)"],
    recent: [],
  },
  {
    id: "custom",
    name: "Custom MCP Client",
    vendor: "Bring your own agent",
    status: "add" as const,
    lastAccess: "—",
    calls24h: 0,
    tools: [],
    recent: [],
  },
];

export const stats = {
  memories: 1284,
  documents: 18,
  entities: 486,
  relationships: 732,
  agents: 2,
};

export const profile = {
  identity: ["Shubham", "Engineer, infrastructure tooling", "Asia/Kolkata (UTC+5:30)"],
  currentWork: ["Building ContextOS", "Works at Google (since Aug 2026)"],
  projects: ["ContextOS", "Docling evaluation", "Estate filing research"],
  technologies: ["FastAPI", "Supabase", "Docling", "pgvector", "TypeScript"],
  preferences: ["Prefers short and simple explanations", "Meetings after 14:00 local", "Dense, technical UI over marketing copy"],
  experiences: ["Migrated from Raava to Google in Aug 2026", "Chose Docling over LlamaParse after a 6-page evaluation"],
  interests: ["Value investing case studies", "Retrieval systems", "Knowledge graphs"],
  recentChanges: [
    { at: "14m ago", text: "Employer updated: Raava → Google" },
    { at: "1h ago", text: "New project detected: ContextOS" },
    { at: "Yesterday", text: "Preference learned: short explanations" },
  ],
};

export const searchIndex = {
  documents: [
    { title: "Ronald Read — Estate Filing.pdf", meta: "42 pages · 128 chunks", to: "/documents/doc_8f21" },
    { title: "ContextOS Architecture v3.pdf", meta: "18 pages · extracting knowledge", to: "/documents/doc_3a7c" },
  ],
  memories: [
    { title: "Interested in value investing case studies (Ronald Read).", meta: "semantic · active", to: "/memories" },
    { title: "User works at Google on infrastructure tooling.", meta: "semantic · supersedes Raava", to: "/memories" },
  ],
  entities: [
    { title: "Ronald Read", meta: "person · 4 relationships", to: "/graph" },
    { title: "Wells Fargo", meta: "company · 1 relationship", to: "/graph" },
  ],
  relationships: [
    { title: "Ronald Read — held → Wells Fargo", meta: "from Estate Filing p.4", to: "/graph" },
    { title: "Estate Filing — about_topic → Value Investing", meta: "confidence 0.82", to: "/graph" },
  ],
};
