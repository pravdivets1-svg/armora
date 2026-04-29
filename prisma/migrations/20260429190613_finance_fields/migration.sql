-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cost_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "final_payment" DECIMAL(10,2) NOT NULL DEFAULT 0;
