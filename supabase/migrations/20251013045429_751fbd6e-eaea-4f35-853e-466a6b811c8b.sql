-- Add visibility column to news table
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'authenticated', 'bdl_only'));

-- Update RLS policies for news to respect visibility
DROP POLICY IF EXISTS "Everyone can view news" ON public.news;

CREATE POLICY "Everyone can view news based on visibility" ON public.news
FOR SELECT 
USING (
  visibility = 'public' 
  OR (visibility = 'authenticated' AND auth.uid() IS NOT NULL)
  OR (visibility = 'bdl_only' AND is_bdl_staff(auth.uid()))
);

-- Create establishment_info table for managing establishment page content
CREATE TABLE IF NOT EXISTS public.establishment_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  display_order smallint DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on establishment_info
ALTER TABLE public.establishment_info ENABLE ROW LEVEL SECURITY;

-- RLS policies for establishment_info
CREATE POLICY "Everyone can view establishment info" ON public.establishment_info
FOR SELECT 
USING (true);

CREATE POLICY "President and VP can insert establishment info" ON public.establishment_info
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'president'::app_role) 
  OR has_role(auth.uid(), 'vice_president'::app_role)
);

CREATE POLICY "President and VP can update establishment info" ON public.establishment_info
FOR UPDATE 
USING (
  has_role(auth.uid(), 'president'::app_role) 
  OR has_role(auth.uid(), 'vice_president'::app_role)
);

CREATE POLICY "President and VP can delete establishment info" ON public.establishment_info
FOR DELETE 
USING (
  has_role(auth.uid(), 'president'::app_role) 
  OR has_role(auth.uid(), 'vice_president'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_establishment_info_updated_at
BEFORE UPDATE ON public.establishment_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sections for establishment page
INSERT INTO public.establishment_info (section_key, title, content, display_order) VALUES
('history', 'Notre Histoire', 'Fondé en 1825, Le Lycée Saint-André est un établissement d''enseignement privé qui a su évoluer avec son temps tout en préservant ses valeurs fondamentales. Notre histoire est marquée par un engagement constant envers l''excellence académique et le développement personnel de chaque élève.', 1),
('education', 'Système Éducatif', 'Notre système éducatif repose sur trois piliers fondamentaux : l''excellence académique, l''accompagnement personnalisé et l''ouverture internationale. Nous proposons un parcours complet de la seconde à la terminale, avec des filières générales et technologiques adaptées aux ambitions de chacun.', 2),
('student_life', 'Vie Étudiante', 'La vie étudiante au Lycée Saint-André est riche et diversifiée. Entre les clubs, les associations sportives, les activités culturelles et les événements organisés par le BDL, chaque élève trouve sa place et peut s''épanouir pleinement dans un environnement stimulant et bienveillant.', 3),
('values', 'Nos Valeurs', 'L''excellence, le respect, la solidarité et l''innovation sont au cœur de notre projet éducatif. Ces valeurs guident notre action quotidienne et façonnent l''identité de notre établissement. Nous formons non seulement des étudiants performants, mais aussi des citoyens responsables et engagés.', 4)
ON CONFLICT (section_key) DO NOTHING;