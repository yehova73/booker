ALTER TABLE "File" ADD COLUMN "bookCover" BOOLEAN NOT NULL DEFAULT false;

UPDATE "File"
SET "bookCover" = true
WHERE EXISTS (
    SELECT 1
    FROM "Book"
    WHERE "Book"."coverId" = "File"."id"
);
