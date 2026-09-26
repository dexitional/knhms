import { getPool } from "../src/pool.js";

async function main() {
  const pool = getPool();
  const [rows] = await pool.execute("SELECT id, full_name, phone_number FROM admins");
  console.table(rows);
  await pool.end();
}

main();