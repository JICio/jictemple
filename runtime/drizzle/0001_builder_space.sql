CREATE TABLE build_intents (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, payer TEXT NOT NULL, memo TEXT NOT NULL UNIQUE, router TEXT NOT NULL, usdc TEXT NOT NULL, love TEXT NOT NULL, usdc_units TEXT NOT NULL, display_love TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, tx_hash TEXT UNIQUE, confirmed_at TEXT);
--> statement-breakpoint
CREATE TABLE spaces (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, title TEXT NOT NULL, summary TEXT NOT NULL, kind TEXT NOT NULL, current_version INTEGER NOT NULL DEFAULT 1, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE space_versions (space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, version INTEGER NOT NULL, content TEXT NOT NULL, sources TEXT NOT NULL, change_note TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(space_id,version));
--> statement-breakpoint
CREATE INDEX idx_spaces_public ON spaces(published,updated_at);
