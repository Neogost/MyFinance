-- Migration 010 — Sous-objectifs de diversification BOURSE (stratégie patrimoniale V2)
-- Dimensions supportées : SECTOR, COUNTRY, CONTINENT, CURRENCY, ASSET_SUBTYPE, CRYPTO_TYPE
--
-- ⚠ PROD : appliquer uniquement ce script (010). Ne pas appliquer 011 ni 012.
-- ⚠ DEV  : 010 + 011 + 012 ont déjà été appliqués séquentiellement — ne pas réappliquer.

CREATE TABLE patrimoine_target_breakdowns (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  patrimoine_target_id  INTEGER NOT NULL,
  dimension             TEXT NOT NULL CHECK (dimension IN ('SECTOR','COUNTRY','CONTINENT','CURRENCY','ASSET_SUBTYPE','CRYPTO_TYPE','CRYPTO_NETWORK','PROPERTY_USAGE')),
  breakdown_key         TEXT NOT NULL,
  target_percentage     REAL NOT NULL,
  UNIQUE (patrimoine_target_id, dimension, breakdown_key),
  FOREIGN KEY (patrimoine_target_id) REFERENCES patrimoine_targets(id) ON DELETE CASCADE
);

CREATE INDEX idx_target_breakdowns_target ON patrimoine_target_breakdowns(patrimoine_target_id);
