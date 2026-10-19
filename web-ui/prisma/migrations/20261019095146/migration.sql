-- AlterTable
ALTER TABLE "_BookToFile" ADD CONSTRAINT "_BookToFile_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_BookToFile_AB_unique";
