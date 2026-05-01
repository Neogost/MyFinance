-- Migration 009 : Système d'analytics et suivi des erreurs
-- Tables : analytics_events, error_logs
-- Colonne : users.analytics_opt_out

-- Opt-out tracking sur l'utilisateur
ALTER TABLE users ADD COLUMN analytics_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

-- Events comportementaux utilisateur
CREATE TABLE IF NOT EXISTS analytics_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id  VARCHAR(36)  NOT NULL,
    event_type  VARCHAR(20)  NOT NULL CHECK (event_type IN ('PAGE_VIEW','BUTTON_CLICK','FEATURE_USE','FORM_SUBMIT')),
    event_name  VARCHAR(100) NOT NULL,
    page        VARCHAR(100),
    metadata    TEXT,
    created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_analytics_type_date  ON analytics_events(event_type, created_at);
CREATE INDEX idx_analytics_name_date  ON analytics_events(event_name, created_at);
CREATE INDEX idx_analytics_user_date  ON analytics_events(user_id, created_at);
CREATE INDEX idx_analytics_session    ON analytics_events(session_id);

-- Erreurs backend et frontend
CREATE TABLE IF NOT EXISTS error_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id      VARCHAR(36),
    source          VARCHAR(10)  NOT NULL CHECK (source IN ('BACKEND','FRONTEND')),
    level           VARCHAR(10)  NOT NULL CHECK (level IN ('WARN','ERROR','FATAL')),
    error_type      VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    stack_trace     TEXT,
    request_method  VARCHAR(10),
    request_path    VARCHAR(500),
    http_status     INTEGER,
    metadata        TEXT,
    fingerprint     VARCHAR(64)  NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_error_fingerprint    ON error_logs(fingerprint, created_at);
CREATE INDEX idx_error_source_level   ON error_logs(source, level, created_at);
CREATE INDEX idx_error_user_date      ON error_logs(user_id, created_at);
