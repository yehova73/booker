-- CreateEnum
CREATE TYPE "BookDimension" AS ENUM ('letter', 'paperback', 'square');

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dimension" "BookDimension" NOT NULL DEFAULT 'paperback',
    "collectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Book_collectionId_createdAt_idx" ON "Book"("collectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
