-- Migration Palier 3 — Dashboards multiples
-- À exécuter MANUELLEMENT sur la DB de production AVANT le déploiement du backend.
-- Idempotent : protégé par IF NOT EXISTS / IF EXISTS.
--
-- Ordre d'exécution :
--   1. Créer user_dashboards
--   2. Insérer un dashboard "Principal" par utilisateur ayant un layout existant
--   3. Recréer user_dashboard_layouts avec dashboard_id à la place de user_id
-- ─────────────────────────────────────────────────────────────────────────────

-- Étape 1 : nouvelle table user_dashboards
CREATE TABLE IF NOT EXISTS user_dashboards (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER  NOT NULL,
    name       TEXT     NOT NULL,
    sort_order INTEGER  NOT NULL DEFAULT 0,
    is_default INTEGER  NOT NULL DEFAULT 0,
    created_at TEXT     NOT NULL,
    updated_at TEXT     NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Étape 2 : créer un dashboard "Principal" (is_default=1) pour chaque user
--           qui avait déjà un layout en Palier 2
INSERT INTO user_dashboards (user_id, name, sort_order, is_default, created_at, updated_at)
SELECT
    user_id,
    'Principal',
    0,
    1,
    datetime('now'),
    datetime('now')
FROM user_dashboard_layouts
WHERE user_id NOT IN (SELECT user_id FROM user_dashboards);

-- Étape 3 : recréer user_dashboard_layouts avec dashboard_id
CREATE TABLE IF NOT EXISTS user_dashboard_layouts_new (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    dashboard_id INTEGER NOT NULL,
    layout_json  TEXT    NOT NULL,
    version      INTEGER NOT NULL,
    updated_at   TEXT    NOT NULL,
    FOREIGN KEY (dashboard_id) REFERENCES user_dashboards(id)
);

INSERT INTO user_dashboard_layouts_new (dashboard_id, layout_json, version, updated_at)
SELECT
    ud.id,
    udl.layout_json,
    udl.version,
    -- Convertit epoch-ms en datetime si la valeur est numérique (ancien format Hibernate)
    CASE
        WHEN typeof(udl.updated_at) = 'integer' OR (typeof(udl.updated_at) = 'text' AND length(udl.updated_at) = 13 AND udl.updated_at GLOB '[0-9]*')
        THEN datetime(CAST(udl.updated_at AS INTEGER) / 1000, 'unixepoch')
        ELSE udl.updated_at
    END
FROM user_dashboard_layouts udl
JOIN user_dashboards ud ON ud.user_id = udl.user_id AND ud.is_default = 1;

DROP TABLE IF EXISTS user_dashboard_layouts;
ALTER TABLE user_dashboard_layouts_new RENAME TO user_dashboard_layouts;
