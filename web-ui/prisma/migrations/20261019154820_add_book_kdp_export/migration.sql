-- CreateTable
CREATE TABLE "BookKdpExport" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "trimPreset" "BookDimension" NOT NULL,
    "bleedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookKdpExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookKdpExport_fileId_key" ON "BookKdpExport"("fileId");

-- CreateIndex
CREATE INDEX "BookKdpExport_bookId_createdAt_idx" ON "BookKdpExport"("bookId", "createdAt");

-- AddForeignKey
ALTER TABLE "BookKdpExport" ADD CONSTRAINT "BookKdpExport_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookKdpExport" ADD CONSTRAINT "BookKdpExport_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
