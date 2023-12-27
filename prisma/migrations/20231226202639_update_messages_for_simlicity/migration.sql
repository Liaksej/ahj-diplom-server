/*
  Warnings:

  - You are about to drop the column `audioUrl` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "audioUrl",
DROP COLUMN "imageUrl",
DROP COLUMN "photoUrl",
ADD COLUMN     "mime" TEXT;
