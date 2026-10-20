-- CreateEnum
CREATE TYPE "AiBookPlanPageType" AS ENUM ('titlePage', 'storyScene', 'activity', 'sudoku', 'wordSearch', 'maze', 'crossword', 'wordScramble', 'logicPuzzle', 'coloringPage');

-- CreateTable
CREATE TABLE "AiBookPlanPage" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "type" "AiBookPlanPageType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "settings" JSONB,
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBookPlanPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiBookPlanPage_planId_pageNumber_idx" ON "AiBookPlanPage"("planId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AiBookPlanPage_planId_pageNumber_key" ON "AiBookPlanPage"("planId", "pageNumber");

-- AddForeignKey
ALTER TABLE "AiBookPlanPage" ADD CONSTRAINT "AiBookPlanPage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AiBookPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
