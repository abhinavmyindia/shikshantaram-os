CREATE TABLE public.saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool TEXT NOT NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_items_user ON public.saved_items(user_id);
CREATE INDEX idx_saved_items_tool ON public.saved_items(tool);
CREATE INDEX idx_saved_items_created ON public.saved_items(created_at DESC);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved items"
  ON public.saved_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);