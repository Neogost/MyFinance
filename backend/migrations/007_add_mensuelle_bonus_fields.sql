-- Migration 007 : ajout du type de prime MENSUELLE
-- SQLite ne supporte pas ALTER TABLE ... MODIFY CONSTRAINT.
-- On recrée la table avec la contrainte CHECK étendue + les nouvelles colonnes.

PRAGMA foreign_keys = OFF;

CREATE TABLE contract_bonuses_new (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id    INTEGER NOT NULL REFERENCES salary_contracts(id),
    label          TEXT    NOT NULL,
    gross_amount   REAL    NOT NULL,
    type           TEXT    NOT NULL CHECK (type IN ('EXCEPTIONNELLE', 'ANNUELLE', 'MENSUELLE')),
    payment_date   DATE,
    payment_month  INTEGER,
    start_date     DATE,
    end_date       DATE
);

INSERT INTO contract_bonuses_new (id, contract_id, label, gross_amount, type, payment_date, payment_month)
SELECT                             id, contract_id, label, gross_amount, type, payment_date, payment_month
FROM contract_bonuses;

DROP TABLE contract_bonuses;
ALTER TABLE contract_bonuses_new RENAME TO contract_bonuses;

PRAGMA foreign_keys = ON;
