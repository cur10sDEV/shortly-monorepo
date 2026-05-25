DROP TABLE IF EXISTS "links" CASCADE;

-- DATABASE SETUP ----------------------------------------------

-- BEGIN TRANSACTION -------------------------------------------
BEGIN;

-- CREATE TABLE "links" ---------------------------------------
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

-- COMMIT THE TRANSACTION --------------------------------------
COMMIT;

-- UPDATING updated_at on row change
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_links_modtime
    BEFORE UPDATE ON "public"."links"
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- CREATE INDEXES ---------------------------------
CREATE INDEX IF NOT EXISTS idx_links_short_code_deleted_at ON "links" ("short_code", "deleted_at");
CREATE INDEX "user_id_index" ON "links" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_links_updated_at" ON "links" ("updated_at" DESC);