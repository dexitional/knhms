import "dotenv/config";
import mysql from "mysql2/promise";

// Optional one-time seed of sample hall stock (and categories) for the
// Inventory feature.
// Quantities are placeholders — edit or remove items from Admin → Inventory.
// Skips seeding if any item already exists, so re-running never duplicates.

const ITEMS: Array<
  [name: string, description: string | null, category: string, quantity: number, minQuantity: number]
> = [
  ["LED bulbs (18W)", "Replacement bulbs for rooms and corridors", "Electrical", 120, 30],
  ["Fluorescent tubes (4ft)", "For corridor and common-room fittings", "Electrical", 40, 10],
  ["Padlocks", "Wardrobe and store-room padlocks", "Hardware", 25, 10],
  ["Door handles", "Replacement room door handles", "Hardware", 8, 4],
  ["Mattresses (single)", "Foam mattresses, 6 inch", "Furniture & bedding", 12, 5],
  ["Plastic chairs", "Common room and events", "Furniture & bedding", 50, 15],
  ["Toilet rolls (pack of 10)", null, "Washroom supplies", 60, 20],
  ["Liquid soap (5L)", "Hand-washing soap for washrooms", "Washroom supplies", 18, 6],
  ["Bleach (5L)", "Cleaning and disinfection", "Cleaning", 14, 5],
  ["Brooms", null, "Cleaning", 20, 8],
  ["Mops", null, "Cleaning", 15, 6],
  ["Refuse bags (roll)", "Large bin liners", "Cleaning", 30, 10],
];

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");
  const connection = await mysql.createConnection({ uri });
  const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM inventory_items");
  if (Number(rows[0]?.count) > 0) {
    console.log("inventory_items already has rows — skipping seed.");
    await connection.end();
    return;
  }
  await connection.beginTransaction();
  try {
    const categoryIds = new Map<string, number>();
    for (const category of new Set(ITEMS.map((i) => i[2]))) {
      const [r] = await connection.execute<mysql.ResultSetHeader>(
        "INSERT INTO inventory_categories (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
        [category],
      );
      categoryIds.set(category, r.insertId);
    }
    for (const [name, description, category, quantity, minQuantity] of ITEMS) {
      const [result] = await connection.execute<mysql.ResultSetHeader>(
        "INSERT INTO inventory_items (name, description, category_id, quantity, min_quantity) VALUES (?, ?, ?, ?, ?)",
        [name, description, categoryIds.get(category) ?? null, quantity, minQuantity],
      );
      await connection.execute(
        "INSERT INTO inventory_movements (item_id, quantity_change, quantity_after, reason, note) VALUES (?, ?, ?, 'opening', 'Opening stock')",
        [result.insertId, quantity, quantity],
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  }
  console.log(`Seeded ${ITEMS.length} inventory items.`);
  await connection.end();
}

main();
