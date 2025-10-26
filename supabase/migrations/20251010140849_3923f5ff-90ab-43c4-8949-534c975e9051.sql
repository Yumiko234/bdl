-- Create table for president's message
CREATE TABLE public.president_message (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.president_message ENABLE ROW LEVEL SECURITY;

-- Everyone can view the president's message
CREATE POLICY "Everyone can view president message"
ON public.president_message
FOR SELECT
USING (true);

-- Only president can update the message
CREATE POLICY "Only president can update message"
ON public.president_message
FOR UPDATE
USING (has_role(auth.uid(), 'president'::app_role));

-- Only president can insert the message
CREATE POLICY "Only president can insert message"
ON public.president_message
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'president'::app_role));

-- Insert initial message
INSERT INTO public.president_message (content, updated_by)
VALUES (
  E'Chers lycéens, chers membres de notre communauté,\n\nC''est avec un immense honneur que je vous accueille sur le site officiel du Bureau des Lycéens du Lycée Saint-André. Notre mission est claire : représenter vos intérêts, enrichir votre expérience scolaire et créer un environnement où chacun peut s''épanouir.\n\nCe site est votre outil pour rester informé, participer à la vie de l''établissement et accéder aux ressources dont vous avez besoin. Ensemble, faisons de notre lycée un lieu d''excellence et de solidarité.\n\n"Là où naît l''ambition, s''élève la grandeur."',
  NULL
);