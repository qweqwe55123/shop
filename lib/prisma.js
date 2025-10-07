// app/lib/prisma.js
import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

// 在開發模式避免 HMR/熱重載重複 new PrismaClient()
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__PRISMA__ ??
  new PrismaClient({
    // 你原本開的 log，我幫你做成「開發多、正式少」
    log: isProd ? ["error"] : ["query", "warn", "error"],
  });

// 只有在非正式環境把實例掛到 global，正式環境每個 Lambda/進程各自維持即可
if (!isProd) globalForPrisma.__PRISMA__ = prisma;

export default prisma;
