import "dotenv/config";
import mysql from "mysql2/promise";

// Optional one-time seed of the Freshmen guide (the content that used to be
// hardcoded in the page). It's general starter content — review and edit it
// from Admin → Freshmen Guide before relying on it. Skips seeding if any
// guide or FAQ already exists, so re-running never duplicates.

interface Item {
  title: string;
  note?: string;
  icon?: string;
}
interface Topic {
  title: string;
  body?: string;
  layout?: "text" | "steps" | "cards";
  items?: Item[];
}
interface Section {
  title: string;
  mandatory?: boolean;
  intro?: string;
  topics: Topic[];
}
interface Guide {
  title: string;
  summary: string;
  icon: string;
  sections: Section[];
}

const a = (href: string, text: string) => `<a href="${href}">${text}</a>`;

const GUIDES: Guide[] = [
  {
    title: "Before you arrive",
    summary: "Confirm your place in the hall and get your documents and luggage ready.",
    icon: "backpack",
    sections: [
      {
        title: "Confirm your admission and hall allocation",
        intro:
          "<p>Congratulations on your admission to the University of Cape Coast, and welcome to Kwame Nkrumah Hall. Before you travel, make sure your place in the hall is confirmed and your paperwork is in order.</p>",
        topics: [
          {
            title: "Check your hall allocation",
            body: "<p>Your admission letter and the University student portal show the hall you've been allocated to. Note your room number if it has been assigned. You'll need it to register on the KNH portal.</p>",
          },
          {
            title: "Documents to have ready",
            body: "<p>Keep these together (printed and on your phone):</p>",
            layout: "cards",
            items: [
              { title: "Admission letter", icon: "file-text" },
              { title: "Registration number", note: "Your student number", icon: "graduation-cap" },
              { title: "Ghana Card or passport", note: "For identification", icon: "id-card" },
              { title: "Passport photo", note: "A clear digital copy for online registration", icon: "users" },
              { title: "Fee receipt", note: "Proof of hall fee payment", icon: "wallet" },
              { title: "Emergency contact", note: "A parent or guardian's details", icon: "phone" },
            ],
          },
        ],
      },
      {
        title: "What to pack",
        topics: [
          {
            title: "Essentials",
            layout: "cards",
            items: [
              { title: "Bedding", note: "Sheets, pillow & light blanket", icon: "bed-double" },
              { title: "Padlock", note: "For your wardrobe or locker", icon: "lock" },
              { title: "Toiletries", note: "Bucket, towels & essentials", icon: "bath" },
              { title: "Mosquito net", note: "Sleep protected", icon: "shield-check" },
              { title: "Lamp or torch", note: "Rechargeable is best", icon: "flashlight" },
              { title: "Cutlery & flask", note: "Cup, plate and food flask", icon: "utensils" },
              { title: "Extension board", note: "Surge-protected", icon: "plug-zap" },
            ],
          },
          {
            title: "Items not allowed in rooms",
            body:
              "<p>For everyone's safety, don't bring:</p><ul><li>Cooking appliances such as hot plates, gas cylinders and electric stoves</li><li>Heaters, electric kettles and other high-wattage appliances unless the hall permits them</li><li>Weapons, drugs or anything prohibited by University regulations</li></ul><blockquote><p><strong>Not sure?</strong> Ask the hall office before bringing an appliance. Prohibited items can be confiscated.</p></blockquote>",
          },
        ],
      },
    ],
  },
  {
    title: "Registration and check-in",
    summary: "Pay your hall fees, register on the KNH portal and move into your room.",
    icon: "clipboard-check",
    sections: [
      {
        title: "Pay your hall fees",
        mandatory: true,
        topics: [
          {
            title: "Where to pay",
            body: "<p>Pay your hall fees through the channels announced by the University and the hall office. Only pay into official accounts. Hall executives will never ask you to send fees to a personal number.</p>",
          },
          {
            title: "Keep your receipt",
            body: "<p>You'll upload a photo or PDF of your payment receipt during online registration, so keep it safe. Hold on to the original as well; the hall office may ask to see it at check-in.</p>",
          },
        ],
      },
      {
        title: "Register on the KNH portal",
        mandatory: true,
        intro:
          "<p>Every resident must complete hall registration online. It records your room, contact details and emergency contact, and it creates your student dashboard.</p>",
        topics: [
          {
            title: "Before you start",
            body: "<p>Have your room number, registration number, programme, ID number, a passport photo and your fee receipt ready. Photos and receipts can be JPEG, PNG, WebP or PDF, up to 8MB each.</p>",
          },
          {
            title: "Step by step",
            body: `<p>Open the ${a("/register", "Hall Registration")} form and follow these steps.</p>`,
            layout: "steps",
            items: [
              { title: "Enter your room number, personal details, programme and level." },
              { title: "Add your emergency contact." },
              { title: "Choose your ID type (Ghana Card or passport), then upload your passport photo and payment receipt." },
              { title: "Set a 4-digit PIN and submit.", note: "You'll go straight to your student dashboard." },
            ],
          },
          {
            title: "Your dashboard PIN",
            body: `<p>Your PIN signs you in to the ${a("/student/login", "student dashboard")}. Don't share it. If you forget it, ${a("/student/forgot-pin", "reset your PIN")}.</p>`,
          },
        ],
      },
      {
        title: "Check in to your room",
        topics: [
          {
            title: "Collecting your keys",
            body: "<p>Report to the hall office or porters' lodge with your ID and receipt to collect your room key. Sign the key register, and never lend your key to anyone.</p>",
          },
          {
            title: "Room inspection",
            body: "<p>Check your bed, mattress, wardrobe, lights, sockets and windows on the first day. Report anything broken straight away through a repair request on your dashboard, so it isn't charged to you later.</p>",
          },
        ],
      },
    ],
  },
  {
    title: "Mandatory activities",
    summary: "The activities every freshman must take part in during their first weeks.",
    icon: "users",
    sections: [
      {
        title: "Hall orientation",
        mandatory: true,
        topics: [
          {
            title: "What happens",
            body: `<p>Meet the hall master, tutors, hall executives and porters. You'll hear about hall rules, traditions, facilities, security and how to get help. Dates and venues are announced on the ${a("/knh-hub", "KNH Hub")}.</p>`,
          },
          {
            title: "Attendance",
            body: "<p>Attendance is compulsory for all freshmen. If you can't attend for a genuine reason, inform the hall office beforehand.</p>",
          },
        ],
      },
      {
        title: "University orientation and matriculation",
        mandatory: true,
        topics: [
          {
            title: "Orientation week",
            body: "<p>The University runs an orientation programme for new students covering academic regulations, course registration, the library, health services and student support. Follow the official University schedule.</p>",
          },
          {
            title: "Matriculation",
            body: "<p>Matriculation formally admits you as a student of the University. Attend in the required dress code, and check University announcements for the date and venue.</p>",
          },
        ],
      },
      {
        title: "Medical examination",
        mandatory: true,
        topics: [
          {
            title: "Book and attend your examination",
            body: "<p>New students must complete a medical examination at the University hospital. Book early; slots fill up in the first weeks.</p>",
          },
        ],
      },
      {
        title: "Freshers' general meeting",
        mandatory: true,
        topics: [
          {
            title: "Meet the hall community",
            body: "<p>The hall executives hold a general meeting for freshers to introduce hall life, clubs, sports and the hall's traditions. It's also where you'll learn how to get involved in hall leadership.</p>",
          },
        ],
      },
    ],
  },
  {
    title: "Living in KNH",
    summary: "Hall rules, the services on your dashboard, and what to do in an emergency.",
    icon: "house",
    sections: [
      {
        title: "Hall rules and conduct",
        topics: [
          {
            title: "Quiet hours and respect",
            body: "<p>Keep noise down, especially at night and during exams. Respect your roommates, porters and cleaners. The hall motto is <em>Leadership by Example</em>.</p>",
          },
          {
            title: "Visitors",
            body: "<p>Visitors must follow the hall's visiting hours and sign in where required. You're responsible for your guests' conduct while they're in the hall.</p>",
          },
        ],
      },
      {
        title: "Services on your dashboard",
        topics: [
          {
            title: "Repair requests",
            body: `<p>Report faults in your room (lights, sockets, plumbing, furniture) from ${a("/student/repairs/new", "New Repair Request")} and track them on your dashboard.</p>`,
          },
          {
            title: "Suggestions",
            body: `<p>Share ideas and concerns with hall management through ${a("/student/suggestions", "Suggestions")}.</p>`,
          },
          {
            title: "E-Market and Yellow Pages",
            body: `<p>Find food vendors and student businesses on the ${a("/e-market", "E-Market")}, and hall offices, executives and campus services in the ${a("/yellow-pages", "Yellow Pages")}.</p>`,
          },
        ],
      },
      {
        title: "Safety and emergencies",
        topics: [
          {
            title: "Stay safe",
            body: "<ul><li>Lock your room whenever you leave, even briefly.</li><li>Don't overload sockets or leave appliances running unattended.</li><li>Learn where the fire exits and extinguishers are on your floor.</li></ul>",
          },
          {
            title: "In an emergency",
            body: `<p>Go to the porters' lodge or contact a hall tutor straight away. Key contacts are listed in the ${a("/yellow-pages", "Yellow Pages")}.</p>`,
          },
        ],
      },
    ],
  },
];

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "I don't know my room number yet. Can I still register?",
    answer: "<p>No. The registration form needs your room number. Contact the hall office to confirm your allocation, then register.</p>",
  },
  {
    question: "I entered the wrong details during registration. What do I do?",
    answer: `<p>Update what you can from your ${a("/student/profile", "profile")}. For anything you can't change yourself, such as your room, contact the hall office.</p>`,
  },
  {
    question: "I forgot my dashboard PIN.",
    answer: `<p>Use ${a("/student/forgot-pin", "Forgot your PIN?")} on the login page to reset it.</p>`,
  },
  {
    question: "Are the mandatory activities really compulsory?",
    answer:
      "<p>Yes. Hall orientation, University orientation and matriculation, the medical examination and the freshers' general meeting are required for every new student. Tell the hall office in advance if you have a genuine reason to miss one.</p>",
  },
  {
    question: "Something in my room is broken. Who fixes it?",
    answer:
      "<p>Submit a repair request from your dashboard. Report faults you find on arrival straight away so you aren't held responsible for them.</p>",
  },
  {
    question: "Can I change rooms?",
    answer:
      "<p>Room changes are handled by the hall office and depend on availability. Speak to them rather than swapping informally.</p>",
  },
  {
    question: "Where do I find hall news and event dates?",
    answer: `<p>On the ${a("/knh-hub", "KNH Hub")}, which carries announcements, news and upcoming events.</p>`,
  },
];

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");

  const connection = await mysql.createConnection({ uri });
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    "SELECT (SELECT COUNT(*) FROM freshmen_guides) + (SELECT COUNT(*) FROM freshmen_faqs) AS count",
  );
  if (Number(rows[0]?.count) > 0) {
    console.log("The Freshmen guide already has content — skipping seed.");
    await connection.end();
    return;
  }

  await connection.beginTransaction();
  try {
    for (const [gi, guide] of GUIDES.entries()) {
      const [g] = await connection.execute<mysql.ResultSetHeader>(
        "INSERT INTO freshmen_guides (title, summary, icon, sort_order) VALUES (?, ?, ?, ?)",
        [guide.title, guide.summary, guide.icon, gi],
      );
      for (const [si, section] of guide.sections.entries()) {
        const [s] = await connection.execute<mysql.ResultSetHeader>(
          "INSERT INTO freshmen_sections (guide_id, title, intro, is_mandatory, sort_order) VALUES (?, ?, ?, ?, ?)",
          [g.insertId, section.title, section.intro ?? null, section.mandatory ? 1 : 0, si],
        );
        for (const [ti, topic] of section.topics.entries()) {
          await connection.execute(
            "INSERT INTO freshmen_topics (section_id, title, body, layout, items, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
            [
              s.insertId,
              topic.title,
              topic.body ?? null,
              topic.layout ?? "text",
              topic.items ? JSON.stringify(topic.items) : null,
              ti,
            ],
          );
        }
      }
    }
    for (const [fi, faq] of FAQS.entries()) {
      await connection.execute("INSERT INTO freshmen_faqs (question, answer, sort_order) VALUES (?, ?, ?)", [
        faq.question,
        faq.answer,
        fi,
      ]);
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  }

  console.log(`Seeded ${GUIDES.length} Freshmen guides and ${FAQS.length} FAQs.`);
  await connection.end();
}

main();
