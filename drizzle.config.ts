import { config } from "dotenv";
config(); // Load environment variables from .env file

import { defineConfig } from "drizzle-kit";

// Use EXTERNAL_DB_URL if available, fallback to DATABASE_URL
const databaseUrl = process.env.EXTERNAL_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or EXTERNAL_DB_URL is required");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
