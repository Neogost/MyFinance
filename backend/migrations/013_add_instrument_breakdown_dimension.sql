-- Migration 013 — Ajout de la dimension INSTRUMENT pour la diversification crypto par instrument
-- Remplace la dimension CURRENCY côté CRYPTO (on s'objectif maintenant par coin : BTC, ETH, SOL…).
-- SQLite ne supportant pas ALTER TABLE MODIFY CONSTRAINT, la table est recrée avec le CHECK étendu.

PRAGMA foreign_keys = OFF;

CREATE TABLE patrimoine_target_breakdowns_new (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  patrimoine_target_id  INTEGER NOT NULL,
  dimension             TEXT NOT NULL CHECK (dimension IN (
                          'SECTOR','COUNTRY','CONTINENT','CURRENCY','ASSET_SUBTYPE',
                          'CRYPTO_TYPE','CRYPTO_NETWORK','PROPERTY_USAGE','INSTRUMENT'
                        )),
  breakdown_key         TEXT NOT NULL,
  target_percentage     REAL NOT NULL,
  UNIQUE (patrimoine_target_id, dimension, breakdown_key),
  FOREIGN KEY (patrimoine_target_id) REFERENCES patrimoine_targets(id) ON DELETE CASCADE
);

-- Migre les données existantes (les lignes CURRENCY/CRYPTO seront probablement absentes)
INSERT INTO patrimoine_target_breakdowns_new SELECT * FROM patrimoine_target_breakdowns
  WHERE dimension != 'CURRENCY' OR patrimoine_target_id NOT IN (
    SELECT id FROM patrimoine_targets WHERE category = 'CRYPTO'
  );

DROP TABLE patrimoine_target_breakdowns;
ALTER TABLE patrimoine_target_breakdowns_new RENAME TO patrimoine_target_breakdowns;

CREATE INDEX idx_target_breakdowns_target ON patrimoine_target_breakdowns(patrimoine_target_id);

PRAGMA foreign_keys = ON;
