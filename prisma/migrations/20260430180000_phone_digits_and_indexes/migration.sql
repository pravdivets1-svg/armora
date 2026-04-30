-- AddColumn: нормализованный телефон (только цифры) для поиска
ALTER TABLE "orders" ADD COLUMN "client_phone_digits" TEXT NOT NULL DEFAULT '';

-- Бэкфил для существующих записей: оставляем только цифры из client_phone
UPDATE "orders" SET "client_phone_digits" = regexp_replace("client_phone", '\D', '', 'g');

-- Composite-индексы под фильтры расписания (stage + surveyAt / installAt)
CREATE INDEX "orders_stage_survey_at_idx"  ON "orders"("stage", "survey_at");
CREATE INDEX "orders_stage_install_at_idx" ON "orders"("stage", "install_at");

-- Индекс под поиск по нормализованному телефону
CREATE INDEX "orders_client_phone_digits_idx" ON "orders"("client_phone_digits");
