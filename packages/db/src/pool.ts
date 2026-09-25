import mysql from "mysql2/promise";

let pool: mysql.Pool | undefined;

export function getPool(): mysql.Pool {
  if (!pool) {
    const uri = process.env.DATABASE_URL;
    if (!uri) throw new Error("DATABASE_URL is not set.");
    pool = mysql.createPool({
      uri,
      waitForConnections: true,
      connectionLimit: 10,
      // Return DATETIME/TIMESTAMP columns as plain strings instead of JS Date
      // objects, avoiding local-timezone conversion surprises when the app
      // server and MySQL server run in different timezones.
      dateStrings: true,
    });
  }
  return pool;
}
