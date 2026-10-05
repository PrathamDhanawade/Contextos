-- ContextOS: store retrieval-only contextualized text separately
-- from the original chunk content.
-- Run in Supabase SQL Editor.

alter table document_chunks
add column if not exists contextual_content text;
