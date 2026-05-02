-- Migration 011 — Champs cryptoType et cryptoNetwork sur les instruments CRYPTO

ALTER TABLE instruments ADD COLUMN crypto_type    TEXT;
ALTER TABLE instruments ADD COLUMN crypto_network TEXT;
