import "dotenv/config";
import mysql from "mysql2/promise";

// Optional one-time seed of dummy food vendors and menus for the E-Market.
// Placeholder data — phone numbers are deliberately fake (020 000 09xx).
// Edit or delete it from Admin → E-Market → Food Vendors. Skips seeding if
// any vendor already exists, so re-running never duplicates.

type Item = [section: string, name: string, price: number, description?: string, available?: boolean];

const VENDORS: Array<{
  name: string;
  cuisine: string;
  description: string;
  phone: string;
  location: string;
  hours: string;
  delivers: boolean;
  isOpen: boolean;
  menu: Item[];
}> = [
  {
    name: "Auntie Esi's Waakye",
    cuisine: "Local breakfast & lunch",
    description: "The hall's favourite waakye since 2015. Generous portions, homemade shito.",
    phone: "020 000 0901",
    location: "KNH Back Gate",
    hours: "Mon–Sat: 6:30AM–2PM",
    delivers: true,
    isOpen: true,
    menu: [
      ["Mains", "Waakye Special", 35, "Waakye with egg, wele, spaghetti, gari, and shito"],
      ["Mains", "Waakye Regular", 20, "Waakye with spaghetti, gari, and shito"],
      ["Extras", "Fried Fish", 10],
      ["Extras", "Boiled Egg", 4],
      ["Extras", "Wele (Cow Skin)", 6],
      ["Drinks", "Sobolo (500ml)", 8, "Chilled hibiscus drink"],
    ],
  },
  {
    name: "KNH Jollof Joint",
    cuisine: "Jollof & fried rice",
    description: "Party-style jollof every day. Order ahead for group orders.",
    phone: "020 000 0902",
    location: "Science Market, Stall 21",
    hours: "Daily: 11AM–10PM",
    delivers: true,
    isOpen: true,
    menu: [
      ["Mains", "Jollof with Chicken", 45, "Smoky jollof, grilled chicken, coleslaw"],
      ["Mains", "Fried Rice with Chicken", 45, "Vegetable fried rice, grilled chicken, shito"],
      ["Mains", "Assorted Jollof", 60, "Jollof with chicken, sausage, egg, and plantain"],
      ["Mains", "Jollof with Beef", 40, undefined, false],
      ["Sides", "Kelewele", 12, "Spicy fried plantain"],
      ["Drinks", "Bottled Water", 3],
      ["Drinks", "Soft Drink (Can)", 10],
    ],
  },
  {
    name: "Mama Kate's Kitchen",
    cuisine: "Banku, fufu & soups",
    description: "Traditional Ghanaian dishes, cooked fresh every afternoon.",
    phone: "020 000 0903",
    location: "Old Site Food Court",
    hours: "Mon–Fri: 12PM–8PM",
    delivers: false,
    isOpen: true,
    menu: [
      ["Mains", "Banku & Grilled Tilapia", 70, "Served with pepper and onions"],
      ["Mains", "Fufu & Light Soup (Goat)", 55],
      ["Mains", "Fufu & Groundnut Soup (Chicken)", 50],
      ["Mains", "Kenkey & Fried Fish", 30, "With pepper and shito"],
      ["Drinks", "Asaana (500ml)", 8, "Caramelised corn drink"],
    ],
  },
  {
    name: "Campus Grills",
    cuisine: "Kebabs & grills",
    description: "Evening khebab spot — perfect after lectures or late-night study.",
    phone: "020 000 0904",
    location: "Near KNH Main Gate",
    hours: "Daily: 5PM–11PM",
    delivers: false,
    isOpen: false,
    menu: [
      ["Grills", "Beef Khebab (3 sticks)", 20],
      ["Grills", "Chicken Khebab (3 sticks)", 25],
      ["Grills", "Gizzard Khebab (3 sticks)", 20],
      ["Grills", "Grilled Sausage", 10],
      ["Sides", "Yam Chips", 15, "With pepper sauce"],
    ],
  },
  {
    name: "Fresh Squeeze Juice Bar",
    cuisine: "Fresh juices & smoothies",
    description: "Freshly blended juices and smoothies, no added sugar.",
    phone: "020 000 0905",
    location: "Science Market, Stall 2",
    hours: "Mon–Sat: 8AM–7PM",
    delivers: true,
    isOpen: true,
    menu: [
      ["Juices", "Pineapple & Ginger", 18],
      ["Juices", "Watermelon", 15],
      ["Juices", "Orange (Freshly Squeezed)", 15],
      ["Smoothies", "Banana & Peanut Butter", 25],
      ["Smoothies", "Mixed Berry & Yoghurt", 30],
      ["Snacks", "Fruit Salad Bowl", 20],
    ],
  },
  {
    name: "Staff Common Room Café",
    cuisine: "Café & light meals",
    description: "Coffee, sandwiches, and light lunches — popular with staff between meetings.",
    phone: "020 000 0906",
    location: "Admin Block, Ground Floor",
    hours: "Mon–Fri: 7:30AM–4PM",
    delivers: true,
    isOpen: true,
    menu: [
      ["Hot Drinks", "Coffee (Americano)", 18],
      ["Hot Drinks", "Tea with Milk", 10],
      ["Light Meals", "Chicken Sandwich", 30],
      ["Light Meals", "Vegetable Wrap", 28],
      ["Light Meals", "Meat Pie", 12],
      ["Pastries", "Doughnut", 6],
    ],
  },
];

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");

  const connection = await mysql.createConnection({ uri });
  const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM food_vendors");
  if (Number(rows[0]?.count) > 0) {
    console.log("food_vendors already has rows — skipping seed.");
    await connection.end();
    return;
  }

  let items = 0;
  for (const [i, v] of VENDORS.entries()) {
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO food_vendors
         (name, cuisine, description, phone, location, opening_hours, delivers, is_open, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.name, v.cuisine, v.description, v.phone, v.location, v.hours, v.delivers ? 1 : 0, v.isOpen ? 1 : 0, i],
    );
    await connection.query(
      "INSERT INTO food_menu_items (vendor_id, section, name, price, description, is_available, sort_order) VALUES ?",
      [
        v.menu.map(([section, name, price, description, available = true], j) => [
          result.insertId,
          section,
          name,
          price,
          description ?? null,
          available ? 1 : 0,
          j,
        ]),
      ],
    );
    items += v.menu.length;
  }

  console.log(`Seeded ${VENDORS.length} food vendors with ${items} menu items.`);
  await connection.end();
}

main();
