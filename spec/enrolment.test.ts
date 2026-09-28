import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";
import {
  cookieFor,
  POSTGRAD,
  saveProfile,
  signIn,
  signUp,
  signUpPostgrad,
  signUpUndergrad,
  UNDERGRAD,
} from "./auth";

// Spec line 3: the core flow persists across a reload. A postgraduate enrols
// in COMP8020 by course code and session only (never a class number), and it
// must still be listed on a fresh load.
const baseUrl = inject("baseUrl");
const SEMESTER = "/sessions/2026-S2/";

const enrol = (course: string, cookie = POSTGRAD) =>
  fetch(new URL("/api/enrolments", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl, cookie },
    body: new URLSearchParams({ session: "2026-S2", course }),
    redirect: "manual",
  });

const page = async (path: string, cookie = POSTGRAD) => {
  const res = await fetch(new URL(path, baseUrl), { headers: { cookie } });
  expect(res.status).toBe(200);
  return res.text();
};

const doc = (html: string) => new JSDOM(html).window.document;

// Only the "Enrolled courses" section: recommendations elsewhere on the page
// can name a course the student hasn't taken.
const enrolledOn = async (cookie = POSTGRAD) =>
  doc(await page(SEMESTER, cookie)).querySelector('[aria-labelledby="enrolled-title"]')?.textContent ?? "";

beforeAll(async () => {
  await signUpPostgrad(baseUrl);
  await signUpUndergrad(baseUrl);
});

describe("sign-in and profile", () => {
  it("sends a visitor who isn't signed in to sign in first", async () => {
    const res = await fetch(new URL(SEMESTER, baseUrl), { redirect: "manual" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/^\/sign-in\//);
  });

  it("refuses an enrolment when not signed in", async () => {
    expect((await enrol("COMP8020", "")).status).toBe(401);
  });

  it("rejects something that isn't a Student ID", async () => {
    const res = await signIn(baseUrl, "alice");
    expect(res.headers.get("location")).toMatch(/error=format/);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("remembers the Student ID and asks a new student to set up their profile", async () => {
    const res = await signIn(baseUrl, "U5550001");
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie")).toContain(cookieFor("u5550001"));
    const home = await fetch(new URL("/", baseUrl), { headers: { cookie: cookieFor("u5550001") }, redirect: "manual" });
    expect(home.status).toBe(303);
    expect(home.headers.get("location")).toBe("/profile/edit/");
  });

  it("won't save a program that doesn't match the study level", async () => {
    await signIn(baseUrl, "u5550002");
    const res = await saveProfile(baseUrl, "u5550002", "Undergraduate", "mcomp");
    expect(res.headers.get("location")).toMatch(/error=mismatch/);
    const home = await fetch(new URL("/", baseUrl), { headers: { cookie: cookieFor("u5550002") }, redirect: "manual" });
    expect(home.headers.get("location")).toBe("/profile/edit/");
  });
});

describe("enrolment persists across a reload", () => {
  it("does not list the course before enrolling", async () => {
    expect(await enrolledOn()).not.toContain("COMP8020");
  });

  it("accepts an enrolment and redirects", async () => {
    expect((await enrol("COMP8020")).status).toBe(303);
  });

  it("lists the course on a fresh load", async () => {
    expect(await enrolledOn()).toContain("COMP8020");
  });
});

describe("eligibility", () => {
  it("refuses the undergraduate variant for the postgraduate student, and saves nothing", async () => {
    expect((await enrol("COMP4020")).status).toBe(403);
    expect(await enrolledOn()).not.toContain("COMP4020");
  });
});

describe("the student's profile picks the variant", () => {
  it("shows the undergraduate COMP4020, not COMP8020", async () => {
    const html = await page("/sessions/2026-S2/search/?q=agentic", UNDERGRAD);
    expect(html).toContain("COMP4020");
    expect(html).not.toContain("COMP8020");
  });

  it("keeps each student's enrolments separate", async () => {
    expect(await enrolledOn(UNDERGRAD)).not.toContain("COMP8020");
    expect((await enrol("COMP8020", UNDERGRAD)).status).toBe(403);
    expect((await enrol("COMP4020", UNDERGRAD)).status).toBe(303);
    expect(await enrolledOn(UNDERGRAD)).toContain("COMP4020");
    expect(await enrolledOn()).not.toContain("COMP4020");
  });
});

describe("recommendations follow the program", () => {
  const recommendedIn = async (cookie: string) =>
    [...doc(await page("/sessions/2026-S2/search/?q=software", cookie)).querySelectorAll(".result")]
      .filter((r) => r.querySelector(".rec-tag"))
      .map((r) => r.querySelector(".code")?.textContent);

  it("marks Software Construction for a Master of Computing student", async () => {
    expect(await recommendedIn(POSTGRAD)).toContain("COMP6442");
  });

  it("doesn't mark it for a program that doesn't list it", async () => {
    const cookie = await signUp(baseUrl, "u8000002", "Postgraduate", "msda");
    expect(await recommendedIn(cookie)).not.toContain("COMP6442");
  });
});

describe("at most four courses a session", () => {
  let cookie: string;
  beforeAll(async () => {
    cookie = await signUp(baseUrl, "u8000003", "Postgraduate", "mcomp");
  });

  it("accepts four and refuses a fifth", async () => {
    for (const course of ["COMP6466", "COMP6442", "COMP6710", "COMP6420"]) {
      expect((await enrol(course, cookie)).status).toBe(303);
    }
    expect((await enrol("COMP8715", cookie)).status).toBe(409);
    expect(await enrolledOn(cookie)).not.toContain("COMP8715");
  });

  it("explains the limit instead of offering Add", async () => {
    const details = doc(await page("/sessions/2026-S2/courses/COMP8715/", cookie));
    expect(details.querySelector(".enrol-panel")?.textContent).toMatch(/4 courses/);
    expect(details.querySelector('a[href$="/confirm/"]')).toBeNull();
  });
});

describe("profile page", () => {
  it("shows the Student ID, study level, program and current enrolments", async () => {
    const text = doc(await page("/profile/", UNDERGRAD)).body.textContent ?? "";
    expect(text).toContain("u4000001");
    expect(text).toContain("Undergraduate");
    expect(text).toContain("Bachelor of Advanced Computing (Honours)");
    expect(text).toContain("COMP4020");
  });
});
