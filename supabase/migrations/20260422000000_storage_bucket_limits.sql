-- ============================================================================
-- Storage bucket hardening: file-size caps + mime-type allowlists
-- ============================================================================
-- Why: The backend-audit flagged that 5 buckets (backgrounds, tarot-images,
-- card-backs, custom-icons, blog-covers) accept arbitrary-size uploads of
-- any mime type. A malicious or accidental multi-GB upload can balloon
-- storage cost and clog serving. User-writable `backgrounds` is the biggest
-- risk.
--
-- This migration is idempotent: buckets that don't exist yet are created
-- with the hardened limits; existing buckets are UPDATEd to apply caps
-- without touching their contents.
--
-- Caps chosen:
--   - backgrounds    5 MB  png/jpg/webp/avif        public read (user's chosen bg)
--   - card-backs     2 MB  png/jpg/webp             public read (custom card art)
--   - custom-icons   512KB png/svg/webp             public read (small UI icons)
--   - blog-covers    2 MB  png/jpg/webp/avif        public read (blog hero)
--   - tarot-images   4 MB  png/jpg/webp             public read (deck art)
-- ============================================================================

DO $$
DECLARE
  bucket_specs jsonb := $json$
    [
      {"name": "backgrounds",   "size_mb": 5,  "mimes": ["image/png","image/jpeg","image/webp","image/avif"]},
      {"name": "card-backs",    "size_mb": 2,  "mimes": ["image/png","image/jpeg","image/webp"]},
      {"name": "custom-icons",  "size_kb": 512,"mimes": ["image/png","image/svg+xml","image/webp"]},
      {"name": "blog-covers",   "size_mb": 2,  "mimes": ["image/png","image/jpeg","image/webp","image/avif"]},
      {"name": "tarot-images",  "size_mb": 4,  "mimes": ["image/png","image/jpeg","image/webp"]}
    ]
  $json$;
  spec jsonb;
  limit_bytes bigint;
  mime_arr text[];
BEGIN
  FOR spec IN SELECT * FROM jsonb_array_elements(bucket_specs)
  LOOP
    -- Compute bytes from whichever key is present.
    IF spec ? 'size_mb' THEN
      limit_bytes := (spec->>'size_mb')::bigint * 1024 * 1024;
    ELSE
      limit_bytes := (spec->>'size_kb')::bigint * 1024;
    END IF;

    mime_arr := ARRAY(SELECT jsonb_array_elements_text(spec->'mimes'));

    -- Update if it exists; insert public with caps if it doesn't.
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = spec->>'name') THEN
      UPDATE storage.buckets
         SET file_size_limit   = limit_bytes,
             allowed_mime_types = mime_arr
       WHERE id = spec->>'name';
    ELSE
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        spec->>'name',
        spec->>'name',
        true,
        limit_bytes,
        mime_arr
      );
    END IF;
  END LOOP;
END $$;

-- (COMMENT ON TABLE storage.buckets requires table-owner perms which the
-- migration role doesn't have — intentionally skipped. Rationale lives in
-- this file's header instead.)
