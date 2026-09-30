import { getPool } from "@knh/db"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import type { z } from "zod"
import type {
  AlumniDonation,
  AlumniExecutive,
  AlumniProject,
  AlumniPublicContent,
  DonationChannel,
  GalleryImage,
  MembershipApplication,
} from "#/lib/alumni"
import { insertSql, toColumns, updateSql } from "../../lib/columns.js"
import { ghanaPhoneToE164, sendSms } from "../../lib/sms.js"
import { AppError } from "../../middleware/error-handler.js"
import type {
  createDonationSchema,
  membershipSchema,
  pledgeSchema,
  updateDonationSchema,
  updateMembershipSchema,
} from "./schema.js"

// The Alumni network: projects, alumni executives, donations (pledged from
// the public page, confirmed by admins), gallery, donation channels, and
// membership applications from the sign-up wizard.

// ---- Simple admin-managed collections ------------------------------------------------

interface Collection {
  table: string
  label: string
  fields: Record<string, string>
  order: string
}

export const COLLECTIONS = {
  projects: {
    table: "alumni_projects",
    label: "Project",
    order: "sort_order, id DESC",
    fields: {
      title: "title",
      summary: "summary",
      category: "category",
      status: "status",
      goalAmount: "goal_amount",
      imageUrl: "image_url",
      ledBy: "led_by",
      yearLabel: "year_label",
      sortOrder: "sort_order",
      isPublished: "is_published",
    },
  },
  executives: {
    table: "alumni_executives",
    label: "Executive",
    order: "sort_order, name",
    fields: {
      name: "name",
      position: "position",
      classYear: "class_year",
      bio: "bio",
      photoUrl: "photo_url",
      email: "email",
      phone: "phone",
      linkedinUrl: "linkedin_url",
      sortOrder: "sort_order",
      isActive: "is_active",
    },
  },
  gallery: {
    table: "alumni_gallery",
    label: "Photo",
    order: "sort_order, taken_on DESC, id DESC",
    fields: {
      imageUrl: "image_url",
      caption: "caption",
      album: "album",
      takenOn: "taken_on",
      sortOrder: "sort_order",
      isPublished: "is_published",
    },
  },
  channels: {
    table: "alumni_donation_channels",
    label: "Donation channel",
    order: "sort_order, id",
    fields: {
      type: "type",
      label: "label",
      accountName: "account_name",
      accountNumber: "account_number",
      provider: "provider",
      branch: "branch",
      linkUrl: "link_url",
      instructions: "instructions",
      sortOrder: "sort_order",
      isActive: "is_active",
    },
  },
} satisfies Record<string, Collection>

export type CollectionName = keyof typeof COLLECTIONS

// Projects also carry what they've raised from confirmed donations.
const PROJECT_SELECT = `
  SELECT p.*, COALESCE(SUM(d.amount), 0) AS raised_amount, COUNT(d.id) AS donor_count
  FROM alumni_projects p
  LEFT JOIN alumni_donations d ON d.project_id = p.id AND d.status = 'confirmed'`

function toProject(r: RowDataPacket): AlumniProject {
  return {
    ...(r as AlumniProject),
    goal_amount: r.goal_amount == null ? null : Number(r.goal_amount),
    raised_amount: Number(r.raised_amount ?? 0),
    donor_count: Number(r.donor_count ?? 0),
  }
}

export async function listCollection(name: CollectionName) {
  const c: Collection = COLLECTIONS[name]
  if (name === "projects") {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `${PROJECT_SELECT} GROUP BY p.id ORDER BY p.sort_order, p.id DESC`,
    )
    return rows.map(toProject)
  }
  const [rows] = await getPool().query<RowDataPacket[]>(`SELECT * FROM ${c.table} ORDER BY ${c.order}`)
  return rows.map((r) => ({ ...r }))
}

export async function createInCollection(name: CollectionName, input: object) {
  const c: Collection = COLLECTIONS[name]
  const { columns, params } = toColumns(input, c.fields)
  const [result] = await getPool().execute<ResultSetHeader>(insertSql(c.table, columns), params)
  return { id: result.insertId }
}

export async function updateInCollection(name: CollectionName, id: number, input: object) {
  const c: Collection = COLLECTIONS[name]
  const { columns, params } = toColumns(input, c.fields)
  if (columns.length === 0) return
  const [result] = await getPool().execute<ResultSetHeader>(updateSql(c.table, columns), [...params, id])
  if (result.affectedRows === 0) throw new AppError(`${c.label} not found.`, 404)
}

export async function deleteFromCollection(name: CollectionName, id: number) {
  const c: Collection = COLLECTIONS[name]
  const [result] = await getPool().execute<ResultSetHeader>(`DELETE FROM ${c.table} WHERE id = ?`, [id])
  if (result.affectedRows === 0) throw new AppError(`${c.label} not found.`, 404)
}

