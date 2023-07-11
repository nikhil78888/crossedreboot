-- Enable pgvector extension
create extension if not exists vector with schema public;

-- Stores the actual embeddings with some metadata
create table words (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- Create a function to search for words
create function match_words (
  query_embedding vector(1536),
  match_count int default null,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (words.embedding <=> query_embedding) as similarity
  from words
  where metadata @> filter
  order by words.embedding <=> query_embedding
  limit match_count;
end;
$$;