CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS notion_documents (
    id SERIAL PRIMARY KEY,
    notion_page_id VARCHAR(100) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    url TEXT,
    content TEXT NOT NULL DEFAULT '',
    last_edited_time TIMESTAMP,
    last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(30) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    source_title TEXT,
    source_url TEXT,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notion_documents_page_id
ON notion_documents(notion_page_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_source
ON document_embeddings(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding_cosine
ON document_embeddings
USING hnsw (embedding vector_cosine_ops);