-- Fonction helper : vérifie si l'utilisateur est dans l'exécutif (minRank ≤ 5)
CREATE OR REPLACE FUNCTION public.is_executif(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN (
      'administrator', 'consultante', 'consultant',
      'president', 'presidente',
      'vice_president', 'vice_presidente',
      'secretary_general', 'secretary_general2',
      'communication_manager', 'communication_manager2'
    )
  );
$$;

CREATE TABLE IF NOT EXISTS public.boite_a_idees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content      TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  author_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'archived')),
  reply        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.boite_a_idees ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur connecté peut soumettre une idée
CREATE POLICY "Authenticated users can submit ideas"
  ON public.boite_a_idees FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Chaque auteur peut voir ses propres idées
CREATE POLICY "Authors can view own ideas"
  ON public.boite_a_idees FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

-- L'exécutif peut voir toutes les idées
CREATE POLICY "Executif can view all ideas"
  ON public.boite_a_idees FOR SELECT
  TO authenticated
  USING (public.is_executif(auth.uid()));

-- L'exécutif peut mettre à jour (répondre, changer le statut)
CREATE POLICY "Executif can update ideas"
  ON public.boite_a_idees FOR UPDATE
  TO authenticated
  USING (public.is_executif(auth.uid()))
  WITH CHECK (public.is_executif(auth.uid()));
