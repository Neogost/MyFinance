-- Champs de suivi pour le système de hauts faits
ALTER TABLE users ADD COLUMN all_time_high_eur NUMERIC;
ALTER TABLE users ADD COLUMN initial_net_worth_eur NUMERIC;
ALTER TABLE users ADD COLUMN last_achievement_seen_at TIMESTAMP;

-- Table des hauts faits débloqués par utilisateur
CREATE TABLE user_achievement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_code VARCHAR(40) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    confirmed_at TIMESTAMP,
    confirmation_snapshot_id BIGINT REFERENCES portfolio_snapshots(id),
    first_eligible_at TIMESTAMP,
    consecutive_validations INTEGER DEFAULT 0,
    last_check_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_achievement_unique
    ON user_achievement(user_id, achievement_code, level);
CREATE INDEX idx_user_achievement_user
    ON user_achievement(user_id);
