-- Ajoute la valeur "ancien_eleve" à l'enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ancien_eleve';
