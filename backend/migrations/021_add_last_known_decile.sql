-- Dernier décile INSEE connu de l'utilisateur — utilisé pour détecter la progression (L'Ascension)
ALTER TABLE users ADD COLUMN last_known_decile INTEGER;
