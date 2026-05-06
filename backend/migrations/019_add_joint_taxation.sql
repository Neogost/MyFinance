-- Migration 019 : Statut matrimonial fiscal pour le calcul de la décote IRPP
-- Article 197 I-4 CGI — la décote s'applique différemment selon que le foyer
-- est soumis à imposition commune (couple) ou non (célibataire/parent isolé/veuf).
-- Le nombre de parts (fiscalParts) ne suffit pas : un célibataire avec 2 enfants a 2 parts
-- mais reste dans la catégorie « célibataire » pour la décote.

ALTER TABLE users ADD COLUMN joint_taxation INTEGER NOT NULL DEFAULT 0;

-- Note : valeur par défaut 0 (false) → célibataire — appliquée à tous les utilisateurs existants.
-- L'utilisateur peut basculer dans son profil fiscal s'il est marié·e ou pacsé·e en imposition commune.