// ---- SMS --------------------------------------------------------------------------------

// Confirmation texts are a courtesy: failures are logged, never surfaced.
function notify(phone: string | null | undefined, message: string) {
  if (!phone) return
  void sendSms(ghanaPhoneToE164(phone), message).catch((err: unknown) =>
    console.error("Failed to send alumni SMS:", err),
  )
}

const today = () => new Date().toISOString().slice(0, 10)

// ---- Donations ----------------------------------------------------------------------------

type PledgeInput = z.infer<typeof pledgeSchema>
type CreateDonationInput = z.infer<typeof createDonationSchema>
type UpdateDonationInput = z.infer<typeof updateDonationSchema>

const DONATION_FIELDS: Record<string, string> = {
  donorName: "donor_name",
  email: "email",
  phone: "phone",
  amount: "amount",
  projectId: "project_id",
  method: "method",
  reference: "reference",
  message: "message",
  isAnonymous: "is_anonymous",
  donatedOn: "donated_on",
  status: "status",
}

const DONATION_SELECT = `
  SELECT d.*, p.title AS project_title, a.full_name AS confirmed_by_name
  FROM alumni_donations d
  LEFT JOIN alumni_projects p ON p.id = d.project_id
  LEFT JOIN admins a ON a.id = d.confirmed_by`

function toDonation(r: RowDataPacket): AlumniDonation {
  return { ...(r as AlumniDonation), amount: Number(r.amount) }
}

async function assertProject(projectId: number | null | undefined) {
  if (projectId == null) return
  const [rows] = await getPool().execute<RowDataPacket[]>("SELECT id FROM alumni_projects WHERE id = ?", [projectId])
  if (!rows[0]) throw new AppError("That project no longer exists.", 422)
}

export async function listDonations() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `${DONATION_SELECT} ORDER BY FIELD(d.status, 'pledged', 'confirmed', 'declined'), d.donated_on DESC, d.id DESC`,
  )
  return rows.map(toDonation)
}

