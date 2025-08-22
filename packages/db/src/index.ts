import { PrismaClient, Prisma, AgeGroupEnum, BedStatus } from "@prisma/client";

export const prismaClient = new PrismaClient();

export { Prisma, AgeGroupEnum, BedStatus };