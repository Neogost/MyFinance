-- Migration 004 : table de composition sectorielle des instruments
CREATE TABLE IF NOT EXISTS instrument_sector_allocations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    sector        TEXT    NOT NULL,
    percentage    REAL    NOT NULL,
    fetched_at    timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instrument_sector_allocations_instrument_id
    ON instrument_sector_allocations(instrument_id);
