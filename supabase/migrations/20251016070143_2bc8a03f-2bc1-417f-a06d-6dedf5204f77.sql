-- Create table for BDL page content
CREATE TABLE IF NOT EXISTS public.bdl_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  display_order smallint DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for bdl_content
ALTER TABLE public.bdl_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for bdl_content
CREATE POLICY "Everyone can view BDL content"
  ON public.bdl_content
  FOR SELECT
  USING (true);

CREATE POLICY "Executive members can insert BDL content"
  ON public.bdl_content
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'president') OR 
    has_role(auth.uid(), 'vice_president') OR 
    has_role(auth.uid(), 'secretary_general')
  );

CREATE POLICY "Executive members can update BDL content"
  ON public.bdl_content
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'president') OR 
    has_role(auth.uid(), 'vice_president') OR 
    has_role(auth.uid(), 'secretary_general')
  );

CREATE POLICY "Executive members can delete BDL content"
  ON public.bdl_content
  FOR DELETE
  USING (
    has_role(auth.uid(), 'president') OR 
    has_role(auth.uid(), 'vice_president') OR 
    has_role(auth.uid(), 'secretary_general')
  );

-- Insert default BDL content
INSERT INTO public.bdl_content (section_key, title, content, display_order) VALUES
  ('hero_subtitle', 'Sous-titre', 'Votre voix au sein de l''établissement', 0),
  ('mission_title', 'Titre Mission', 'Notre Mission', 1),
  ('mission_content', 'Contenu Mission', '<p>Le Bureau des Lycéens (BDL) du Lycée Saint-André est l''instance représentative des élèves. Notre rôle est d''être à votre écoute, de porter vos idées et de dynamiser la vie scolaire.</p><p>Nous organisons des événements, gérons les clubs, et servons d''intermédiaire entre les élèves et l''administration. Notre objectif : faire de votre expérience au lycée un moment enrichissant et mémorable.</p>', 2),
  ('responsibilities_title', 'Titre Responsabilités', 'Nos Responsabilités', 3)
ON CONFLICT (section_key) DO NOTHING;

-- Create table for footer content
CREATE TABLE IF NOT EXISTS public.footer_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text,
  content text NOT NULL,
  display_order smallint DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for footer_content
ALTER TABLE public.footer_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for footer_content
CREATE POLICY "Everyone can view footer content"
  ON public.footer_content
  FOR SELECT
  USING (true);

CREATE POLICY "President and VP can insert footer content"
  ON public.footer_content
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'president') OR 
    has_role(auth.uid(), 'vice_president')
  );

CREATE POLICY "President and VP can update footer content"
  ON public.footer_content
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'president') OR 
    has_role(auth.uid(), 'vice_president')
  );

CREATE POLICY "President and VP can delete footer content"
  ON public.footer_content
  FOR DELETE
  USING (
    has_role(auth.uid(), 'president') OR 
    has_role(auth.uid(), 'vice_president')
  );

-- Insert default footer content
INSERT INTO public.footer_content (section_key, title, content, display_order) VALUES
  ('about', NULL, 'Bureau des Lycéens<br />Lycée Saint-André', 0),
  ('quote', NULL, '"Là où naît l''ambition, s''élève la grandeur."', 1),
  ('contact_address', NULL, 'Lycée Saint-André', 2),
  ('contact_email', NULL, 'contact@bdl-saintandre.fr', 3),
  ('copyright', NULL, 'Bureau des Lycéens - Lycée Saint-André. Tous droits réservés.', 4)
ON CONFLICT (section_key) DO NOTHING;

-- Create triggers for updated_at
CREATE TRIGGER update_bdl_content_updated_at
  BEFORE UPDATE ON public.bdl_content
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_footer_content_updated_at
  BEFORE UPDATE ON public.footer_content
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();