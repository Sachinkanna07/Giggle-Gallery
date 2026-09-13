import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  // The pooled Neon driver supports interactive transactions. The previous
  // neon-http driver explicitly threw for db.transaction(), which made atomic
  // payment and inventory finalization impossible.
  return drizzle({ connection: url, schema });
}

let database: ReturnType<typeof createDb> | null = null;

export function getDb() {
  database ??= createDb();
  return database;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}
