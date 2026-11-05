CREATE TABLE world_scene_revisions (
 scene_slug TEXT NOT NULL REFERENCES world_scenes(slug),
 revision INTEGER NOT NULL,
 state TEXT NOT NULL,
 actor TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(scene_slug,revision)
);
--> statement-breakpoint
CREATE TABLE world_scene_responses (
 id TEXT PRIMARY KEY,
 scene_slug TEXT NOT NULL REFERENCES world_scenes(slug),
 landmark INTEGER NOT NULL,
 actor TEXT NOT NULL,
 actor_name TEXT,
 text TEXT NOT NULL,
 links TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 request_sha256 TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(scene_slug,actor,idempotency_key)
);
