-- Контроль производственного конвейера: «не забыли отправить в производство»
-- и честный счётчик «застрял на стадии».

-- 1) Честный счётчик времени на стадии. Отдельная колонка, которая двигается
--    ТОЛЬКО при смене этапа (updatedAt двигался при любой правке и врал про «застрял»).
ALTER TABLE "orders" ADD COLUMN "stage_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Бэкафилл существующих заказов: берём время последней смены этапа из истории
-- (order_events.kind = 'stage'), иначе — момент создания заказа.
UPDATE "orders" o SET "stage_changed_at" = COALESCE(
  (SELECT MAX(e."created_at") FROM "order_events" e
     WHERE e."order_id" = o."id" AND e."kind" = 'stage'),
  o."created_at"
);

CREATE INDEX "orders_stage_stage_changed_at_idx" ON "orders"("stage", "stage_changed_at");

-- 2) Новый контрольный триггер: заказ готов к запуску (замер сделан, аванс получен),
--    но не переведён в производство дольше N дней.
ALTER TABLE "control_reminder_config"
  ADD COLUMN "survey_done_stale_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "survey_done_stale_days" INTEGER NOT NULL DEFAULT 2;
