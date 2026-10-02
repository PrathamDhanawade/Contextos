# ContextOS

Persistent AI context layer: chat over PDFs with retrieval, long-term memory that supersedes itself, and a focused knowledge graph — plus an evaluation page with real retrieval numbers.

## What it does

- **Ingest PDFs** — Docling parse → chunk → `all-mpnet-base-v2` (768-d) → Supabase / pgvector
- **Chat with evidence** — answer first, then passages / memories / graph relationships in a Context Inspector
- **Long-term memory** — semantic + episodic extraction; similar memories get **superseded**, not duplicated
- **Knowledge graph** — entity/relationship extraction; focused + whole-graph exploration in React Flow
- **Retrieval eval** — Vector vs Hybrid RRF vs Hybrid+Reranker (CLI + Evaluation UI)
- **MCP** — `search_context` tool for agents (Claude, etc.)

## Architecture (local)

```text
Frontend (:3000)
    ↓  VITE_CONTEXTOS_API_URL
FastAPI (:8000)          ← chat, search, documents, context
    ↓  EMBEDDING_SERVICE_URL (optional)
Modal / local MPNet      ← 768-d query embeddings

MCP (:8001)              ← agent tools only
    ↓  CONTEXTOS_API
FastAPI (:8000)/search
```

| Port | Process | Role |
| --- | --- | --- |
| **8000** | `uvicorn app.main:app` | ContextOS HTTP API (frontend + MCP call this) |
| **8001** | `python mcp_server.py` | MCP Streamable HTTP for agents |
| **3000** | `npm run dev` | Frontend |

Do **not** point the frontend at `:8001`. That is MCP, not the API.

## Stack

| Layer | Choice |
| --- | --- |
| API | FastAPI |
| PDF | Docling + PyMuPDF (local `APP_MODE=full` only) |
| Embeddings | `sentence-transformers/all-mpnet-base-v2` (768-d, normalized) |
| Embed runtime | Local ST **or** remote via `EMBEDDING_SERVICE_URL` (Modal) |
| Lexical search | Postgres FTS (`ts_rank`) — used in **eval** hybrid path |
| Chat retrieval | Dense pgvector + keyword fallback (`retrieve_document_chunks`) |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` (eval only) |
| LLM | Groq (chat, memory, entities) |
| Data | Supabase (storage, documents, chunks, memories, graph) |
| Frontend | TanStack Start + React + Tailwind |
| Agents | MCP Streamable HTTP (`mcp_server.py` → FastAPI `:8000`) |

## Current retrieval benchmark

From `python -m app.evals.retrieval_eval` (9-query Psychology of Money set):

| Strategy | R@1 | R@5 | R@10 | MRR | Latency |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vector | 77.8% | 100% | 100% | 88.9% | ~738ms |
| Hybrid RRF | **88.9%** | 100% | 100% | **94.4%** | ~863ms |
| Hybrid + Reranker | 88.9% | 100% | 100% | 94.4% | ~3144ms |

**Finding:** Hybrid improved Recall@1 (77.8% → 88.9%). Cross-encoder raised latency without improving aggregate metrics on this set. Treat as engineering evidence — see **Evaluation** in the UI.

> **Note:** Live `/chat` and `/search` currently use vector + keyword retrieval. Hybrid RRF is implemented and measured in eval; wiring it into chat is a planned upgrade.

## App modes

| Mode | Env | PDF ingest | Torch / Docling in web process | Chat / search |
| --- | --- | --- | --- | --- |
| **full** (local) | `APP_MODE=full` | yes | yes (unless `EMBEDDING_SERVICE_URL` set) | yes |
| **retrieval** (Render) | `APP_MODE=retrieval` | no (503) | no — requires `EMBEDDING_SERVICE_URL` | yes |

## Run backend (FastAPI on :8000)

```bash
cd backend

# Windows (Git Bash)
source .venv/Scripts/activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt   # full local (ingest + chat)
# or: pip install -r requirements-api.txt   # API-only (no torch)

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

API: http://127.0.0.1:8000 · Docs: http://127.0.0.1:8000/docs

