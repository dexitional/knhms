import "dotenv/config";
import mysql from "mysql2/promise";

// Optional one-time seed of dummy E-Market categories and products for
// students and staff. Placeholder data — seller numbers are deliberately
// fake (020 000 0xxx). Edit or delete it from Admin → E-Market. Skips
// seeding if any category already exists, so re-running never duplicates.

const CATEGORIES = [
  ["Textbooks & Stationery", "book-open", "Course books, past questions, and study supplies"],
  ["Laptops & Computing", "laptop", "Laptops, accessories, and storage"],
  ["Phones & Accessories", "smartphone", "Phones, chargers, earphones, and power banks"],
  ["Hostel & Room Essentials", "bed", "Bedding, storage, and everything for your room"],
  ["Fashion & Campus Wear", "shirt", "Hall merch, casual wear, and bags"],
  ["Food & Provisions", "utensils", "Snacks, provisions, and kitchen basics"],
  ["Office & Staff Essentials", "briefcase", "Office supplies and furniture for staff"],
  ["Health & Personal Care", "sparkles", "Toiletries, grooming, and wellness"],
] as const;

type Seed = [
  category: number, // index into CATEGORIES
  name: string,
  price: number,
  oldPrice: number | null,
  audience: "all" | "students" | "staff",
  condition: "new" | "used",
  rating: number | null,
  seller: string,
  phone: string,
  location: string,
  featured: 0 | 1,
  description: string,
];