// Public pledges. A light guard stops the same contact flooding the list.
export async function createPledge(input: PledgeInput) {
  await assertProject(input.projectId)
  const [recent] = await getPool().execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM alumni_donations
     WHERE status = 'pledged' AND created_at > NOW() - INTERVAL 1 DAY AND ((? IS NOT NULL AND phone = ?) OR (? IS NOT NULL AND email = ?))`,
    [input.phone ?? null, input.phone ?? null, input.email ?? null, input.email ?? null],
  )
  if (Number(recent[0]?.n ?? 0) >= 3) {
    throw new AppError("We've received several pledges from you today. The hall office will be in touch.", 429)
  }
  const { columns, params } = toColumns(
    { ...input, donatedOn: input.donatedOn ?? today(), status: "pledged" },
    DONATION_FIELDS,
  )
  const [result] = await getPool().execute<ResultSetHeader>(insertSql("alumni_donations", columns), params)
  notify(
    input.phone,
    `Thank you, ${input.donorName.split(" ")[0]}! Your gift of GHS ${input.amount} to Kwame Nkrumah Hall has been received. The hall office will confirm it shortly. Leadership by Example.`,
  )
  return { id: result.insertId }
}

// Confirming records who confirmed and when; the donation then counts
// toward totals and appears on the public page.
function statusColumns(status: string | undefined, adminId: number) {
  if (status === "confirmed")
    return {
      columns: ["confirmed_by", "confirmed_at"],
      sql: "confirmed_by = ?, confirmed_at = NOW()",
      params: [adminId],
    }
  if (status) return { columns: [], sql: "confirmed_by = NULL, confirmed_at = NULL", params: [] }
  return null
}

export async function createDonation(adminId: number, input: CreateDonationInput) {
  await assertProject(input.projectId)
  const { columns, params } = toColumns({ ...input, donatedOn: input.donatedOn ?? today() }, DONATION_FIELDS)
  const [result] = await getPool().execute<ResultSetHeader>(insertSql("alumni_donations", columns), params)
  const extra = statusColumns(input.status, adminId)
  if (extra)
    await getPool().execute(`UPDATE alumni_donations SET ${extra.sql} WHERE id = ?`, [...extra.params, result.insertId])
  return { id: result.insertId }
}

export async function updateDonation(adminId: number, id: number, input: UpdateDonationInput) {
  await assertProject(input.projectId)
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT status, phone, donor_name, amount FROM alumni_donations WHERE id = ?",
    [id],
  )
  const before = rows[0]
  if (!before) throw new AppError("Donation not found.", 404)
  const { columns, params } = toColumns(input, DONATION_FIELDS)
  if (columns.length > 0) await getPool().execute(updateSql("alumni_donations", columns), [...params, id])
  if (input.status && input.status !== before.status) {
    const extra = statusColumns(input.status, adminId)!
    await getPool().execute(`UPDATE alumni_donations SET ${extra.sql} WHERE id = ?`, [...extra.params, id])
    if (input.status === "confirmed") {
      notify(
        before.phone as string | null,
        `Kwame Nkrumah Hall has confirmed your gift of GHS ${Number(before.amount)}. Thank you for giving back, ${String(before.donor_name).split(" ")[0]}!`,
      )
    }
  }
}

export async function deleteDonation(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>("DELETE FROM alumni_donations WHERE id = ?", [id])
  if (result.affectedRows === 0) throw new AppError("Donation not found.", 404)
}

// ---- Memberships ---------------------------------------------------------------------------

type MembershipInput = z.infer<typeof membershipSchema>
type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>

function toMembership(r: RowDataPacket): MembershipApplication {
  const interests: unknown = typeof r.interests === "string" ? JSON.parse(r.interests) : r.interests
  return {
    ...(r as MembershipApplication),
    interests: Array.isArray(interests) ? (interests as Array<string>) : [],
    directory_entry_id: (r.entry_id as number | null) ?? null,
    show_phone: (r.show_phone as 0 | 1 | null) ?? null,
    listed: (r.entry_active as 0 | 1 | null) ?? null,
  }
}

// ---- Automatic Alumni directory profile ------------------------------------------------------

// Tags are the member's city and occupation, trimmed to the directory's
// 30-character tag limit and de-duplicated.
function profileTags(input: MembershipInput) {
  const city = input.location?.split(",")[0]?.trim()
  const seen = new Set<string>()
  return [city, input.occupation?.trim()]
    .filter((t): t is string => !!t)
    .map((t) => t.slice(0, 30).trim())
    .filter((t) => {
      const key = t.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function profileFields(input: MembershipInput) {
  const occupation = input.occupation?.trim()
  const employer = input.employer?.trim()
  const title =
    occupation && employer
      ? `${occupation}, ${employer}`
      : occupation || (employer ? `Works at ${employer}` : "KNH Alumni Network member")
  return {
    name: input.fullName,
    title: title.slice(0, 150),
    subtitle: [`Class of ${input.classYear}`, input.programme?.trim()].filter(Boolean).join(" · ").slice(0, 255),
    phone: input.phone.slice(0, 30),
    location: input.location?.trim() || null,
    website_url: input.linkedinUrl ?? null,
    tags: JSON.stringify(profileTags(input)),
  }
}

// Creates the member's Alumni profile in the directory (Yellow Pages), with
// the phone number hidden until an admin shows it. A repeat sign-up with the
// same email refreshes their existing profile instead of adding another.
async function upsertDirectoryProfile(conn: PoolConnection, input: MembershipInput) {
  const p = profileFields(input)
  const [prior] = await conn.execute<RowDataPacket[]>(
    `SELECT m.directory_entry_id FROM alumni_memberships m
     JOIN directory_entries d ON d.id = m.directory_entry_id
     WHERE m.email = ? ORDER BY m.id DESC LIMIT 1`,
    [input.email],
  )
  const existingId = prior[0]?.directory_entry_id as number | undefined
  if (existingId) {
    await conn.execute(
      `UPDATE directory_entries SET name = ?, title = ?, subtitle = ?, phone = ?, location = ?, website_url = ?, tags = ?
       WHERE id = ?`,
      [p.name, p.title, p.subtitle, p.phone, p.location, p.website_url, p.tags, existingId],
    )
    return existingId
  }
  const [r] = await conn.execute<ResultSetHeader>(
    `INSERT INTO directory_entries (category, name, title, subtitle, phone, show_phone, location, website_url, tags, is_active)
     VALUES ('alumni', ?, ?, ?, ?, 0, ?, ?, ?, 1)`,
    [p.name, p.title, p.subtitle, p.phone, p.location, p.website_url, p.tags],
  )
  return r.insertId
}

export async function createMembership(input: MembershipInput) {
  const [existing] = await getPool().execute<RowDataPacket[]>(
    "SELECT id FROM alumni_memberships WHERE email = ? AND created_at > NOW() - INTERVAL 1 DAY",
    [input.email],
  )
  if (existing[0]) throw new AppError("You've already applied with this email today. We'll be in touch soon.", 409)
  const conn = await getPool().getConnection()
  let membershipId: number
  try {
    await conn.beginTransaction()
    const entryId = await upsertDirectoryProfile(conn, input)
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO alumni_memberships
       (full_name, email, phone, class_year, programme, occupation, employer, location, linkedin_url, interests, wants_updates,
        directory_entry_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.fullName,
        input.email,
        input.phone,
        input.classYear,
        input.programme ?? null,
        input.occupation ?? null,
        input.employer ?? null,
        input.location ?? null,
        input.linkedinUrl ?? null,
        JSON.stringify(input.interests),
        input.wantsUpdates ? 1 : 0,
        entryId,
      ],
    )
    membershipId = result.insertId
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  notify(
    input.phone,
    `Welcome to the KNH Alumni Network, ${input.fullName.split(" ")[0]}! We've received your membership details and will be in touch. Once KNH, always KNH.`,
  )
  return { id: membershipId }
}

