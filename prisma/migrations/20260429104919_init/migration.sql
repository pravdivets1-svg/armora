-- CreateEnum
CREATE TYPE "Role" AS ENUM ('director', 'manager', 'surveyor', 'installer');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('new', 'survey_scheduled', 'survey_done', 'production', 'ready_to_install', 'installed', 'closed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "public_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3),
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "client_address" TEXT NOT NULL,
    "door_comment" TEXT NOT NULL DEFAULT '',
    "width_mm" INTEGER,
    "height_mm" INTEGER,
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "prepayment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stage" "Stage" NOT NULL DEFAULT 'new',
    "surveyor_id" TEXT,
    "installer_id" TEXT,
    "survey_at" TIMESTAMP(3),
    "install_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_comments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company_name" TEXT NOT NULL,
    "company_phone" TEXT NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_public_token_key" ON "orders"("public_token");

-- CreateIndex
CREATE INDEX "orders_stage_idx" ON "orders"("stage");

-- CreateIndex
CREATE INDEX "orders_surveyor_id_idx" ON "orders"("surveyor_id");

-- CreateIndex
CREATE INDEX "orders_installer_id_idx" ON "orders"("installer_id");

-- CreateIndex
CREATE INDEX "orders_survey_at_idx" ON "orders"("survey_at");

-- CreateIndex
CREATE INDEX "orders_install_at_idx" ON "orders"("install_at");

-- CreateIndex
CREATE INDEX "order_comments_order_id_idx" ON "order_comments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_surveyor_id_fkey" FOREIGN KEY ("surveyor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_installer_id_fkey" FOREIGN KEY ("installer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_comments" ADD CONSTRAINT "order_comments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_comments" ADD CONSTRAINT "order_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
