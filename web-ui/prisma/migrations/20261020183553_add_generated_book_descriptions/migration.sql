-- AlterEnum
ALTER TYPE "AiBookPlanStatus" ADD VALUE 'generated';

-- AlterTable
ALTER TABLE "AiBookPlan" ADD COLUMN     "kdpDescription" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "AiBookPlanPage" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';
