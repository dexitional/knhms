import "dotenv/config";
import mysql from "mysql2/promise";

// Optional one-time seed of SAMPLE Alumni network content (projects, alumni
// executives, donations and donation channels) so the Alumni page has
// something to show. Everything here is placeholder — the donation channel
// numbers especially must be replaced from Admin → Alumni before going live.
// Skips seeding if any project, executive or channel already exists.

const PROJECTS = [
  {
    title: "KNH Library & Study Hub Renovation",
    summary: "New furniture, lighting, charging points and Wi-Fi for the hall's 24-hour study space.",
    category: "Infrastructure",
    status: "ongoing",
    goal: 150000,
    ledBy: "Class of 2010 Alumni",
    year: "2026",
  },
  {
    title: "Leadership by Example Scholarship",
    summary: "Full-year fee support for residents with outstanding leadership and financial need.",
    category: "Scholarship",
    status: "ongoing",
    goal: 80000,
    ledBy: "KNH Alumni Executive Council",
    year: "2025/26",
  },
  {
    title: "Solar Streetlights for the Hall Grounds",
    summary: "Safer evenings with 24 solar streetlights around the hall and its walkways.",
    category: "Safety",
    status: "completed",
    goal: 60000,
    ledBy: "Class of 2005 Alumni",
    year: "2025",
  },
  {
    title: "Career Mentorship Programme",
    summary: "Pairing final-year residents with alumni mentors across industries.",
    category: "Mentorship",
    status: "planned",
    goal: null,
    ledBy: "Alumni Careers Committee",
    year: "2027",
  },
] as const;

const EXECUTIVES = [
  ["Nana Kwame Asiedu", "President", "Class of 2004", "Chartered accountant and investor, championing a stronger alumni-student bond."],
  ["Adwoa Serwaa Frimpong", "Vice President", "Class of 2008", "Public health specialist leading the hall's wellness initiatives."],
  ["Kofi Annor-Mensah", "General Secretary", "Class of 2011", "Lawyer coordinating the association's governance and records."],
  ["Esi Quansah", "Treasurer", "Class of 2009", "Banker overseeing donations, reporting and project funding."],
  ["Yaw Ofori-Atta", "Projects Coordinator", "Class of 2013", "Civil engineer steering the hall's infrastructure projects."],
  ["Abena Owusu-Ansah", "Organising Secretary", "Class of 2016", "Events lead for reunions, homecomings and networking nights."],
] as const;

// [donor, amount, project index or null, method, message, anonymous, status, days ago]
const DONATIONS: Array<[string, number, number | null, string, string | null, boolean, string, number]> = [
  ["Nana Kwame Asiedu", 20000, 0, "bank", "For the next generation of KNH leaders.", false, "confirmed", 40],
  ["Class of 2005", 60000, 2, "bank", "Lighting the way home.", false, "confirmed", 120],
  ["Esi Quansah", 5000, 1, "momo", null, false, "confirmed", 30],
  ["Anonymous alumnus", 12000, 1, "bank", "Keep leading by example.", true, "confirmed", 25],
  ["Yaw Ofori-Atta", 7500, 0, "momo", "Proud to give back.", false, "confirmed", 12],
  ["Adwoa Serwaa Frimpong", 3000, 1, "momo", null, false, "confirmed", 8],
  ["Kwabena Boateng", 1500, null, "momo", "Once KNH, always KNH!", false, "confirmed", 4],
  ["Akua Mensah", 2500, 0, "card", null, false, "confirmed", 2],
  ["Kojo Appiah", 1000, 1, "momo", "Pledging for the scholarship fund.", false, "pledged", 1],
  ["Efua Nyarko", 500, 0, "momo", null, false, "pledged", 0],
];

const CHANNELS = [
  {
    type: "momo",
    label: "MTN Mobile Money (sample)",
    accountName: "KNH Alumni Association",
    accountNumber: "024 000 0000",
    provider: "MTN",
    instructions: "Use your name and class year as the reference, e.g. 'Ama Owusu 2015'.",
  },
  {
    type: "momo",
    label: "Telecel Cash (sample)",
    accountName: "KNH Alumni Association",
    accountNumber: "020 000 0000",
    provider: "Telecel",
    instructions: "Send, then fill in the pledge form so we can confirm your gift.",
  },
  {
    type: "bank",
    label: "Bank transfer (sample)",
    accountName: "KNH Alumni Association Fund",
    accountNumber: "0000000000000",
    provider: "GCB Bank",
    branch: "University of Cape Coast",
    instructions: "Include 'KNH' and your name in the transfer narration.",
  },
] as const;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");
  const c = await mysql.createConnection({ uri });
  const [rows] = await c.query<mysql.RowDataPacket[]>(
    `SELECT (SELECT COUNT(*) FROM alumni_projects) + (SELECT COUNT(*) FROM alumni_executives)
            + (SELECT COUNT(*) FROM alumni_donation_channels) AS n`,
  );
  if (Number(rows[0]?.n) > 0) {
    console.log("Alumni content already exists — skipping seed.");
    await c.end();
    return;
  }

  await c.beginTransaction();
  try {
    const projectIds: number[] = [];
    for (const [i, p] of PROJECTS.entries()) {
      const [r] = await c.execute<mysql.ResultSetHeader>(
        `INSERT INTO alumni_projects (title, summary, category, status, goal_amount, led_by, year_label, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.title, p.summary, p.category, p.status, p.goal, p.ledBy, p.year, i],
      );
      projectIds.push(r.insertId);
    }
    for (const [i, [name, position, classYear, bio]] of EXECUTIVES.entries()) {
      await c.execute(
        "INSERT INTO alumni_executives (name, position, class_year, bio, sort_order) VALUES (?, ?, ?, ?, ?)",
        [name, position, classYear, bio, i],
      );
    }
    for (const [donor, amount, project, method, message, anonymous, status, ago] of DONATIONS) {
      await c.execute(
        `INSERT INTO alumni_donations (donor_name, amount, project_id, method, message, is_anonymous, status, donated_on, phone, confirmed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        [
          donor,
          amount,
          project === null ? null : projectIds[project],
          method,
          message,
          anonymous ? 1 : 0,
          status,
          daysAgo(ago),
          status === "confirmed" ? `${daysAgo(ago)} 12:00:00` : null,
        ],
      );
    }
    for (const [i, ch] of CHANNELS.entries()) {
      await c.execute(
        `INSERT INTO alumni_donation_channels (type, label, account_name, account_number, provider, branch, instructions, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ch.type, ch.label, ch.accountName, ch.accountNumber, ch.provider, "branch" in ch ? ch.branch : null, ch.instructions, i],
      );
    }
    await c.commit();
  } catch (err) {
    await c.rollback();
    throw err;
  }
  console.log(
    `Seeded ${PROJECTS.length} projects, ${EXECUTIVES.length} executives, ${DONATIONS.length} donations and ${CHANNELS.length} sample donation channels.`,
  );
  await c.end();
}

main();
