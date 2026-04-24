-- Migration 003 : table de composition géographique des instruments
CREATE TABLE IF NOT EXISTS instrument_allocations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    country       TEXT    NOT NULL,
    percentage    REAL    NOT NULL,
    fetched_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instrument_allocations_instrument_id
    ON instrument_allocations(instrument_id);
