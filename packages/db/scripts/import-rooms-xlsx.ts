// One-off importer for files/ROOMS.xlsx — a hand-maintained room list in a
// two-column-by-gender layout ("Female Room Stats" / "Male Room Stats"),
// each cell shaped "BLOCK <block> : <room number>". This is NOT the same
// format as the admin bulk-upload feature (Room Number/Block/Floor/Capacity/
// Gender Type columns) — that feature expects a spreadsheet an admin fills
// in themselves; this script exists specifically to load the real hall room
// list once. Safe to re-run: upserts by room_number, same as bulk-upload.
import "dotenv/config";
import path from "node:path";
import mysql from "mysql2/promise";
// Default import, not `import * as XLSX` — the xlsx package's CJS->ESM
// interop only exposes readFile() under the default export (read/utils are
// separately detected as named exports by cjs-module-lexer, but readFile
// isn't, since it's assigned to module.exports after the fact).
import XLSX from "xlsx";

const XLSX_PATH = path.resolve(import.meta.dirname, "../../../files/ROOMS.xlsx");

// Confirmed with the hall admin: these 20 female rooms are named identically
// to their own block (e.g. block "A1" contains only room "A1") — an annex/
// single-room pattern distinct from the standard numbered rooms — and get
// capacity 2. Every other room gets the schema default of 4.
const ANNEX_CAPACITY = 2;
const STANDARD_CAPACITY = 4;

interface ParsedRoom {
  block: string;
  roomNumber: string;
  genderType: "male" | "female";
}

function parseCell(cell: unknown, genderType: "male" | "female"): ParsedRoom | null {
  if (!cell) return null;
  const match = String(cell).match(/^BLOCK\s+(\S+)\s*:\s*(\S+)$/i);
  if (!match) throw new Error(`Unrecognized cell format: ${JSON.stringify(cell)}`);
  const [, block, roomNumber] = match;
  return { block: block!, roomNumber: roomNumber!, genderType };
}

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");

  const workbook = XLSX.readFile(XLSX_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<[unknown, unknown, unknown]>(sheet, {
    header: 1,
    defval: null,
  });

  const parsed: ParsedRoom[] = [];
  // Row 0 is blank, row 1 is the "Female Room Stats" / "Male Room Stats"
  // header — data starts at row 2. Column A = female, column C = male.
  for (let i = 2; i < rows.length; i++) {
    const [female, , male] = rows[i]!;
    const femaleRoom = parseCell(female, "female");
    const maleRoom = parseCell(male, "male");
    if (femaleRoom) parsed.push(femaleRoom);
    if (maleRoom) parsed.push(maleRoom);
  }

  const seen = new Set<string>();
  for (const room of parsed) {
    if (seen.has(room.roomNumber)) {
      throw new Error(`Duplicate room number in spreadsheet: ${room.roomNumber}`);
    }
    seen.add(room.roomNumber);
  }

  const connection = await mysql.createConnection({ uri });
  let inserted = 0;
  let updated = 0;

  for (const room of parsed) {
    const isAnnex = room.block === room.roomNumber;
    const capacity = isAnnex ? ANNEX_CAPACITY : STANDARD_CAPACITY;

    const [result] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO rooms (room_number, block, capacity, gender_type)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         block = VALUES(block), capacity = VALUES(capacity), gender_type = VALUES(gender_type)`,
      [room.roomNumber, room.block, capacity, room.genderType],
    );
    // insertId is 0 on an ON DUPLICATE KEY UPDATE that matched an existing row
    if (result.insertId !== 0) inserted++;
    else updated++;
  }

  console.log(`Imported ${parsed.length} rooms from ROOMS.xlsx: ${inserted} inserted, ${updated} updated.`);
  const femaleCount = parsed.filter((r) => r.genderType === "female").length;
  const maleCount = parsed.filter((r) => r.genderType === "male").length;
  console.log(`  Female: ${femaleCount}, Male: ${maleCount}`);

  await connection.end();
}

main();
