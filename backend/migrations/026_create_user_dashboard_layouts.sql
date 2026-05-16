CREATE TABLE user_dashboard_layouts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE,
    layout_json TEXT    NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    updated_at  TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