export async function listMemberships() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT m.*, d.id AS entry_id, d.show_phone, d.is_active AS entry_active
     FROM alumni_memberships m LEFT JOIN directory_entries d ON d.id = m.directory_entry_id
     ORDER BY FIELD(m.status, 'new', 'contacted', 'archived'), m.created_at DESC`,
  )
  return rows.map(toMembership)
}

export async function updateMembership(id: number, input: UpdateMembershipInput) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT directory_entry_id FROM alumni_memberships WHERE id = ?",
    [id],
  )
  if (!rows[0]) throw new AppError("Application not found.", 404)
  const { columns, params } = toColumns(input, { status: "status", notes: "notes" })
  if (columns.length > 0) await getPool().execute(updateSql("alumni_memberships", columns), [...params, id])

  // Profile settings live on their directory entry.
  const profile = toColumns(input, { showPhone: "show_phone", listed: "is_active" })
  if (profile.columns.length > 0) {
    const entryId = rows[0].directory_entry_id as number | null
    if (!entryId) throw new AppError("This member's directory profile no longer exists.", 409)
    await getPool().execute(updateSql("directory_entries", profile.columns), [...profile.params, entryId])
  }
}

export async function deleteMembership(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>("DELETE FROM alumni_memberships WHERE id = ?", [id])
  if (result.affectedRows === 0) throw new AppError("Application not found.", 404)
}

// ---- Public page ------------------------------------------------------------------------------

export async function getPublicContent(): Promise<AlumniPublicContent> {
  const pool = getPool()
  const [[projects], [executives], [donations], [totals], [gallery], [channels]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `${PROJECT_SELECT} WHERE p.is_published = 1 GROUP BY p.id ORDER BY p.sort_order, p.id DESC`,
    ),
    pool.query<RowDataPacket[]>("SELECT * FROM alumni_executives WHERE is_active = 1 ORDER BY sort_order, name"),
    pool.query<RowDataPacket[]>(
      `SELECT d.id, d.donor_name, d.is_anonymous, d.amount, d.message, d.donated_on, p.title AS project_title
       FROM alumni_donations d LEFT JOIN alumni_projects p ON p.id = d.project_id
       WHERE d.status = 'confirmed' ORDER BY d.donated_on DESC, d.id DESC LIMIT 24`,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count,
         COUNT(DISTINCT CASE WHEN is_anonymous = 0 THEN LOWER(donor_name) ELSE CONCAT('anon-', id) END) AS donors,
         COUNT(DISTINCT project_id) AS projects_funded
       FROM alumni_donations WHERE status = 'confirmed'`,
    ),
    pool.query<RowDataPacket[]>(
      "SELECT * FROM alumni_gallery WHERE is_published = 1 ORDER BY sort_order, taken_on DESC, id DESC",
    ),
    pool.query<RowDataPacket[]>("SELECT * FROM alumni_donation_channels WHERE is_active = 1 ORDER BY sort_order, id"),
  ])
  const t: RowDataPacket | Record<string, never> = totals[0] ?? {}
  return {
    projects: projects.map(toProject),
    executives: executives.map((e) => ({ ...(e as AlumniExecutive) })),
    // Anonymous donors' names never leave the server.
    donations: donations.map((d) => ({
      id: d.id as number,
      donor: d.is_anonymous ? "Anonymous" : (d.donor_name as string),
      amount: Number(d.amount),
      project_title: (d.project_title as string | null) ?? null,
      message: (d.message as string | null) ?? null,
      donated_on: String(d.donated_on).slice(0, 10),
    })),
    donationTotals: {
      amount: Number(t.amount ?? 0),
      donors: Number(t.donors ?? 0),
      count: Number(t.count ?? 0),
      projectsFunded: Number(t.projects_funded ?? 0),
    },
    gallery: gallery.map((g) => ({
      ...(g as GalleryImage),
      taken_on: g.taken_on ? String(g.taken_on).slice(0, 10) : null,
    })),
    channels: channels.map((c) => ({ ...(c as DonationChannel) })),
  }
}
