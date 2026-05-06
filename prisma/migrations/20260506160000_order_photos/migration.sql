-- Order photos (contract / survey / act / other), stored as BYTEA in Postgres.

CREATE TYPE "OrderPhotoKind" AS ENUM ('contract', 'survey', 'act', 'other');

CREATE TABLE "order_photos" (
  "id"         TEXT NOT NULL,
  "order_id"   TEXT NOT NULL,
  "author_id"  TEXT NOT NULL,
  "kind"       "OrderPhotoKind" NOT NULL DEFAULT 'contract',
  "mime"       TEXT NOT NULL DEFAULT 'image/jpeg',
  "size"       INTEGER NOT NULL,
  "width"      INTEGER,
  "height"     INTEGER,
  "data"       BYTEA NOT NULL,
  "caption"    TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_photos_order_id_idx"      ON "order_photos"("order_id");
CREATE INDEX "order_photos_order_id_kind_idx" ON "order_photos"("order_id", "kind");

ALTER TABLE "order_photos"
  ADD CONSTRAINT "order_photos_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_photos"
  ADD CONSTRAINT "order_photos_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
