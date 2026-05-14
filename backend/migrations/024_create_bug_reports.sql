-- Signalement de bugs utilisateurs avec votes et commentaires
-- Cascade gérée applicativement dans BugReportService.delete()
CREATE TABLE bug_reports (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    title                 VARCHAR(200) NOT NULL,
    description           TEXT NOT NULL,
    expected_result       TEXT,
    reproduction_steps    TEXT,
    approximate_date_time DATETIME,
    user_impact           VARCHAR(20) NOT NULL CHECK(user_impact IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    priority              VARCHAR(20) CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status                VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'FIXED', 'CLOSED', 'REJECTED', 'DUPLICATE')),
    session_id            VARCHAR(50),
    reporter_id           INTEGER NOT NULL REFERENCES users(id),
    created_at            DATETIME NOT NULL,
    updated_at            DATETIME NOT NULL
);

-- Un vote par utilisateur par bug (UP ou DOWN)
CREATE TABLE bug_votes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_report_id INTEGER NOT NULL REFERENCES bug_reports(id),
    voter_id      INTEGER NOT NULL REFERENCES users(id),
    vote_type     VARCHAR(10) NOT NULL CHECK(vote_type IN ('UP', 'DOWN')),
    created_at    DATETIME NOT NULL,
    UNIQUE(bug_report_id, voter_id)
);

-- Commentaires publics sur un bug
CREATE TABLE bug_comments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_report_id INTEGER NOT NULL REFERENCES bug_reports(id),
    author_id     INTEGER NOT NULL REFERENCES users(id),
    content       TEXT NOT NULL,
    created_at    DATETIME NOT NULL
);
