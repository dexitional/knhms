import { z } from "zod";
import { MEMBERSHIP_INTERESTS } from "#/lib/alumni";
import { optionalField } from "../../lib/optional-field.js";

const sortOrder = z.number().int().min(0).max(9999);
const url = (max = 500) => optionalField(z.url({ protocol: /^https?$/ }).max(max));
const text = (max: number) => optionalField(z.string().trim().max(max));
const money = z.number().positive().max(100_000_000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const phone = z
  .string()
  .trim()
  .min(9, "Enter a valid phone number")
  .max(30)
  .regex(/^[+\d][\d\s()-]+$/, "Enter a valid phone number");

// ---- Projects ---------------------------------------------------------------------

const projectFields = z.object({
  title: z.string().trim().min(3).max(150),
  summary: text(500),
  category: text(60),
  status: z.enum(["planned", "ongoing", "completed"]).optional(),
  goalAmount: money.nullable().optional(),
  imageUrl: url(),
  ledBy: text(150),
  yearLabel: text(40),
  sortOrder: sortOrder.optional(),
  isPublished: z.boolean().optional(),
});
export const createProjectSchema = projectFields;
export const updateProjectSchema = projectFields.partial();

// ---- Executives -------------------------------------------------------------------

const executiveFields = z.object({
  name: z.string().trim().min(2).max(150),
  position: z.string().trim().min(2).max(150),
  classYear: text(40),
  bio: text(500),
  photoUrl: url(),
  email: optionalField(z.string().trim().email().max(150)),
  phone: text(30),
  linkedinUrl: url(),
  sortOrder: sortOrder.optional(),
  isActive: z.boolean().optional(),
});
export const createExecutiveSchema = executiveFields;
export const updateExecutiveSchema = executiveFields.partial();

// ---- Gallery ----------------------------------------------------------------------

const galleryFields = z.object({
  imageUrl: z.url({ protocol: /^https?$/ }).max(500),
  caption: text(255),
  album: text(80),
  takenOn: optionalField(date),
  sortOrder: sortOrder.optional(),
  isPublished: z.boolean().optional(),
});
export const createGallerySchema = galleryFields;
export const updateGallerySchema = galleryFields.partial();

// ---- Donation channels --------------------------------------------------------------

const channelFields = z.object({
  type: z.enum(["momo", "bank", "card", "other"]),
  label: z.string().trim().min(2).max(100),
  accountName: text(150),
  accountNumber: text(60),
  provider: text(100),
  branch: text(100),
  linkUrl: url(),
  instructions: text(500),
  sortOrder: sortOrder.optional(),
  isActive: z.boolean().optional(),
});
export const createChannelSchema = channelFields;
export const updateChannelSchema = channelFields.partial();

// ---- Donations ----------------------------------------------------------------------

const donationFields = z.object({
  donorName: z.string().trim().min(2).max(150),
  email: optionalField(z.string().trim().email().max(150)),
  phone: optionalField(phone),
  amount: money,
  projectId: z.number().int().positive().nullable().optional(),
  method: z.enum(["momo", "bank", "card", "cash", "other"]),
  reference: text(100),
  message: text(500),
  isAnonymous: z.boolean().optional(),
  donatedOn: date.optional(),
});

// From the public page: a pledge, or a donation already sent, for the hall
// to confirm. A phone or email is needed so the hall can follow up.
export const pledgeSchema = donationFields.refine((d) => !!d.phone || !!d.email, {
  message: "Give a phone number or email so we can confirm your gift.",
  path: ["phone"],
});

// Admins can record donations directly, already confirmed if they like.
export const createDonationSchema = donationFields.extend({
  status: z.enum(["pledged", "confirmed", "declined"]).optional(),
});
export const updateDonationSchema = createDonationSchema.partial();

// ---- Memberships ----------------------------------------------------------------------

const interestKeys = MEMBERSHIP_INTERESTS.map((i) => i.key) as [string, ...string[]];

export const membershipSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(150),
  phone,
  classYear: z.string().trim().min(2, "Which year did you finish?").max(40),
  programme: text(150),
  occupation: text(150),
  employer: text(150),
  location: text(150),
  linkedinUrl: url(),
  interests: z.array(z.enum(interestKeys)).max(interestKeys.length).default([]),
  wantsUpdates: z.boolean().default(true),
});

export const updateMembershipSchema = z
  .object({
    status: z.enum(["new", "contacted", "archived"]),
    notes: text(1000),
    // Their Alumni directory profile: show the phone number publicly, and
    // whether the profile is listed at all.
    showPhone: z.boolean(),
    listed: z.boolean(),
  })
  .partial();
