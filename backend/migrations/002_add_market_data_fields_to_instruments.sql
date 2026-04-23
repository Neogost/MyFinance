-- Migration 002 : ajout des champs de résolution API sur la table instruments
-- yahoo_symbol : symbole Yahoo Finance (ex: "MC.PA") — résolu automatiquement depuis l'ISIN
-- coin_gecko_id : identifiant CoinGecko (ex: "bitcoin") — résolu automatiquement depuis le ticker
-- Ces colonnes sont nullable : null = pas encore résolu ou résolution impossible

ALTER TABLE instruments ADD COLUMN yahoo_symbol TEXT;
ALTER TABLE instruments ADD COLUMN coin_gecko_id TEXT;
