
ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS auto_diagnosis TEXT,
  ADD COLUMN IF NOT EXISTS suggested_fix TEXT;

CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(fingerprint);

UPDATE error_logs
SET fingerprint = md5(COALESCE(error_type,'') || '::' || COALESCE(LEFT(message, 100),'') || '::' || COALESCE(module,''))
WHERE fingerprint IS NULL;
