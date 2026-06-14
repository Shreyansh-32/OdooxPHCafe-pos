/*
  Warnings:

  - The values [TO_COOK,COMPLETED] on the enum `KdsStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `uom` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minQuantity` on the `Promotion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[qrToken]` on the table `Table` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `openingAmount` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('CASHIER', 'CUSTOMER');

-- AlterEnum
BEGIN;
CREATE TYPE "KdsStatus_new" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DONE');
ALTER TABLE "public"."OrderItem" ALTER COLUMN "kdsStatus" DROP DEFAULT;
ALTER TABLE "OrderItem" ALTER COLUMN "kdsStatus" TYPE "KdsStatus_new" USING ("kdsStatus"::text::"KdsStatus_new");
ALTER TYPE "KdsStatus" RENAME TO "KdsStatus_old";
ALTER TYPE "KdsStatus_new" RENAME TO "KdsStatus";
DROP TYPE "public"."KdsStatus_old";
ALTER TABLE "OrderItem" ALTER COLUMN "kdsStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'SENT';

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropIndex
DROP INDEX "Customer_phone_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastOrderAt" TIMESTAMP(3),
ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "Floor" ADD COLUMN     "gridHeight" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "gridWidth" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerNote" TEXT,
ADD COLUMN     "promotionId" TEXT,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'CASHIER',
ALTER COLUMN "sessionId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "uom",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Promotion" DROP COLUMN "minQuantity",
ADD COLUMN     "maxUses" INTEGER,
ADD COLUMN     "usedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "openingAmount" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "height" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "qrGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "qrToken" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "width" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "x" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "y" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "targetRole" "Role",
    "userId" TEXT,
    "orderId" TEXT,
    "tableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Table_qrToken_key" ON "Table"("qrToken");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
