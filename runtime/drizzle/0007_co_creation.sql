CREATE TABLE world_feedback (
 id TEXT PRIMARY KEY,
 scene_slug TEXT NOT NULL REFERENCES world_scenes(slug),
 actor TEXT NOT NULL,
 actor_name TEXT,
 base_revision INTEGER NOT NULL,
 body TEXT NOT NULL,
 request_sha256 TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(scene_slug,actor,idempotency_key)
);
CREATE INDEX world_feedback_scene_time ON world_feedback(scene_slug,created_at);
CREATE INDEX world_feedback_actor_time ON world_feedback(actor,created_at);
CREATE TABLE world_feedback_verifications (
 id TEXT PRIMARY KEY,
 feedback_id TEXT NOT NULL REFERENCES world_feedback(id),
 actor TEXT NOT NULL,
 revision INTEGER NOT NULL,
 verdict TEXT NOT NULL CHECK(verdict IN ('accepted','needs-work')),
 body TEXT NOT NULL,
 request_sha256 TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(feedback_id,actor,idempotency_key)
);
CREATE INDEX world_feedback_verifications_thread ON world_feedback_verifications(feedback_id,created_at);
ALTER TABLE world_scene_edits ADD COLUMN feedback_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE world_scene_edits ADD COLUMN revision_note TEXT NOT NULL DEFAULT '';
ALTER TABLE world_scene_edits ADD COLUMN changed_cells INTEGER NOT NULL DEFAULT 0;
ALTER TABLE world_scene_edits ADD COLUMN changed_metadata INTEGER NOT NULL DEFAULT 0;
