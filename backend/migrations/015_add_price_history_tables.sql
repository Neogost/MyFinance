-- Migration 015 : Historique quotidien des cours d'instruments et des taux de change
-- Pré-requis pour le calcul de performance patrimoniale (TWR / MWR)
-- Ces tables remplacent l'usage de lastPrice / ExchangeRate.rate pour les calculs historiques

-- Cours quotidien par instrument (BOURSE / CRYPTO)
CREATE TABLE IF NOT EXISTS instrument_price_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    price_date    DATE    NOT NULL,
    price         DECIMAL(18, 6) NOT NULL,
    source        VARCHAR(20) NOT NULL CHECK (source IN ('BOURSORAMA', 'COINGECKO', 'MANUAL_CSV', 'MANUAL')),
    UNIQUE (instrument_id, price_date)
);

CREATE INDEX idx_iph_instrument_date ON instrument_price_history(instrument_id, price_date DESC);

-- Taux de change quotidien par devise (EUR comme devise de référence)
-- Convention identique à exchange_rates : amount_eur = amount_natif / rate
CREATE TABLE IF NOT EXISTS exchange_rate_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    currency  VARCHAR(3) NOT NULL,
    rate_date DATE       NOT NULL,
    rate      DECIMAL(18, 8) NOT NULL,
    source    VARCHAR(20) NOT NULL CHECK (source IN ('ECB', 'FRANKFURTER', 'MANUAL')),
    UNIQUE (currency, rate_date)
);

CREATE INDEX idx_erh_currency_date ON exchange_rate_history(currency, rate_date DESC);
