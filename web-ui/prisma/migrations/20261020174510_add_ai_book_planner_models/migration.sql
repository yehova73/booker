-- CreateEnum
CREATE TYPE "AiBookPageSize" AS ENUM ('letter', 'paperback', 'square');

-- CreateEnum
CREATE TYPE "AiBookPuzzleType" AS ENUM ('sudoku', 'wordSearch', 'maze', 'crossword', 'wordScramble', 'logicPuzzle', 'coloringPage');

-- CreateEnum
CREATE TYPE "AiBookPlanStatus" AS ENUM ('draft');

-- CreateTable
CREATE TABLE "AiBookPlan" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "niche" VARCHAR(100) NOT NULL DEFAULT '',
    "pageCount" INTEGER NOT NULL DEFAULT 32,
    "pageSize" "AiBookPageSize" NOT NULL DEFAULT 'letter',
    "initialPrompt" TEXT NOT NULL,
    "storyPuzzle" BOOLEAN NOT NULL DEFAULT false,
    "status" "AiBookPlanStatus" NOT NULL DEFAULT 'draft',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBookPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBookPlanPuzzle" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" "AiBookPuzzleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiBookPlanPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiBookPlan_userId_createdAt_idx" ON "AiBookPlan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiBookPlanPuzzle_planId_idx" ON "AiBookPlanPuzzle"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "AiBookPlanPuzzle_planId_type_key" ON "AiBookPlanPuzzle"("planId", "type");

-- AddForeignKey
ALTER TABLE "AiBookPlan" ADD CONSTRAINT "AiBookPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiBookPlanPuzzle" ADD CONSTRAINT "AiBookPlanPuzzle_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AiBookPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
