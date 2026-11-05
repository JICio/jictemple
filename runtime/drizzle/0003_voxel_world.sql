CREATE TABLE world_scenes (
 slug TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 owner_name TEXT,
 title TEXT NOT NULL,
 summary TEXT NOT NULL,
 state TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 collaboration TEXT NOT NULL,
 request_sha256 TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(owner,idempotency_key)
);
--> statement-breakpoint
CREATE TABLE world_scene_edits (
 scene_slug TEXT NOT NULL REFERENCES world_scenes(slug),
 actor TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 request_sha256 TEXT NOT NULL,
 revision INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(scene_slug,actor,idempotency_key)
);
