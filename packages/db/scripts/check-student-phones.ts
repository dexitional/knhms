import { getPool } from "../src/pool.js";

async function main() {
  const pool = getPool();
  const [rows] = await pool.execute("SELECT id, full_name, phone_country_code, phone_number FROM students LIMIT 5");
  console.table(rows);
  await pool.end();
}

main();