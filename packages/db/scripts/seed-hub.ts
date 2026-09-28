import "dotenv/config";
import mysql from "mysql2/promise";

// Optional one-time seed of the KNH Hub page content (the spotlight slides,
// announcements, news, and events that used to be hardcoded in the page).
// Apart from the three UCC spotlight stories and the streetlights donation,
// it's placeholder content — edit or delete it from Admin → KNH Hub. Skips
// seeding if any hub post already exists, so re-running never duplicates.

interface Seed {
  type: "spotlight" | "announcement" | "news" | "event";
  title: string;
  excerpt?: string;
  body?: string;
  category?: string;
  category_url?: string;
  link_url?: string;
  published_on: string;
  event_start?: string;
  event_end?: string;
  event_time?: string;
  location?: string;
  is_featured?: boolean;
}

const POSTS: Seed[] = [
  // Spotlight (hero carousel) — as published on news.ucc.edu.gh.
  {
    type: "spotlight",
    title: "Kwesi Pratt Calls for Greater Economic Independence and Industrialisation in Africa",
    excerpt:
      "Veteran journalist and Pan-Africanist, Kwesi Pratt Jnr., has called on Ghana and other African countries to p",
    link_url:
      "https://news.ucc.edu.gh/kwesi-pratt-calls-for-greater-economic-independence-and-industrialisation-in-africa-00JR",
    category: "General",
    category_url: "https://news.ucc.edu.gh/c/general-0001",
    published_on: "2026-09-18",
  },
  {
    type: "spotlight",
    title: "Constitutional Review Alone Will Not Solve Ghana’s Problems -Kwesi Pratt",
    excerpt:
      "Veteran journalist and Managing Editor of the Insight newspaper, Kwesi Pratt Jnr.,  has argued that Ghana's persistent constitutional challenges cannot be resolved solely through amendments to the 1992 Constit",
    link_url: "https://news.ucc.edu.gh/constitutional-review-alone-will-not-solve-ghanas-problems-kwesi-pratt-00JP",
    category: "General",
    category_url: "https://news.ucc.edu.gh/c/general-0001",
    published_on: "2026-09-17",
  },
  {
    type: "spotlight",
    title: "UCC Secures US$500m PPP Deal for 28,000-Bed Student Housing Project",
    excerpt:
      "The University of Cape Coast (UCC) has signed a Memorandum of Understanding (MoU) with GSC Property Investment Limited for the development of a 28,000-bed student accommodation facility estimated at US$500 million",
    link_url: "https://news.ucc.edu.gh/ucc-secures-us500m-ppp-deal-for-28000-bed-student-housing-project-00JO",
    category: "Student in Focus",
    category_url: "https://news.ucc.edu.gh/c/student-in-focus-0008",
    published_on: "2026-09-17",
  },

  // Announcements
  {
    type: "announcement",
    title: "Hall Registration Closes Friday, 3rd October",
    excerpt:
      "All continuing and fresh residents must complete hall registration and upload their payment receipts before the deadline.",
    body: "All continuing and fresh residents must complete hall registration on the KNH portal and upload their payment receipts by Friday, 3rd October 2026. Residents who have not registered by the deadline risk losing their room allocation. Visit the Porters' Lodge if you have any difficulty registering.",
    category: "Important",
    published_on: "2026-09-26",
  },
  {
    type: "announcement",
    title: "Scheduled Water Supply Interruption — Main Block",
    excerpt: "Water supply to the Main Block will be interrupted on Sunday, 5th October from 6AM to 2PM for tank cleaning.",
    body: "Water supply to the Main Block will be interrupted on Sunday, 5th October 2026 from 6AM to 2PM while the overhead tanks are cleaned. Residents are advised to store enough water ahead of time. Annex residents are not affected. We apologise for the inconvenience.",
    category: "Important",
    published_on: "2026-09-24",
  },
  {
    type: "announcement",
    title: "JCR General Meeting for All Residents",
    excerpt:
      "The Junior Common Room invites all residents to the first general meeting of the semester at the Hall Auditorium.",
    body: "The Junior Common Room (JCR) invites all residents to the first general meeting of the semester on Wednesday, 8th October 2026 at 7PM in the Hall Auditorium. The agenda includes the semester's activity calendar, hall dues, and elections for vacant committee positions. Attendance is expected of all residents.",
    category: "General",
    published_on: "2026-09-22",
  },
  {
    type: "announcement",
    title: "Repair Requests Now Tracked Online",
    excerpt:
      "Report room maintenance issues — faulty sockets, leaking taps, broken locks — through the student portal and follow their progress.",
    body: "Residents can now report room maintenance issues — faulty sockets, leaking taps, broken locks, and more — through the Repair Requests section of the student portal. You'll be able to follow each request from submission to completion, and the hall office will be notified immediately. Paper repair books at the Porters' Lodge will be phased out.",
    category: "General",
    published_on: "2026-09-18",
  },
  {
    type: "announcement",
    title: "Room Inspection Exercise Begins Next Week",
    excerpt:
      "The Hall Tutors will conduct routine room inspections from Monday, 29th September. Residents should keep rooms tidy and accessible.",
    body: "The Hall Tutors will conduct routine room inspections from Monday, 29th September to Friday, 3rd October 2026. Residents should keep their rooms tidy and accessible, and remove any prohibited items (hot plates, immersion heaters, and unauthorised extensions). Rooms found in breach of hall rules will be reported to the Hall Master.",
    category: "Important",
    published_on: "2026-09-16",
  },
  {
    type: "announcement",
    title: "Sell on the New KNH E-Market",
    excerpt:
      "Students, staff, and local businesses can now register as sellers and list products or food menus on the KNH E-Market.",
    body: 'Students, staff, and local businesses can now register as sellers on the KNH E-Market and list products or food menus for the hall community. Applications are reviewed by the hall office. Visit the E-Market page and click "Sell on the E-Market" to get started.',
    category: "General",
    published_on: "2026-09-12",
  },

  // News
  {
    type: "news",
    title: "Cape Coast North MP Donates Streetlights to Kwame Nkrumah Hall",
    excerpt:
      "Hon. Dr. Kwamina Mintah-Nyarku has donated 10 boxes of streetlights to Kwame Nkrumah Hall to improve visibility and enhance the safety and security of students and other residents of the Hall.",
    body: "Hon. Dr. Kwamina Mintah-Nyarku, Member of Parliament for Cape Coast North, has donated 10 boxes of streetlights to Kwame Nkrumah Hall to improve visibility and enhance the safety and security of students and other residents of the Hall.",
    category: "Hall Life",
    published_on: "2026-09-27",
  },
  {
    type: "news",
    title: "KNH Launches Digital Hall Services Portal",
    excerpt:
      "Residents can now register, request repairs, place hall service orders, and send suggestions to management from their phones.",
    body: "Kwame Nkrumah Hall has launched a digital services portal for residents. Students can now complete hall registration, report room repairs, place hall service orders, and send suggestions to hall management — anonymously if they prefer — from their phones. The hall office says the portal will cut waiting times at the Porters' Lodge and make it easier to track requests.",
    category: "General",
    published_on: "2026-09-24",
  },
  {
    type: "news",
    title: "Nkrumah Hall Retains Inter-Hall Football Trophy",
    excerpt:
      "The hall football team defended its inter-hall title with a 2–1 win in a keenly contested final at the university stadium.",
    body: "The Kwame Nkrumah Hall football team has retained the inter-hall trophy after a 2–1 victory in a keenly contested final at the university stadium. The hall's supporters turned out in large numbers in orange, and the team dedicated the win to the residents who cheered them on throughout the tournament.",
    category: "Sports",
    published_on: "2026-09-20",
  },
  {
    type: "news",
    title: "Freshers Welcomed at Hall Orientation",
    excerpt:
      "The Hall Master and JCR executives welcomed new residents and introduced them to hall traditions, rules, and support services.",
    body: "New residents of Kwame Nkrumah Hall were formally welcomed at the hall orientation, where the Hall Master and JCR executives introduced them to the hall's history, traditions, rules, and support services. Freshers were encouraged to take part in hall activities and to reach out to hall tutors whenever they need help.",
    category: "Student in Focus",
    published_on: "2026-09-15",
  },
  {
    type: "news",
    title: "Hall Library Extends Opening Hours for Exams",
    excerpt:
      "The hall reading room will stay open until 2AM on weekdays during the examination period, with extra study desks added.",
    body: "To support residents during the examination period, the hall reading room will stay open until 2AM on weekdays. Additional study desks and charging points have been added, and residents are reminded to keep the room quiet for others.",
    category: "Academics",
    published_on: "2026-09-10",
  },
  {
    type: "news",
    title: "JCR Organises Clean-Up Day Around the Hall",
    excerpt:
      "Residents joined the JCR to clean the hall surroundings, clear drains, and plant trees as part of the hall's green campaign.",
    body: "Residents joined the Junior Common Room for a clean-up exercise around the hall, clearing drains, collecting litter, and planting trees as part of the hall's green campaign. The JCR thanked everyone who took part and announced that clean-up days will be held every month.",
    category: "Hall Life",
    published_on: "2026-09-06",
  },

  // Events
  {
    type: "event",
    title: "Freshmen Orientation Week",
    event_start: "2026-10-01",
    event_end: "2026-10-07",
    event_time: "9:00 AM - 5:00 PM",
    location: "Main Campus Quad",
    published_on: "2026-09-20",
  },
  {
    type: "event",
    title: "Career Fair 2026",
    event_start: "2026-10-15",
    event_time: "10:00 AM - 4:00 PM",
    location: "Student Union Building",
    published_on: "2026-09-20",
  },
  {
    type: "event",
    title: "Cultural Festival",
    event_start: "2026-10-28",
    event_end: "2026-10-29",
    event_time: "12:00 PM - 8:00 PM",
    location: "Amphitheater",
    published_on: "2026-09-20",
  },
  {
    type: "event",
    title: "KNH Annual Gala",
    excerpt: "Don't miss the KNH Annual Gala.",
    event_start: "2026-11-15",
    published_on: "2026-09-20",
    is_featured: true,
  },
];

const COLUMNS = [
  "type",
  "title",
  "excerpt",
  "body",
  "category",
  "category_url",
  "link_url",
  "published_on",
  "event_start",
  "event_end",
  "event_time",
  "location",
  "is_featured",
  "sort_order",
] as const;

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");

  const connection = await mysql.createConnection({ uri });
  const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM hub_posts");
  if (Number(rows[0]?.count) > 0) {
    console.log("hub_posts already has rows — skipping seed.");
    await connection.end();
    return;
  }

  const values = POSTS.map((p, i) => [
    p.type,
    p.title,
    p.excerpt ?? null,
    p.body ?? null,
    p.category ?? null,
    p.category_url ?? null,
    p.link_url ?? null,
    p.published_on,
    p.event_start ?? null,
    p.event_end ?? null,
    p.event_time ?? null,
    p.location ?? null,
    p.is_featured ? 1 : 0,
    i,
  ]);
  await connection.query(`INSERT INTO hub_posts (${COLUMNS.join(", ")}) VALUES ?`, [values]);

  console.log(`Seeded ${POSTS.length} KNH Hub posts.`);
  await connection.end();
}

main();