`backend/.env`:

```env
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
GROQ_API_KEY=...
APP_MODE=full
MEMORY_SIMILARITY_THRESHOLD=0.60

# Optional: remote embeddings (required when APP_MODE=retrieval)
# EMBEDDING_SERVICE_URL=https://YOUR--contextos-embeddings-embedder-embed.modal.run
# EMBEDDING_TIMEOUT_SECONDS=60
```

Useful Supabase SQL (run once in SQL Editor):

- `backend/app/evals/search_document_chunks_fts.sql` — FTS / BM25-style RPC
- `backend/app/evals/add_contextual_content_column.sql` — optional `contextual_content` column

## Embeddings (Modal)

Stored chunks and query vectors must stay on **`all-mpnet-base-v2` (768-d, `normalize_embeddings=True`)**. Do not swap models without re-embedding.

### Deploy embed endpoint on Modal

```bash
cd backend
pip install modal
python -m modal setup
python -m modal deploy modal_embed.py
```

Dev test (temporary URL):

```bash
python -m modal serve modal_embed.py
```

Production URL looks like:

```text
https://<workspace>--contextos-embeddings-embedder-embed.modal.run
```

Set that as `EMBEDDING_SERVICE_URL` on the API. The web process then POSTs `{"texts":[...]}` and never imports torch.

## Deploy on Render (retrieval API)

Free tier is ~512 MB. Use retrieval mode so Docling/OCR/torch never load in the web process.

**Root directory:** `backend`

**Build**

```bash
pip install -r requirements-api.txt
```

**Start**

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Env**

```env
APP_MODE=retrieval
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
GROQ_API_KEY=...
MEMORY_SIMILARITY_THRESHOLD=0.60
CORS_ORIGINS=https://your-frontend.example.com
EMBEDDING_SERVICE_URL=https://YOUR--contextos-embeddings-embedder-embed.modal.run
```

**Unavailable on Render web:** PDF upload / Docling / OCR / in-process embeddings. Ingest locally with `APP_MODE=full`, then point the frontend at the Render API for chat.

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:3000).

`frontend/.env`:

```env
VITE_CONTEXTOS_API_URL=http://127.0.0.1:8000
```

### UI routes

| Route | Purpose |
| --- | --- |
| Overview | Status / pipeline snapshot |
| Chat | Context Chat + inspector |
| Memories | Active vs superseded history |
| Documents | Upload / status |
| Knowledge Graph | Focused / whole-graph exploration |
| Evaluation | Retrieval ablation results |
| Connections | API + MCP |
| Settings | Workspace notes |

## Retrieval evaluation (CLI)

```bash
cd backend
source .venv/Scripts/activate
python -m app.evals.retrieval_eval
```

Compares:

1. Pure vector (`match_document_chunks`)
2. Hybrid vector + lexical RRF
3. Hybrid + cross-encoder rerank

Dataset: `backend/app/evals/dataset.json`

## Run MCP server (:8001)

Keep FastAPI on **:8000**, then:

```bash
cd backend
source .venv/Scripts/activate
python mcp_server.py
```

- MCP: http://127.0.0.1:8001/mcp
- Proxies `search_context` → `POST http://127.0.0.1:8000/search`
- Expose with `ngrok http 8001` for Claude

## Project layout

```text
backend/
  requirements.txt       # full local (Docling + torch + …)
  requirements-api.txt   # Render retrieval-only (no torch)
  requirements-embed.txt # optional local embed worker
  modal_embed.py         # Modal all-mpnet-base-v2 endpoint
  mcp_server.py          # MCP on :8001 → API :8000
  app/
    main.py              # APP_MODE gates ingest router
    api/                 # chat, search, documents, …
    services/            # embeddings, retrieval, memory, graph, …
    evals/
frontend/
```

## Design notes

- **Chat** — answer first; Inspect for passages / memories / relationships
- **Graph** — default focused subgraph; optional whole-graph escape hatch
- **Memory** — updates supersede older facts (`status` + `superseded_by`)
- **Embeddings** — never mix different model spaces in one index; keep Modal + ingest on the same MPNet settings
