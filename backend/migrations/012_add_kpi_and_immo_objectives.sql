-- Migration 012 — KPI patrimoniaux + objectifs immobiliers

-- Lien revenu locatif → bien immobilier
ALTER TABLE other_incomes ADD COLUMN position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL;

-- Usage du bien (IMMO_PHYSIQUE : RP / Locatif / Secondaire / Autre)
ALTER TABLE positions ADD COLUMN property_usage TEXT;

-- Plafond de liquidité / livret
ALTER TABLE patrimoine_targets ADD COLUMN target_max_amount_eur REAL;

-- Objectifs KPI patrimoniaux (rendement, LTV)
CREATE TABLE patrimoine_kpi_targets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  kpi_type   TEXT NOT NULL CHECK (kpi_type IN ('IMMO_RENDEMENT_BRUT','IMMO_LTV','IMMO_PAPIER_RENDEMENT')),
  target_value REAL NOT NULL,
  UNIQUE (user_id, kpi_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- PROPERTY_USAGE dans le check constraint des breakdowns (si la table a déjà été créée)
-- ⚠ PROD : si vous appliquez 010 + 011 + 012 dans l'ordre, le CHECK de 010 ne contient pas
--   PROPERTY_USAGE. Recréez la table avec le script ci-dessous ou ajoutez la migration manuellement.
