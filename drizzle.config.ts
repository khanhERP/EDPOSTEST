import { defineConfig } from "drizzle-kit";

if (!process.env.EXTERNAL_DB_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.EXTERNAL_DB_URL,
  },
});
