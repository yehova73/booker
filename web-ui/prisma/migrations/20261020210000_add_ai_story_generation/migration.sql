-- CreateEnum
CREATE TYPE "AiBookStoryPageStatus" AS ENUM ('pending', 'generating', 'generated', 'failed');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN "aiBookPlanId" TEXT;

-- AlterTable
ALTER TABLE "AiBookPlanPage"
ADD COLUMN "storyText" TEXT,
ADD COLUMN "continuitySummary" TEXT,
ADD COLUMN "storyStatus" "AiBookStoryPageStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "storyError" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Book_aiBookPlanId_key" ON "Book"("aiBookPlanId");

-- AddForeignKey
ALTER TABLE "Book"
ADD CONSTRAINT "Book_aiBookPlanId_fkey"
FOREIGN KEY ("aiBookPlanId") REFERENCES "AiBookPlan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
