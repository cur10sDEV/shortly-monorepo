-- LINKS TABLE (requires better-auth user table to exist first)
-- Run this after the API service has started and run better-auth migrate

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."links" (
	"id" SERIAL PRIMARY KEY NOT NULL,
	"short_code" VARCHAR(255) NOT NULL UNIQUE,
	"long_url" TEXT NOT NULL,
	"password" VARCHAR(255),
	"expires_at" TIMESTAMP WITHOUT TIME ZONE,
	"user_id" TEXT,
	"deleted_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
	"created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
	"updated_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_links_short_code_deleted_at ON "links" ("short_code", "deleted_at");
CREATE INDEX IF NOT EXISTS "user_id_index" ON "links" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_links_updated_at" ON "links" ("updated_at" DESC);

COMMIT;

-- trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_links_modtime ON "public"."links";
CREATE TRIGGER update_links_modtime
    BEFORE UPDATE ON "public"."links"
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
