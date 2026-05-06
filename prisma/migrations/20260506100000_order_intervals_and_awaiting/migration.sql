-- Order intervals (end of survey/install window) and "awaiting client" flag.
-- Все поля nullable / с дефолтами — миграция безопасна для существующих заказов.

ALTER TABLE "orders" ADD COLUMN "survey_end_at"  TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "install_end_at" TIMESTAMP(3);

ALTER TABLE "orders" ADD COLUMN "awaiting_client"       BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "awaiting_client_note"  TEXT         NOT NULL DEFAULT '';
ALTER TABLE "orders" ADD COLUMN "awaiting_client_since" TIMESTAMP(3);
