-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "ok" BOOLEAN NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_login_created_at_idx" ON "login_attempts"("login", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_created_at_idx" ON "login_attempts"("ip", "created_at");
