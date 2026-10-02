# Context Hub

Build a premium, modern frontend for a product called ContextOS.
ContextOS is a persistent AI context system that combines documents, long-term memory, knowledge graph, semantic search, and MCP connections. It is NOT just a chatbot.

Use Next.js + React + TypeScript + Tailwind CSS + shadcn/ui. Use React Flow for the knowledge graph. Use subtle motion only where useful. Do NOT use Three.js or heavy 3D.

Visual direction

Avoid purple gradients, neon AI colors, glassmorphism overload, floating blobs, generic “AI magic” visuals.

Use a refined neutral palette: off-white, graphite, slate, soft gray, muted blue/green accents only where status requires it.

Dark mode should feel like Linear / Raycast / Notion / Vercel: crisp, calm, technical, premium.

Typography should be clean and product-focused, with strong hierarchy and lots of spacing.

Use subtle 1px borders, soft shadows, compact cards, good hover states, polished empty states.

Make it look like a serious developer/productivity tool, not an AI template.

App structure

Create a left sidebar with:

Overview

Chat

Memories

Documents

Knowledge Graph

My Context

Connections

Settings

Top bar:

ContextOS logo

global search / command palette

current workspace/user

upload button

Overview page

Show a strong “system status” dashboard:

total memories

total documents

total entities

total relationships

recent context changes

recently uploaded documents

recently learned memories

connected agents / MCP clients

Example cards:

“1,284 memories”

“18 documents”

“486 entities”

“732 relationships”

Add a “Recent activity” timeline:

PDF uploaded

parsing started

Docling parsing complete

28 chunks created

embeddings generated

knowledge graph extracted

memory superseded

Claude accessed ContextOS through MCP

Chat page

Build a clean ChatGPT-like chat view, but make sources and context visible.

Every assistant answer can show collapsible sections:

Sources

Memories used

Graph relationships used

Source cards should show:

document title

page number

similarity score

short preview

Add a small “Context used” strip under answers:

2 memories

3 document chunks

5 graph relationships

Documents page

Show documents in a professional library/grid.

Each document card should show:

title

file type

page count

status

number of chunks

entities extracted

relationships extracted

Status should be interactive and visually clear:

uploading

parsing

chunking

embedding

extracting knowledge

ready

failed

The UI should visibly show the processing pipeline.

For example:
Uploading → Parsing with Docling → Chunking → Embeddings → Knowledge Graph → Ready

Include a progress timeline/progress bar on the document detail page.

Clicking a document opens a detail page with tabs:

Overview

Ask

Chunks

Knowledge

Graph

Memories page

Make memories feel like a first-class feature.

Filters:

All

Semantic

Episodic

Active

Superseded

Memory card fields:

memory content

memory type

source

created date

status

similarity / confidence if relevant

Show memory evolution visually.

Example:
“User works at Raava” → superseded → “User works at Google”

Use a compact timeline or linked-card style.

Knowledge Graph page

Use React Flow.

Interactive graph:

draggable

zoomable

clickable

selectable

Node types:

person

company

project

technology

document

topic

Do not use rainbow colors. Use restrained node styles with subtle type distinctions.

Clicking a node opens a right-side inspector panel showing:

entity name

entity type

relationships

related memories

document sources

page references

Example:
ContextOS

uses → FastAPI

uses → Supabase

uses → Docling

built_by → Shubham

My Context page

This should feel unique and important.

Title:
“What ContextOS knows about you”

Sections:

Identity

Current work

Projects

Technologies

Preferences

Important experiences

Interests

Recent changes

Show an evolving structured profile built from memories + graph.

Example:
Current work: Building ContextOS
Technologies: FastAPI, Supabase, Docling
Preference: Prefers short and simple explanations

Connections page

Show MCP / agent integrations.

Cards:

Claude — Connected

Cursor — Not connected

Custom MCP Client — Add

Show:

connection status

last access time

tools exposed

recent calls

Example tool:
search_context(query)

Global search

Add a command-palette-style global search.

Searching “Ronald Read” should show grouped results:

Documents

Memories

Entities

Relationships

Parsing / ingestion UX

This is important.

When a user uploads a PDF, do not just show a spinner.

Show real stages:

Uploading

Extracting PDF text

Parsing with Docling

Creating chunks

Generating embeddings

Extracting entities and relationships

Building knowledge graph

Ready

Each stage should have:

icon

status

elapsed time

completed checkmark

Make the processing experience feel technical and trustworthy.

Interaction quality

Great hover states

Smooth 150–250ms transitions

Skeleton loaders

Toasts

Command palette

Keyboard shortcuts

Empty states

Tooltips

Collapsible panels

Resizable sidebar where useful

Important constraint

Do NOT invent a backend.
Build the frontend around these existing APIs:

POST /documents/upload

GET /documents

DELETE /documents/{document_id}

POST /chat

GET /sessions

POST /sessions

GET /sessions/{id}/messages

GET /context

GET /context/document/{document_id}/graph

POST /search

Assume responses include memories, document chunks, page numbers, relationships, entities, and processing status.

Final design goal

ContextOS should feel like:
“A control center for everything your AI knows.”

It should visually communicate:
documents → parsing → chunks → embeddings → memories → graph → unified context → agents.

Make it polished enough for a serious startup demo and engineering portfolio.

One extra thing: after Lovable generates V1, don’t accept the first UI blindly. Tell it:

“Reduce visual noise by 30%, remove any purple/AI-looking gradients, increase whitespace, make typography more premium, make the sidebar more compact, and make the ingestion pipeline/status visuals the main differentiator.”

That second pass usually makes the design much better.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/98849505-76d8-4070-899a-5667088df161).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
