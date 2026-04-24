-- Migration 005 : ajout du type 'ABONDEMENT' dans la contrainte CHECK de position_orders
-- SQLite ne supporte pas ALTER COLUMN — recréation de la table avec la contrainte mise à jour.

BEGIN;

CREATE TABLE position_orders_new (
    id           INTEGER PRIMARY KEY,
    amount       NUMERIC(38,2) NOT NULL,
    amount_eur   NUMERIC(38,2) NOT NULL,
    exchange_rate NUMERIC(38,2),
    notes        VARCHAR(255),
    order_date   DATE NOT NULL,
    order_type   VARCHAR(255) NOT NULL CHECK (order_type IN ('BUY','SELL','DEPOSIT','WITHDRAWAL','INTEREST','DIVIDEND','AIRDROP','ABONDEMENT')),
    position_id  BIGINT NOT NULL,
    quantity     NUMERIC(38,2),
    unit_price   NUMERIC(38,2)
);

INSERT INTO position_orders_new SELECT * FROM position_orders;

DROP TABLE position_orders;

ALTER TABLE position_orders_new RENAME TO position_orders;

COMMIT;
