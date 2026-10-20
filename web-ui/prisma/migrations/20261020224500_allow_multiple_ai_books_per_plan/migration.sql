-- DropIndex
DROP INDEX "Book_aiBookPlanId_key";

-- CreateIndex
CREATE INDEX "Book_aiBookPlanId_idx" ON "Book"("aiBookPlanId");
