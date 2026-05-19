
CREATE TABLE IF NOT EXISTS public.product_creator_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_type TEXT NOT NULL UNIQUE CHECK (product_type IN ('ebook', 'mindmap')),
  embed_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.product_creator_configs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.product_creator_configs (product_type, embed_url) VALUES
('ebook', 'https://workflow.getmindpal.com/advanced-ebook-creator---research-backed-professional-publishing-engine-1779189169882'),
('mindmap', 'https://workflow.getmindpal.com/professional-mind-map-generator---visual-topic-breakdown-engine-1779192412772')
ON CONFLICT (product_type) DO UPDATE
  SET embed_url = EXCLUDED.embed_url, updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.user_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN ('ebook', 'mindmap')),
  product_name TEXT NOT NULL,
  author_name TEXT,
  country TEXT,
  niche TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'product_navigator')),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own products" ON public.user_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own products" ON public.user_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own products" ON public.user_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own products" ON public.user_products FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_user ON public.user_products(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_creator_monthly_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  ebook_count INTEGER DEFAULT 0 CHECK (ebook_count >= 0),
  mindmap_count INTEGER DEFAULT 0 CHECK (mindmap_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);
ALTER TABLE public.product_creator_monthly_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.product_creator_monthly_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.edge_function_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT,
  user_id UUID,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;
