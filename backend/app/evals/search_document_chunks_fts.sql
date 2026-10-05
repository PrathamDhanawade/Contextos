-- ContextOS: PostgreSQL full-text lexical retrieval (BM25-style via ts_rank_cd)
-- Run in Supabase SQL Editor, then test with retrieve_bm25_chunks().

create or replace function search_document_chunks_fts(
    search_query text,
    match_count int default 10,
    filter_document_id uuid default null
)
returns table (
    id uuid,
    document_id uuid,
    chunk_index int,
    content text,
    page_start int,
    page_end int,
    document_title text,
    rank real
)
language sql
stable
as $$
    select
        dc.id,
        dc.document_id,
        dc.chunk_index,
        dc.content,
        dc.page_start,
        dc.page_end,
        coalesce(d.title, d.filename, 'Document') as document_title,
        ts_rank_cd(
            to_tsvector('english', dc.content),
            websearch_to_tsquery('english', search_query)
        ) as rank
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where
        (
            filter_document_id is null
            or dc.document_id = filter_document_id
        )
        and to_tsvector('english', dc.content)
            @@ websearch_to_tsquery('english', search_query)
    order by rank desc
    limit match_count;
$$;
