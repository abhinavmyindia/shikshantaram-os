
-- Drop CHECK constraints so we can rename values
ALTER TABLE public.product_creator_configs DROP CONSTRAINT IF EXISTS product_creator_configs_product_type_check;
ALTER TABLE public.user_products DROP CONSTRAINT IF EXISTS user_products_product_type_check;

-- Rename 'ebook' -> 'nonfiction_book'
UPDATE public.product_creator_configs SET product_type = 'nonfiction_book' WHERE product_type = 'ebook';
UPDATE public.user_products SET product_type = 'nonfiction_book' WHERE product_type = 'ebook';

-- Re-add CHECK constraints with full set
ALTER TABLE public.product_creator_configs
  ADD CONSTRAINT product_creator_configs_product_type_check
  CHECK (product_type IN ('nonfiction_book','mindmap','fiction_book','course','checklist','colouring_book'));

ALTER TABLE public.user_products
  ADD CONSTRAINT user_products_product_type_check
  CHECK (product_type IN ('nonfiction_book','mindmap','fiction_book','course','checklist','colouring_book'));

-- Seed coming-soon types
INSERT INTO public.product_creator_configs (product_type, embed_url, is_active) VALUES
  ('fiction_book',    '', false),
  ('course',          '', false),
  ('checklist',       '', false),
  ('colouring_book',  '', false)
ON CONFLICT (product_type) DO NOTHING;

-- Rename ebook_count -> nonfiction_book_count
ALTER TABLE public.product_creator_monthly_usage RENAME COLUMN ebook_count TO nonfiction_book_count;

-- Add columns for future active types
ALTER TABLE public.product_creator_monthly_usage
  ADD COLUMN IF NOT EXISTS fiction_book_count INTEGER DEFAULT 0 CHECK (fiction_book_count >= 0),
  ADD COLUMN IF NOT EXISTS course_count INTEGER DEFAULT 0 CHECK (course_count >= 0),
  ADD COLUMN IF NOT EXISTS checklist_count INTEGER DEFAULT 0 CHECK (checklist_count >= 0),
  ADD COLUMN IF NOT EXISTS colouring_book_count INTEGER DEFAULT 0 CHECK (colouring_book_count >= 0);
