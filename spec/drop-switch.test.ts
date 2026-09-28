import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { signUp } from "./auth";

// Drop and Switch work by course code only, like Add. Switch is one
// transaction: when the new course can't be added, the original stays.
const baseUrl = inject("baseUrl");
const SESSION = "2026-S2";
const SEMESTER = `/sessions/${SESSION}/`;

const post = (path: string, cookie: string, body: Record<string, string>) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl, cookie },
    body: new URLSearchParams(body),
    redirect: "manual",
  });

const enrol = (cookie: string, course: string, session = SESSION) => post("/api/enrolments", cookie, { session, course });
const drop = (cookie: string, course: string, session = SESSION) => post("/api/drop", cookie, { session, course });
const switchCourse = (cookie: string, from: string, to: string) =>
  post("/api/switch", cookie, { session: SESSION, from, to });

const doc = async (path: string, cookie: string) => {
  const res = await fetch(new URL(path, baseUrl), { headers: { cookie } });
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
};

const enrolledCodes = async (cookie: string) =>
  [...(await doc(SEMESTER, cookie)).querySelectorAll('[aria-labelledby="enrolled-title"] .course-row .code')].map(
    (el) => el.textContent,
  );

describe("drop", () => {
  let cookie: string;
  beforeAll(async () => {
    cookie = await signUp(baseUrl, "u8100001", "Postgraduate", "mcomp");
    await enrol(cookie, "COMP6442");
    await enrol(cookie, "COMP6466");
  });

  it("offers Drop beside each current enrolment", async () => {
    const page = await doc(SEMESTER, cookie);
    expect(page.querySelector('a[href$="/courses/COMP6442/drop/"]')).not.toBeNull();
  });

  it("asks for confirmation and shows the resulting unit total", async () => {
    const page = await doc(`${SEMESTER}courses/COMP6442/drop/`, cookie);
    expect(page.querySelector(".load")?.textContent).toMatch(/12\s*→\s*6\s*units/);
    expect(page.querySelector('form[action="/api/drop"]')).not.toBeNull();
  });

  it("removes only that course, and it stays removed on reload", async () => {
    const res = await drop(cookie, "COMP6442");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("dropped=COMP6442");
    expect(await enrolledCodes(cookie)).toEqual(["COMP6466"]);
  });

  it("refuses a course the student isn't enrolled in", async () => {
    expect((await drop(cookie, "COMP6442")).status).toBe(409);
  });

  it("won't change a session that has ended", async () => {
    expect((await enrol(cookie, "COMP6442", "2026-S1")).status).toBe(303);
    expect((await drop(cookie, "COMP6442", "2026-S1")).status).toBe(409);
  });
});

describe("switch", () => {
  let cookie: string;
  beforeAll(async () => {
    cookie = await signUp(baseUrl, "u8100002", "Postgraduate", "mcomp");
    await enrol(cookie, "COMP6442");
  });

  it("searches replacements with the student's profile: own variant, not already taken", async () => {
    const page = await doc(`${SEMESTER}courses/COMP6442/switch/?q=algorithms`, cookie);
    const choices = [...page.querySelectorAll('a[href*="/switch/COMP"]')].map((a) => a.getAttribute("href"));
    expect(choices).toContain(`${SEMESTER}courses/COMP6442/switch/COMP6466/`);
    expect(choices.some((href) => href?.endsWith("/COMP3600/"))).toBe(false);
  });

  it("shows both courses and the resulting load before confirming", async () => {
    const page = await doc(`${SEMESTER}courses/COMP6442/switch/COMP6466/`, cookie);
    const cards = [...page.querySelectorAll(".compare-card")].map((c) => c.textContent ?? "");
    expect(cards[0]).toContain("COMP6442");
    expect(cards[1]).toContain("COMP6466");
    expect(page.querySelector(".load")?.textContent).toMatch(/6\s*→\s*6\s*units/);
  });

  it("replaces the course", async () => {
    expect((await switchCourse(cookie, "COMP6442", "COMP6466")).status).toBe(303);
    expect(await enrolledCodes(cookie)).toEqual(["COMP6466"]);
  });

  it("keeps the original when the new course isn't available at the student's level", async () => {
    expect((await switchCourse(cookie, "COMP6466", "COMP3600")).status).toBe(403);
    expect(await enrolledCodes(cookie)).toEqual(["COMP6466"]);
  });

  it("keeps the original when the new course isn't offered", async () => {
    expect((await switchCourse(cookie, "COMP6466", "COMP9999")).status).toBe(400);
    expect(await enrolledCodes(cookie)).toEqual(["COMP6466"]);
  });

  it("keeps both when switching to a course already taken", async () => {
    await enrol(cookie, "COMP6710");
    expect((await switchCourse(cookie, "COMP6466", "COMP6710")).status).toBe(409);
    expect(await enrolledCodes(cookie)).toEqual(["COMP6466", "COMP6710"]);
  });

  it("refuses to switch from a course the student doesn't take", async () => {
    expect((await switchCourse(cookie, "COMP8715", "COMP6420")).status).toBe(409);
    expect(await enrolledCodes(cookie)).toEqual(["COMP6466", "COMP6710"]);
  });
});

describe("switch at the four-course limit", () => {
  let cookie: string;
  beforeAll(async () => {
    cookie = await signUp(baseUrl, "u8100003", "Postgraduate", "mcomp");
    for (const course of ["COMP6466", "COMP6442", "COMP6710", "COMP6420"]) await enrol(cookie, course);
  });

  it("still allows a switch, since the count doesn't change", async () => {
    expect((await switchCourse(cookie, "COMP6420", "COMP8715")).status).toBe(303);
    expect(await enrolledCodes(cookie)).toEqual(["COMP6442", "COMP6466", "COMP6710", "COMP8715"]);
  });

  it("still refuses a fifth course", async () => {
    expect((await enrol(cookie, "COMP6420")).status).toBe(409);
  });
});

describe("imported catalogue", () => {
  it("offers imported ANU courses through the same search and details pages", async () => {
    const cookie = await signUp(baseUrl, "u4100001", "Undergraduate", "bac");
    const results = await doc(`${SEMESTER}search/?q=concurrency`, cookie);
    const codes = [...results.querySelectorAll(".result .code")].map((el) => el.textContent);
    expect(codes).toContain("COMP2310");
    const details = await doc(`${SEMESTER}courses/COMP2310/`, cookie);
    expect(details.querySelector("h1")?.textContent).toBe("Systems, Networks, and Concurrency");
    expect(details.querySelector(".schedule-pending")).not.toBeNull();
  });
});
