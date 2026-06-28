-- Тумблер «напоминать замерщику вносить данные» в синглтон-настройке.
-- Колонка с DEFAULT true — существующий ряд id='default' получает значение автоматически.

ALTER TABLE "control_reminder_config"
  ADD COLUMN "surveyor_data_reminder_enabled" BOOLEAN NOT NULL DEFAULT true;
