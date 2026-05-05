-- Migration 018 : Champs fiscalité crypto
-- Étend position_orders pour tracer les opérations crypto (BUY_FIAT, SELL_FIAT, SWAP, etc.)
-- Ajoute le flag de confirmation historique sur les users

-- Nouveaux champs sur position_orders
ALTER TABLE position_orders ADD COLUMN crypto_operation_type TEXT
    CHECK (crypto_operation_type IN ('BUY_FIAT','SELL_FIAT','SWAP_OUT','SWAP_IN','TRANSFER_IN','TRANSFER_OUT'));

ALTER TABLE position_orders ADD COLUMN swap_counterpart_order_id INTEGER
    REFERENCES position_orders(id) ON DELETE SET NULL;

ALTER TABLE position_orders ADD COLUMN portfolio_value_at_date_eur REAL;

CREATE INDEX idx_position_orders_crypto_op
    ON position_orders(crypto_operation_type)
    WHERE crypto_operation_type IS NOT NULL;

-- Flag confirmation de l'historique crypto complet sur l'utilisateur
ALTER TABLE users ADD COLUMN crypto_historical_data_confirmed INTEGER NOT NULL DEFAULT 0;

-- Backfill : pour les ordres existants sur des positions CRYPTO,
-- mapper BUY → BUY_FIAT, SELL → SELL_FIAT
-- L'utilisateur devra réviser manuellement les swaps et transferts
UPDATE position_orders
SET crypto_operation_type = CASE
    WHEN order_type = 'BUY'  THEN 'BUY_FIAT'
    WHEN order_type = 'SELL' THEN 'SELL_FIAT'
    ELSE NULL
END
WHERE position_id IN (
    SELECT id FROM positions WHERE category = 'CRYPTO'
)
AND order_type IN ('BUY', 'SELL');
