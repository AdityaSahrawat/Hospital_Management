/*
  Warnings:

  - The primary key for the `Medicine` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ageGroupId` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `dosage` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Medicine` table. All the data in the column will be lost.
  - The `id` column on the `Medicine` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `group` on the `AgeGroup` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `Bed` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `form` to the `Medicine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strength` to the `Medicine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `Medicine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BedStatus" AS ENUM ('FREE', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."AgeGroupEnum" AS ENUM ('CHILD', 'TEENAGER', 'ADULT', 'OLDER');

-- DropForeignKey
ALTER TABLE "public"."Medicine" DROP CONSTRAINT "Medicine_ageGroupId_fkey";

-- AlterTable
ALTER TABLE "public"."AgeGroup" DROP COLUMN "group",
ADD COLUMN     "group" "public"."AgeGroupEnum" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Bed" DROP COLUMN "status",
ADD COLUMN     "status" "public"."BedStatus" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Medicine" DROP CONSTRAINT "Medicine_pkey",
DROP COLUMN "ageGroupId",
DROP COLUMN "dosage",
DROP COLUMN "notes",
ADD COLUMN     "form" TEXT NOT NULL,
ADD COLUMN     "strength" TEXT NOT NULL,
ADD COLUMN     "unit" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Staff" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."PrescribedMedicine" (
    "id" SERIAL NOT NULL,
    "ageGroupId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "dosage" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PrescribedMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Inventory" (
    "id" SERIAL NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "availableQty" INTEGER NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PrescribedMedicine" ADD CONSTRAINT "PrescribedMedicine_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "public"."AgeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrescribedMedicine" ADD CONSTRAINT "PrescribedMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "public"."Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "public"."Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
