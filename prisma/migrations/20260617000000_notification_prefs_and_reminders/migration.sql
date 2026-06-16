-- Настройки уведомлений по ролям (singleton per Role)
CREATE TABLE "notification_prefs" (
    "role"        "Role"     NOT NULL,
    "prefs"       JSONB      NOT NULL DEFAULT '{}',
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("role")
);

-- Отметка «напоминание уже отправлено» (per order × kind)
CREATE TABLE "order_reminders_sent" (
    "id"       TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "kind"     TEXT NOT NULL,
    "sent_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_reminders_sent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_reminders_sent_order_id_kind_key"
    ON "order_reminders_sent" ("order_id", "kind");

CREATE INDEX "order_reminders_sent_order_id_idx"
    ON "order_reminders_sent" ("order_id");

ALTER TABLE "order_reminders_sent" ADD CONSTRAINT "order_reminders_sent_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed дефолтных настроек уведомлений по ролям.
-- Ключи событий: newLead, pendingClosure, surveyAssigned, surveyReminder24h, surveyReminder3h,
--                installAssigned, installReminder24h, installReminder3h
INSERT INTO "notification_prefs" ("role", "prefs", "updated_at") VALUES
  ('director',  '{"newLead":true, "pendingClosure":true, "surveyAssigned":false,"surveyReminder24h":false,"surveyReminder3h":false,"installAssigned":false,"installReminder24h":false,"installReminder3h":false}', CURRENT_TIMESTAMP),
  ('manager',   '{"newLead":true, "pendingClosure":false,"surveyAssigned":false,"surveyReminder24h":false,"surveyReminder3h":false,"installAssigned":false,"installReminder24h":false,"installReminder3h":false}', CURRENT_TIMESTAMP),
  ('surveyor',  '{"newLead":false,"pendingClosure":false,"surveyAssigned":true, "surveyReminder24h":true, "surveyReminder3h":true, "installAssigned":false,"installReminder24h":false,"installReminder3h":false}', CURRENT_TIMESTAMP),
  ('installer', '{"newLead":false,"pendingClosure":false,"surveyAssigned":false,"surveyReminder24h":false,"surveyReminder3h":false,"installAssigned":true, "installReminder24h":true, "installReminder3h":true}',  CURRENT_TIMESTAMP);
