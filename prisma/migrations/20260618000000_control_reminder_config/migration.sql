-- ControlReminderConfig: singleton-настройка контрольных напоминаний.
-- Один ряд id='default' с дефолтными порогами.

CREATE TABLE "control_reminder_config" (
    "id" TEXT NOT NULL,
    "production_stale_enabled" BOOLEAN NOT NULL DEFAULT true,
    "production_stale_days" INTEGER NOT NULL DEFAULT 12,
    "installed_no_close_enabled" BOOLEAN NOT NULL DEFAULT true,
    "installed_no_close_days" INTEGER NOT NULL DEFAULT 2,
    "pending_closure_stale_enabled" BOOLEAN NOT NULL DEFAULT true,
    "pending_closure_stale_days" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_reminder_config_pkey" PRIMARY KEY ("id")
);

-- Создаём дефолтный ряд сразу — все дальнейшие чтения находят его.
INSERT INTO "control_reminder_config" (
  "id",
  "production_stale_enabled", "production_stale_days",
  "installed_no_close_enabled", "installed_no_close_days",
  "pending_closure_stale_enabled", "pending_closure_stale_days",
  "updated_at"
) VALUES (
  'default',
  true, 12,
  true, 2,
  true, 3,
  NOW()
);
