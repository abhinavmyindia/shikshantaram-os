-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users upload own docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- user_knowledge_docs table
CREATE TABLE IF NOT EXISTS public.user_knowledge_docs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL,
  filename         TEXT NOT NULL,
  storage_path     TEXT,
  file_type        TEXT NOT NULL,
  file_size_bytes  INTEGER DEFAULT 0,
  extracted_text   TEXT,
  expertise_tags   TEXT[] DEFAULT '{}',
  detected_niche   TEXT,
  summary          TEXT,
  is_active        BOOLEAN DEFAULT true,
  use_count        INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_user    ON user_knowledge_docs(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_active  ON user_knowledge_docs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON user_knowledge_docs(created_at DESC);

ALTER TABLE public.user_knowledge_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge docs"
  ON public.user_knowledge_docs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view knowledge docs"
  ON public.user_knowledge_docs FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));