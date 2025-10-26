-- Add is_pinned field to news table for president to pin articles
ALTER TABLE public.news 
ADD COLUMN is_pinned boolean DEFAULT false;

-- Update RLS policies for news to allow BDL staff to create/update
DROP POLICY IF EXISTS "BDL staff can create news" ON public.news;
DROP POLICY IF EXISTS "BDL staff can update news" ON public.news;
DROP POLICY IF EXISTS "BDL staff can delete news" ON public.news;

CREATE POLICY "BDL staff can create news" 
ON public.news 
FOR INSERT 
WITH CHECK (is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can update news" 
ON public.news 
FOR UPDATE 
USING (is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can delete news" 
ON public.news 
FOR DELETE 
USING (is_bdl_staff(auth.uid()));

-- Add index for pinned articles
CREATE INDEX idx_news_pinned ON public.news(is_pinned, published_at DESC);