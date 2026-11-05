-- commons-v1: additive only, so the 0.3.0 Worker keeps working until the 0.4.0 Worker replaces it.
-- world_scenes.owner/owner_name stay as storage names for the initiating identity. They grant no rights; the API exposes them as initiatedBy.
ALTER TABLE world_scene_edits ADD COLUMN access_snapshot TEXT;
--> statement-breakpoint
UPDATE world_scenes SET collaboration='public-commons', state=json_set(state,'$.buildZones',json('[]'),'$.governance','public-commons'), revision=revision+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
--> statement-breakpoint
INSERT INTO world_scene_revisions(scene_slug,revision,state,actor,created_at) SELECT slug,revision,state,'policy:commons-v1',updated_at FROM world_scenes;
--> statement-breakpoint
CREATE TABLE world_avatars (
 agent TEXT PRIMARY KEY,
 signer TEXT NOT NULL UNIQUE,
 name TEXT,
 scene TEXT NOT NULL REFERENCES world_scenes(slug),
 position TEXT NOT NULL,
 yaw REAL NOT NULL DEFAULT 0,
 action TEXT NOT NULL,
 present INTEGER NOT NULL DEFAULT 1,
 last_seen TEXT NOT NULL
);
