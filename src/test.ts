import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { nanoid } from "nanoid";
const prisma = new PrismaClient();

const main = async () => {
  await prisma.$connect();

  const data = JSON.parse(readFileSync("./ratios.json", "utf8"));
  const ratios = [];
};
