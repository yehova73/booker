CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_BookToFile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "File_storageKey_key" ON "File"("storageKey");
CREATE INDEX "File_userId_createdAt_idx" ON "File"("userId", "createdAt");
CREATE UNIQUE INDEX "_BookToFile_AB_unique" ON "_BookToFile"("A", "B");
CREATE INDEX "_BookToFile_B_index" ON "_BookToFile"("B");

ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_BookToFile" ADD CONSTRAINT "_BookToFile_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_BookToFile" ADD CONSTRAINT "_BookToFile_B_fkey"
    FOREIGN KEY ("B") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
