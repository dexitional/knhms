import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

async function main() {
  const {
    DATABASE_URL,
    SEED_ADMIN_NAME,
    SEED_ADMIN_STAFF_NUMBER,
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
  } = process.env;

  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment.");
  }

  const connection = await mysql.createConnection({ uri: DATABASE_URL });
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

  // Idempotent: re-running after changing SEED_ADMIN_PASSWORD rotates the
  // existing super-admin's password instead of erroring on the duplicate
  // email, which doubles as a "reset the seeded admin's password" workflow.
  await connection.query(
    `INSERT INTO admins (full_name, staff_number, role, institutional_email, password_hash)
     VALUES (?, ?, 'super_admin', ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'super_admin', is_active = 1`,
    [
      SEED_ADMIN_NAME ?? "System Administrator",
      SEED_ADMIN_STAFF_NUMBER ?? "ADM-0000",
      SEED_ADMIN_EMAIL,
      passwordHash,
    ],
  );

  console.log(`Seeded super-admin: ${SEED_ADMIN_EMAIL}`);
  await connection.end();
}

main();
