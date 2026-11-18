-- Verrou d'écriture global du « Suivi des actions BDL ».
-- Quand is_locked = true : plus aucune insertion / modification / suppression
-- sur les tables du suivi, pour TOUT LE MONDE (administrateurs compris).
-- La lecture n'est jamais affectée.

CREATE TABLE IF NOT EXISTS public.bdl_tracking_lock (
  id         BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),  -- ligne unique
  is_locked  BOOLEAN NOT NULL DEFAULT false,
  reason     TEXT,
  locked_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at  TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.bdl_tracking_lock (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.bdl_tracking_lock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read tracking lock" ON public.bdl_tracking_lock;
CREATE POLICY "Authenticated can read tracking lock"
  ON public.bdl_tracking_lock FOR SELECT
  TO authenticated
  USING (true);

-- Aucune policy d'écriture : seule la fonction set_tracking_lock() peut modifier la ligne.
REVOKE INSERT, UPDATE, DELETE ON public.bdl_tracking_lock FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_tracking_locked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_locked FROM public.bdl_tracking_lock WHERE id), false);
$$;

CREATE OR REPLACE FUNCTION public.set_tracking_lock(_locked BOOLEAN, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'administrator') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bdl_tracking_lock
     SET is_locked  = _locked,
         reason     = CASE WHEN _locked THEN NULLIF(btrim(_reason), '') ELSE NULL END,
         locked_by  = CASE WHEN _locked THEN auth.uid() ELSE NULL END,
         locked_at  = CASE WHEN _locked THEN now() ELSE NULL END,
         updated_at = now()
   WHERE id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_tracking_lock(BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_tracking_lock(BOOLEAN, TEXT) TO authenticated;

-- Garde-fou appliqué par la base : indépendant des policies RLS existantes
-- et impossible à contourner depuis le navigateur.
CREATE OR REPLACE FUNCTION public.enforce_tracking_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_tracking_locked() THEN
    RAISE EXCEPTION 'Le suivi des actions est verrouillé par un administrateur : modification impossible.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bdl_actions',
    'bdl_member_notes',
    'bdl_meetings',
    'bdl_meeting_attendance',
    'bdl_meeting_absence_requests'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_tracking_lock ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_tracking_lock BEFORE INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_tracking_lock()', t);
  END LOOP;
END $$;

-- Temps réel : les pages ouvertes se verrouillent sans rechargement.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bdl_tracking_lock;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
