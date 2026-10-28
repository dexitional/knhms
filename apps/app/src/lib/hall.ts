// The hall pages under the Home menu (routes/_web/hall.$page.tsx). People
// pages list directory entries of one category, managed in Admin → Yellow
// Pages; Hall Projects lists KNH Hub posts in the "Hall Projects" category,
// managed in Admin → KNH Hub. Client-safe: shared by the header, the pages,
// the server loader and the admin.

export type HallPeopleCategory = "council" | "management" | "tutor" | "executive";

export interface HallPage {
  slug: string;
  label: string; // menu + page title
  summary: string; // one line in the Home menu
  intro: string; // under the page title
  source: { kind: "people"; category: HallPeopleCategory } | { kind: "projects" };
  empty: string; // shown until the admin adds content
}

// Hub posts in this category appear on Hall Projects (and still on Home).
export const HALL_PROJECTS_CATEGORY = "Hall Projects";
export const isHallProjectPost = (category: string | null | undefined) =>
  (category ?? "").trim().toLowerCase() === HALL_PROJECTS_CATEGORY.toLowerCase();

export const HALL_PAGES: Array<HallPage> = [
  {
    slug: "council",
    label: "Hall Council",
    summary: "The council that governs the hall",
    intro: "The Hall Council oversees the welfare, discipline and direction of Kwame Nkrumah Hall.",
    source: { kind: "people", category: "council" },
    empty: "The Hall Council members will be listed here soon.",
  },
  {
    slug: "management",
    label: "Hall Management",
    summary: "The officers who run the hall day to day",
    intro: "Meet the officers responsible for running the hall and supporting residents every day.",
    source: { kind: "people", category: "management" },
    empty: "The hall management team will be listed here soon.",
  },
  {
    slug: "tutors",
    label: "Hall Tutors",
    summary: "Senior members who guide residents",
    intro: "Hall tutors are senior members who mentor residents and support hall life and academics.",
    source: { kind: "people", category: "tutor" },
    empty: "The hall tutors will be listed here soon.",
  },
  {
    slug: "projects",
    label: "Hall Projects",
    summary: "Developments and initiatives in the hall",
    intro: "Projects, developments and initiatives improving life in Kwame Nkrumah Hall.",
    source: { kind: "projects" },
    empty: "Hall projects will be posted here soon.",
  },
  {
    slug: "executives",
    label: "Hall Executives (JCRC)",
    summary: "Your elected Junior Common Room Committee",
    intro: "The Junior Common Room Committee (JCRC) is the elected student executive of the hall.",
    source: { kind: "people", category: "executive" },
    empty: "The JCRC executives will be listed here soon.",
  },
];

export const hallPage = (slug: string) => HALL_PAGES.find((p) => p.slug === slug);

// Which hall page shows a directory category (for the admin hint).
export const hallPageForCategory = (category: string) =>
  HALL_PAGES.find((p) => p.source.kind === "people" && p.source.category === category);
