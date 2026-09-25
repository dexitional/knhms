import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../migrations");

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");

  // multipleStatements is enabled so a future migration file isn't
  // artificially constrained to a single statement; every current file is
  // still exactly one CREATE TABLE (see the note below on why that matters).
  const connection = await mysql.createConnection({ uri, multipleStatements: true });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT filename FROM _migrations");
  const applied = new Set(rows.map((r) => r.filename as string));

  // Discovery relies on the zero-padded numeric filename prefix (0001_,
  // 0002_, ...) for correct lexicographic ordering — "1_" vs "10_" would sort
  // wrong without the padding.
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");

    process.stdout.write(`Applying ${file}... `);
    try {
      // MySQL DDL statements each implicitly commit, so there is no
      // transactional "rollback the whole file" safety net. Each migration
      // file is scoped to exactly one CREATE TABLE so a failure can never
      // leave a file half-applied.
      await connection.query(sql);
      await connection.query("INSERT INTO _migrations (filename, checksum) VALUES (?, ?)", [
        file,
        checksum,
      ]);
      console.log("done.");
    } catch (err) {
      console.log("FAILED.");
      console.error(err);
      await connection.end();
      process.exit(1);
    }
  }

  console.log("All migrations applied.");
  await connection.end();
}

main();
