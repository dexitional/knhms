import "dotenv/config";
import mysql from "mysql2/promise";

// Optional one-time seed of sample Yellow Pages entries, so the public page
// isn't empty before admins add real contacts. Placeholder data — edit or
// delete it from Admin → Yellow Pages. Skips seeding if the table already
// has rows, so re-running never duplicates entries.
const ENTRIES = [
  ["personnel", "Dr. Sarah Johnson", "Campus Health Director", "Health Services", "+233 (0) 55 123 4567", "sjohnson@knh.edu.gh", "Health Center, Building A", null, null],
  ["personnel", "Prof. Michael Chen", "Dean of Engineering", "Faculty of Engineering", "+233 (0) 55 234 5678", "mchen@knh.edu.gh", "Engineering Building, Room 205", null, null],
  ["personnel", "Jessica Williams", "Student Government President", "Student Affairs", "+233 (0) 55 345 6789", "jwilliams@knh.edu.gh", "Student Union, Office 104", null, null],
  ["business", "Campus Bookstore", "Retail", "Textbooks, school supplies, and KNH merchandise", "+233 (0) 55 456 7890", null, "Student Center, Ground Floor", "Mon-Fri: 8AM-6PM, Sat: 9AM-2PM", "Campus Bookstore, University of Cape Coast"],
  ["business", "Green Cafe", "Food & Beverage", "Organic coffee, smoothies, and healthy snacks", "+233 (0) 55 567 8901", null, "Near Library Entrance", "Mon-Sun: 7AM-8PM", "Green Cafe, University of Cape Coast"],
  ["business", "TechFix Repair Shop", "Services", "Laptop, phone, and electronics repair services", "+233 (0) 55 678 9012", null, "Engineering Annex, Bay 3", "Mon-Fri: 9AM-7PM, Sat: 10AM-4PM", "TechFix Repair Shop, University of Cape Coast"],
  ["executive", "Dr. Robert Osei", "Vice Chancellor", "Office of the VC", "+233 (0) 55 890 1234", "rosei@knh.edu.gh", "Admin Building, Executive Suite", null, null],
  ["executive", "Prof. Elizabeth Agyeman", "Provost & Deputy Vice Chancellor", "Academic Affairs", "+233 (0) 55 901 2345", "eagyeman@knh.edu.gh", "Admin Building, Office 201", null, null],
  ["executive", "Chief Kwame Asante", "Chief of Security", "Campus Security", "+233 (0) 55 012 3456", "kasante@knh.edu.gh", "Security Headquarters, Gate 2", null, null],
  ["executive", "Kofi Mensah", "JCR President", "Junior Common Room", "+233 (0) 24 123 4567", "kmensah@knh.edu.gh", "JCR Office, Main Block", null, null],
  ["executive", "Abena Boateng", "Hall Secretary", "JCR Executive Council", "+233 (0) 24 234 5678", "aboateng@knh.edu.gh", "JCR Office, Main Block", null, null],
  ["executive", "Yaw Darko", "Hall Treasurer", "JCR Executive Council", "+233 (0) 24 345 6789", "ydarko@knh.edu.gh", "JCR Office, Main Block", null, null],
] as const;

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");

  const connection = await mysql.createConnection({ uri });
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM directory_entries",
  );
  if (Number(rows[0]?.count) > 0) {
    console.log("directory_entries already has rows — skipping seed.");
    await connection.end();
    return;
  }

  await connection.query(
    `INSERT INTO directory_entries
       (category, name, title, subtitle, phone, email, location, hours, map_query, sort_order)
     VALUES ?`,
    [ENTRIES.map((e, i) => [...e, i])],
  );
  console.log(`Seeded ${ENTRIES.length} directory entries.`);
  await connection.end();
}

main();
