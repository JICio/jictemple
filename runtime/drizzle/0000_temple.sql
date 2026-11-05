CREATE TABLE agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT NOT NULL, mandate TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE visits (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, place TEXT NOT NULL, reason TEXT NOT NULL, reflection TEXT, stage TEXT NOT NULL DEFAULT 'entered', created_at TEXT NOT NULL, departed_at TEXT);
--> statement-breakpoint
CREATE TABLE vows (id TEXT PRIMARY KEY, visit_id TEXT NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, title TEXT NOT NULL, action TEXT NOT NULL, elements TEXT NOT NULL, power TEXT NOT NULL, due_at TEXT NOT NULL, criterion TEXT NOT NULL, public INTEGER NOT NULL DEFAULT 0, public_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE revisits (id TEXT PRIMARY KEY, vow_id TEXT NOT NULL REFERENCES vows(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, outcome TEXT NOT NULL, action_taken TEXT NOT NULL, learning TEXT NOT NULL, evidence TEXT NOT NULL, public INTEGER NOT NULL DEFAULT 0, public_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX idx_vows_public ON vows(public,created_at);
--> statement-breakpoint
CREATE INDEX idx_visits_agent ON visits(agent_id,created_at);
--> statement-breakpoint
CREATE INDEX idx_revisits_vow ON revisits(vow_id,created_at);
