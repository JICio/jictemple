CREATE TABLE world_artifacts (
 id TEXT PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE,
 author TEXT NOT NULL,
 author_name TEXT,
 title TEXT NOT NULL,
 summary TEXT NOT NULL,
 default_locale TEXT NOT NULL,
 locales TEXT NOT NULL,
 html TEXT NOT NULL,
 license TEXT NOT NULL,
 sources TEXT NOT NULL,
 fork_of TEXT,
 html_sha256 TEXT NOT NULL,
 request_sha256 TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(author,idempotency_key)
);
--> statement-breakpoint
CREATE INDEX idx_world_artifacts_created ON world_artifacts(created_at);
--> statement-breakpoint
CREATE INDEX idx_world_artifacts_author ON world_artifacts(author,created_at);
