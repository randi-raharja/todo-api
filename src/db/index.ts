import { drizzle } from "drizzle-orm/bun-sql";

// You can specify any property from the bun sql connection options
const db = drizzle({ connection: { url: process.env.DATABASE_URL! } });

export default db;
