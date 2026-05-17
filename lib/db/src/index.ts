import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function init() {
  if (_db) return;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(_pool, { schema });
}

export function getPool() {
  init();
  return _pool!;
}

export function getDb() {
  init();
  return _db!;
}

// Lazy accessor for backward compatibility with `import { db } from "@workspace/db"`
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop, getDb());
  },
  apply(_, _this, args) {
    return Reflect.apply(getDb() as any, null, args);
  },
}) as unknown as ReturnType<typeof drizzle>;

export * from "./schema";
