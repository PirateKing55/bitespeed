import { Pool, QueryResult, QueryResultRow } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Error executing query:", { text, params, error });
    throw error;
  }
};

export const initDb = async () => {
  try {
    const initSqlPath = path.join(__dirname, "init.sql");
    const initSql = fs.readFileSync(initSqlPath, "utf-8");
    await query(initSql);
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

export const clearContacts = async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "clearContacts can only be run in test environment. Current NODE_ENV: " +
        process.env.NODE_ENV
    );
  }
  try {
    await query("TRUNCATE TABLE Contact RESTART IDENTITY CASCADE;");
    console.log("Contact table cleared for testing.");
  } catch (error) {
    console.error("Error clearing Contact table:", error);
    throw error;
  }
};

export const shutdownDb = async () => {
  try {
    await pool.end();
    console.log("Database connection pool closed.");
  } catch (error) {
    console.error("Error shutting down DB pool:", error);
  }
};
