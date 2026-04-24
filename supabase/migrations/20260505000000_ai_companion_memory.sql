-- ============================================================================
-- AI Companion — pgvector memory
-- ============================================================================
-- Per INCREMENTAL-ROADMAP.md Sprint 8: "Don't ship AI companion without
-- memory. A stateless AI that forgets you is just ChatGPT — no moat."
--
-- Design:
--   - Two tables. `ai_conversation_turns` stores raw user+assistant messages
--     per persona, per user. `ai_conversation_memories` stores periodically
--     condensed memory summaries (embedded into pgvector).
--   - Memory-summarization is kicked off by the edge function after each
--     turn: if the last 10 user messages are unsummarized, we summarize them
--     into a single embedded memory (~1 embedding per ~10 turns).
--   - On next inbound message, we embed the question and do a cosine
--     similarity search for the top 3 most-relevant memories, then pass
--     them into the prompt as "what I remember about you". This is how the
--     AI "remembers" prior conversations without re-reading the whole
--     history on every call.
--
-- Using Gemini's text-embedding-004 model (768 dimensions, free).
--
-- Additive-only. pgvector extension must be enabled once — idempotent
-- `CREATE EXTENSION IF NOT EXISTS`.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 1. Raw conversation turns (append-only log) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_conversation_turns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona       text NOT NULL CHECK (persona IN ('sage', 'oracle', 'mystic', 'priestess')),
  role          text NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  summarized    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_turns_user_persona_idx
  ON public.ai_conversation_turns (user_id, persona, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_turns_unsummarized_idx
  ON public.ai_conversation_turns (user_id, persona, created_at)
  WHERE summarized = false;

ALTER TABLE public.ai_conversation_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_turns_select_own ON public.ai_conversation_turns;
CREATE POLICY ai_turns_select_own
  ON public.ai_conversation_turns FOR SELECT
  USING (auth.uid() = user_id);

-- Writes come from edge function via service-role — no user INSERT policy.
GRANT SELECT ON public.ai_conversation_turns TO authenticated;

-- ─── 2. Condensed memories with embeddings ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_conversation_memories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona       text NOT NULL CHECK (persona IN ('sage', 'oracle', 'mystic', 'priestess')),
  summary       text NOT NULL CHECK (char_length(summary) BETWEEN 10 AND 2000),
  embedding     vector(768),     -- Gemini text-embedding-004 dimension
  turn_count    integer NOT NULL DEFAULT 0,
  window_start  timestamptz NOT NULL,
  window_end    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_memories_user_persona_idx
  ON public.ai_conversation_memories (user_id, persona, created_at DESC);

-- Vector index for cosine similarity. IVF flat with 100 lists is appropriate
-- for the scale we'll hit in the first year (<1M rows). Switch to HNSW if we
-- outgrow it.
CREATE INDEX IF NOT EXISTS ai_memories_embedding_idx
  ON public.ai_conversation_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.ai_conversation_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_memories_select_own ON public.ai_conversation_memories;
CREATE POLICY ai_memories_select_own
  ON public.ai_conversation_memories FOR SELECT
  USING (auth.uid() = user_id);

-- Writes via service role only.
GRANT SELECT ON public.ai_conversation_memories TO authenticated;

-- ─── 3. RPC: retrieve top-k relevant memories for a question ────────────────

CREATE OR REPLACE FUNCTION public.ai_search_memories(
  p_user_id  uuid,
  p_persona  text,
  p_query    vector(768),
  p_limit    integer DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  summary text,
  similarity real,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    m.id,
    m.summary,
    (1 - (m.embedding <=> p_query))::real AS similarity,
    m.created_at
  FROM public.ai_conversation_memories m
  WHERE m.user_id = p_user_id
    AND m.persona = p_persona
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> p_query
  LIMIT p_limit;
$$;

-- Only invokable by service role (edge function). Don't grant to authenticated —
-- memory retrieval bakes into the chat call, not an independent user API.
REVOKE ALL ON FUNCTION public.ai_search_memories(uuid, text, vector, integer) FROM PUBLIC;

-- ─── 4. RPC: mark a batch of turns as summarized ───────────────────────────

CREATE OR REPLACE FUNCTION public.ai_mark_turns_summarized(p_turn_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.ai_conversation_turns
    SET summarized = true
    WHERE id = ANY(p_turn_ids);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_mark_turns_summarized(uuid[]) FROM PUBLIC;
