const API_URL = import.meta.env.VITE_CONTEXTOS_API_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type ApiDocument = {
  id: string;
  title: string;
  filename?: string | null;
  document_type?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type ApiMemory = {
  id: string;
  memory_type: string;
  content: string;
  created_at?: string | null;
  session_id?: string | null;
  status?: string | null;
  superseded_by?: string | null;
  similarity?: number | null;
};

export type ApiEntity = {
  id: string;
  name: string;
  entity_type: string;
  created_at?: string | null;
  source_type?: string | null;
  source_document_id?: string | null;
};

export type ApiRelationship = {
  id?: string;
  relationship: string;
  source_page?: number | null;
  source_document_id?: string | null;
  source_type?: string | null;
  source?: { name: string; entity_type?: string } | null;
  target?: { name: string; entity_type?: string } | null;
};

export type ApiSession = {
  id: string;
  title?: string | null;
  created_at?: string | null;
};

export type ApiMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
};

export type ChatSource = {
  document?: string | null;
  document_id?: string | null;
  chunk_index?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  similarity?: number | null;
  preview?: string | null;
};

export type ChatGraphRelationship = {
  source: string;
  relationship: string;
  target: string;
  page?: number | null;
};

export type ChatEntity = {
  name: string;
  type: string;
};

export type ChatResponse = {
  session_id: string;
  question: string;
  answer: string;
  sources?: ChatSource[];
  memories_used?: ApiMemory[];
  entities?: ChatEntity[];
  knowledge?: {
    entities?: { name: string; type?: string }[];
    relationships?: unknown[];
  };
  graph_relationships?: ChatGraphRelationship[];
};

export type ContextResponse = {
  user_id?: string;
  memories: ApiMemory[];
  entities: ApiEntity[];
  relationships: ApiRelationship[];
  documents: ApiDocument[];
};

export type SearchResponse = {
  query: string;
  context: string;
  memories: ApiMemory[];
  documents: unknown[];
  relationships: ApiRelationship[];
  entities?: { name: string; type?: string }[];
};

export const api = {
  health: () => request<{ status: string }>("/health"),

  listDocuments: () =>
    request<{ documents: ApiDocument[] }>("/documents"),

  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{
      message: string;
      document: ApiDocument;
      chunks_saved?: number;
      knowledge_entities_saved?: number;
      knowledge_relationships_saved?: number;
    }>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  },

  deleteDocument: (documentId: string) =>
    request<{ message: string }>(`/documents/${documentId}`, {
      method: "DELETE",
    }),

  getContext: () => request<ContextResponse>("/context"),

  getDocumentGraph: (documentId: string) =>
    request<{
      document_id: string;
      entity_count: number;
      relationship_count: number;
      entities: ApiEntity[];
      relationships: ApiRelationship[];
    }>(`/context/document/${documentId}/graph`),

  listSessions: () =>
    request<{ sessions: ApiSession[] }>("/sessions"),

  createSession: () =>
    request<ApiSession>("/sessions", { method: "POST" }),

  getSessionMessages: (sessionId: string) =>
    request<{ messages: ApiMessage[] }>(
      `/sessions/${sessionId}/messages`,
    ),

  chat: (body: {
    question: string;
    session_id?: string | null;
    document_id?: string | null;
    limit?: number;
  }) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  search: (query: string, limit = 5) =>
    request<SearchResponse>("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    }),
};

export { API_URL };
