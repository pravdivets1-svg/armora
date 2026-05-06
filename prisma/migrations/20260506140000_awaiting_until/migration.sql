-- "Awaiting client" deadline (since + 3 days). After that — overdue.
ALTER TABLE "orders" ADD COLUMN "awaiting_client_until" TIMESTAMP(3);

-- Backfill: для всех уже выставленных «ждём клиента» считаем дедлайн = since + 3 дня.
UPDATE "orders"
   SET "awaiting_client_until" = "awaiting_client_since" + INTERVAL '3 days'
 WHERE "awaiting_client" = true
   AND "awaiting_client_since" IS NOT NULL
   AND "awaiting_client_until" IS NULL;
