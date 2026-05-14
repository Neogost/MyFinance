-- Bannières d'information administrables
-- Affichées en haut de toutes les pages pour les utilisateurs authentifiés selon l'audience
CREATE TABLE info_banners (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       VARCHAR(120),
    message     TEXT NOT NULL,
    type        VARCHAR(20) NOT NULL CHECK(type IN ('ALERT', 'WARNING', 'MAINTENANCE', 'INFO', 'SUCCESS')),
    audience    VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK(audience IN ('ALL', 'USERS_ONLY', 'ADMIN_ONLY')),
    start_at    DATETIME NOT NULL,
    end_at      DATETIME,
    created_at  DATETIME NOT NULL,
    updated_at  DATETIME NOT NULL,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);