const PRODUCTS: Seed[] = [
  [0, "Introductory Calculus Textbook (3rd Ed.)", 85, 150, "students", "used", 4.5, "Kwesi Book Hub", "020 000 0101", "KNH Main Block, Room A14", 1, "Well-kept copy with minimal highlighting. Covers MTH 101 and MTH 102."],
  [0, "Past Questions Bundle — Level 100 (All Courses)", 35, 50, "students", "new", 4.8, "Kwesi Book Hub", "020 000 0101", "KNH Main Block, Room A14", 1, "Compiled past questions with worked solutions for all Level 100 courses."],
  [0, "A4 Hardcover Notebooks (Pack of 5)", 45, 60, "all", "new", 4.2, "Campus Stationers", "020 000 0102", "Science Market, Stall 3", 0, "200-page ruled notebooks, durable hardcover."],
  [0, "Scientific Calculator fx-991ES Plus", 180, 240, "students", "new", 4.7, "Campus Stationers", "020 000 0102", "Science Market, Stall 3", 1, "Exam-approved scientific calculator with 417 functions."],
  [0, "Highlighters & Pens Study Set", 25, null, "all", "new", 4.0, "Campus Stationers", "020 000 0102", "Science Market, Stall 3", 0, "6 highlighters, 10 ballpoint pens, and sticky notes."],
  [1, "HP EliteBook 840 G5 — Core i5, 8GB, 256GB SSD", 3200, 4100, "all", "used", 4.4, "TechZone Campus", "020 000 0201", "Old Site, Shop 12", 1, "UK-used, excellent battery life. Comes with charger and 3-month warranty."],
  [1, "Laptop Cooling Pad with 5 Fans", 120, 180, "all", "new", 4.1, "TechZone Campus", "020 000 0201", "Old Site, Shop 12", 0, "Adjustable height, USB powered, keeps your laptop cool during long study sessions."],
  [1, "SanDisk 64GB USB Flash Drive", 55, 80, "all", "new", 4.6, "TechZone Campus", "020 000 0201", "Old Site, Shop 12", 0, "USB 3.0, fast transfer for assignments and slides."],
  [1, "Wireless Mouse & Keyboard Combo", 150, 210, "staff", "new", 4.3, "TechZone Campus", "020 000 0201", "Old Site, Shop 12", 0, "Quiet keys, 2.4GHz receiver, ideal for office desks."],
  [2, "Samsung Galaxy A15 — 128GB", 1850, 2300, "all", "new", 4.5, "PhoneHub UCC", "020 000 0301", "Science Market, Stall 9", 1, "Brand new, sealed box, 1-year warranty."],
  [2, "20,000mAh Power Bank — Fast Charging", 160, 250, "students", "new", 4.6, "PhoneHub UCC", "020 000 0301", "Science Market, Stall 9", 1, "Keeps you going through lights-out. Dual USB + Type-C."],
  [2, "Wireless Earbuds with Charging Case", 140, 220, "all", "new", 3.9, "PhoneHub UCC", "020 000 0301", "Science Market, Stall 9", 0, "Bluetooth 5.3, 20 hours total playback."],
  [2, "Type-C Fast Charger (25W)", 65, 90, "all", "new", 4.2, "PhoneHub UCC", "020 000 0301", "Science Market, Stall 9", 0, "Original-grade charger with 1m cable."],
  [3, "Single Bed Sheet Set — 3 Pieces", 120, 149, "students", "new", 4.3, "Hostel Mart", "020 000 0401", "KNH Annex, Room B12", 1, "Soft cotton blend, fits standard hall mattresses."],
  [3, "Foldable Fabric Wardrobe", 218, 300, "students", "new", 4.0, "Hostel Mart", "020 000 0401", "KNH Annex, Room B12", 1, "Easy to assemble, 3 hanging sections plus shelves."],
  [3, "Rechargeable LED Study Lamp", 95, 140, "students", "new", 4.7, "Hostel Mart", "020 000 0401", "KNH Annex, Room B12", 1, "3 brightness levels, 8-hour battery — perfect for late-night reading."],
  [3, "Electric Kettle 1.8L", 110, 160, "all", "new", 4.1, "Hostel Mart", "020 000 0401", "KNH Annex, Room B12", 0, "Auto shut-off, stainless steel. Check hall rules before use."],
  [3, "Standing Fan 16-inch", 280, 350, "all", "used", 3.8, "Hostel Mart", "020 000 0401", "KNH Annex, Room B12", 0, "Used for one semester, works perfectly."],
  [4, "KNH Hall Hoodie — Orange", 120, 150, "students", "new", 4.9, "KNH JCR Merch", "020 000 0501", "JCR Office, Main Block", 1, "Official Kwame Nkrumah Hall hoodie. Leadership by Example."],
  [4, "KNH Hall T-Shirt", 60, null, "all", "new", 4.7, "KNH JCR Merch", "020 000 0501", "JCR Office, Main Block", 0, "100% cotton hall tee, all sizes available."],
  [4, "Durable Laptop Backpack", 150, 220, "all", "new", 4.4, "Campus Threads", "020 000 0502", "Old Site, Shop 4", 0, "Water-resistant, fits up to 15.6\" laptops."],
  [4, "Rubber Slides (Unisex)", 40, 55, "students", "new", 4.0, "Campus Threads", "020 000 0502", "Old Site, Shop 4", 0, "Comfortable hall slippers, sizes 38–46."],
  [5, "Gari & Shito Combo Pack", 45, 55, "students", "new", 4.8, "Auntie Ama Provisions", "020 000 0601", "KNH Back Gate", 1, "1 olonka gari + 1 large jar homemade shito. Student survival kit."],
  [5, "Instant Noodles (Carton of 40)", 150, 175, "students", "new", 4.2, "Auntie Ama Provisions", "020 000 0601", "KNH Back Gate", 0, "Assorted flavours, delivered to your room."],
  [5, "Milo 400g Tin", 55, 65, "all", "new", 4.6, "Auntie Ama Provisions", "020 000 0601", "KNH Back Gate", 0, "Genuine Milo tin."],
  [5, "Breakfast Cereal Bundle", 85, 110, "all", "new", 4.1, "Auntie Ama Provisions", "020 000 0601", "KNH Back Gate", 0, "Cornflakes, oats, and a pack of sugar."],
  [6, "Ergonomic Office Chair — Mesh Back", 950, 1300, "staff", "new", 4.5, "Office Plus Cape Coast", "020 000 0701", "Delivers to all campus offices", 1, "Adjustable height, lumbar support, 1-year warranty."],
  [6, "A4 Printing Paper (Box of 5 Reams)", 240, 280, "staff", "new", 4.4, "Office Plus Cape Coast", "020 000 0701", "Delivers to all campus offices", 0, "80gsm premium paper, suitable for all printers."],
  [6, "Desk Organizer Set", 70, 95, "staff", "new", 4.0, "Office Plus Cape Coast", "020 000 0701", "Delivers to all campus offices", 0, "Pen holder, file tray, and memo box."],
  [6, "Heavy-Duty Stapler & Punch Set", 90, null, "staff", "new", 4.3, "Office Plus Cape Coast", "020 000 0701", "Delivers to all campus offices", 0, "Staples up to 50 sheets; 2-hole punch included."],
  [7, "Toiletries Starter Pack", 75, 100, "students", "new", 4.3, "Glow Campus Store", "020 000 0801", "Science Market, Stall 15", 0, "Soap, toothpaste, toothbrush, sponge, and body lotion."],
  [7, "Mosquito Repellent Spray", 30, 40, "all", "new", 4.1, "Glow Campus Store", "020 000 0801", "Science Market, Stall 15", 0, "Long-lasting protection, gentle on skin."],
  [7, "Hair Clipper Kit (Rechargeable)", 185, 260, "students", "new", 4.4, "Glow Campus Store", "020 000 0801", "Science Market, Stall 15", 1, "Cordless clipper with 4 guide combs — start a side hustle."],
];

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");

  const connection = await mysql.createConnection({ uri });
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM market_categories",
  );
  if (Number(rows[0]?.count) > 0) {
    console.log("market_categories already has rows — skipping seed.");
    await connection.end();
    return;
  }

  const categoryIds: number[] = [];
  for (const [i, [name, icon, description]] of CATEGORIES.entries()) {
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO market_categories (name, icon, description, sort_order) VALUES (?, ?, ?, ?)",
      [name, icon, description, i],
    );
    categoryIds.push(result.insertId);
  }

  await connection.query(
    `INSERT INTO market_products
       (category_id, name, price, old_price, audience, item_condition, rating,
        seller_name, seller_phone, seller_location, is_featured, description, sort_order)
     VALUES ?`,
    [PRODUCTS.map((p, i) => [categoryIds[p[0]], ...p.slice(1), i])],
  );

  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`);
  await connection.end();
}

main();
