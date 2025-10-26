-- Create contact_info table for managing contact page information
CREATE TABLE IF NOT EXISTS public.contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  display_order smallint DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

-- Everyone can view contact info
CREATE POLICY "Everyone can view contact info"
ON public.contact_info
FOR SELECT
USING (true);

-- Executive members can insert contact info
CREATE POLICY "Executive members can insert contact info"
ON public.contact_info
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'president') OR 
  has_role(auth.uid(), 'vice_president') OR 
  has_role(auth.uid(), 'secretary_general') OR
  has_role(auth.uid(), 'communication_manager')
);

-- Executive members can update contact info
CREATE POLICY "Executive members can update contact info"
ON public.contact_info
FOR UPDATE
USING (
  has_role(auth.uid(), 'president') OR 
  has_role(auth.uid(), 'vice_president') OR 
  has_role(auth.uid(), 'secretary_general') OR
  has_role(auth.uid(), 'communication_manager')
);

-- Executive members can delete contact info
CREATE POLICY "Executive members can delete contact info"
ON public.contact_info
FOR DELETE
USING (
  has_role(auth.uid(), 'president') OR 
  has_role(auth.uid(), 'vice_president') OR 
  has_role(auth.uid(), 'secretary_general') OR
  has_role(auth.uid(), 'communication_manager')
);

-- Insert default contact information
INSERT INTO public.contact_info (section_key, title, content, display_order) VALUES
('email', 'Email', 'contact@bdl-saintandre.fr', 1),
('permanences', 'Permanences', 'Lundi et Jeudi\n12h00 - 14h00\nSalle B103', 2),
('adresse', 'Adresse', 'Lycée Saint-André\nBureau des Lycéens', 3),
('audience_info', 'Demande d''Audience', 'Pour rencontrer le Président Alexandre Lejal ou un membre du bureau exécutif, veuillez formuler une demande d''audience via ce formulaire.\n\nLes demandes d''audience sont examinées par la Présidence et une réponse vous sera adressée sous 48h ouvrées. Merci de préciser l''objet et l''urgence de votre demande.', 4),
('response_time', 'Délai de Réponse', 'Le BDL s''engage à répondre à toutes les demandes dans un délai maximum de 5 jours ouvrés. Les demandes urgentes seront traitées en priorité.', 5)
ON CONFLICT (section_key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_contact_info_updated_at
  BEFORE UPDATE ON public.contact_info
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();