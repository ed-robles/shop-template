import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

function normalizePgSslMode(urlString: string) {
  try {
    const parsed = new URL(urlString);
    const sslMode = parsed.searchParams.get("sslmode");
    const useLibpqCompat = parsed.searchParams.get("uselibpqcompat");

    if (
      useLibpqCompat !== "true" &&
      (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca")
    ) {
      // Keep today's pg v8 behavior explicit and avoid deprecation warning spam.
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
  } catch {
    return urlString;
  }

  return urlString;
}

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: normalizePgSslMode(connectionString),
  });

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
