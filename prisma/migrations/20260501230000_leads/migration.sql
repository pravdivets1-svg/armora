-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('new', 'contacted', 'scheduled', 'converted', 'rejected', 'spam');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "client_phone_digits" TEXT NOT NULL DEFAULT '',
    "client_address" TEXT,
    "width_mm" INTEGER,
    "height_mm" INTEGER,
    "comment" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "estimated_price" DECIMAL(10,2),
    "source" TEXT NOT NULL DEFAULT 'calc',
    "stage" "LeadStage" NOT NULL DEFAULT 'new',
    "assigned_to_id" TEXT,
    "converted_order_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_number_key" ON "leads"("number");

-- CreateIndex
CREATE UNIQUE INDEX "leads_converted_order_id_key" ON "leads"("converted_order_id");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE INDEX "leads_client_phone_digits_idx" ON "leads"("client_phone_digits");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_assigned_to_id_idx" ON "leads"("assigned_to_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
