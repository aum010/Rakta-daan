import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

type GlobalDb = {
  client?: ReturnType<typeof postgres>;
  db?: Db;
};

const globalForDb = globalThis as unknown as { __raktaDaanDb?: GlobalDb };

function create(url: string, max = 10): { db: Db; client: ReturnType<typeof postgres> } {
  const client = postgres(url, {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return { db: drizzle(client, { schema }), client };
}

/** Shared client for the Next.js server runtime (survives dev hot reloads). */
export function getDb(): Db {
  const existing = globalForDb.__raktaDaanDb;
  if (existing?.db) return existing.db;
  const { db, client } = create(env.databaseUrl);
  const store: GlobalDb = { db, client };
  globalForDb.__raktaDaanDb = store;
  return db;
}

export { create, schema };
