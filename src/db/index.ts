import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_SRNJjlF7gIG5@ep-mute-dust-b38n2upd-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
