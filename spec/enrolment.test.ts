import { describe, expect, inject, it } from "vitest";
import { POSTGRAD, UNDERGRAD } from "./auth";

// Spec line 3: the core flow persists across a reload. The postgraduate demo
// student enrols in COMP8020 by course code and session only (never a class
// number), and it must still be listed on a fresh load.
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

describe("sign-in", () => {
  it("sends a visitor with no profile to sign in first", async () => {
    const res = await fetch(new URL(SEMESTER, baseUrl), { redirect: "manual" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/^\/sign-in\//);
  });

  it("refuses an enrolment with no profile", async () => {
    expect((await enrol("COMP8020", "")).status).toBe(401);
  });

  it("remembers the chosen profile in a cookie", async () => {
    const res = await fetch(new URL("/api/session", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body: new URLSearchParams({ student: "ug-demo", next: SEMESTER }),
      redirect: "manual",
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(SEMESTER);
    expect(res.headers.get("set-cookie")).toContain(UNDERGRAD);
  });
});

describe("enrolment persists across a reload", () => {
  it("does not list the course before enrolling", async () => {
    expect(await page(SEMESTER)).not.toContain("COMP8020");
  });

  it("accepts an enrolment and redirects", async () => {
    expect((await enrol("COMP8020")).status).toBe(303);
  });

  it("lists the course on a fresh load", async () => {
    expect(await page(SEMESTER)).toContain("COMP8020");
  });
});

describe("eligibility", () => {
  it("refuses the undergraduate variant for the postgraduate student, and saves nothing", async () => {
    expect((await enrol("COMP4020")).status).toBe(403);
    expect(await page(SEMESTER)).not.toContain("COMP4020");
  });
});

describe("the signed-in profile picks the variant", () => {
  it("shows the undergraduate student COMP4020, not COMP8020", async () => {
    const html = await page("/sessions/2026-S2/search/?q=agentic", UNDERGRAD);
    expect(html).toContain("COMP4020");
    expect(html).not.toContain("COMP8020");
  });

  it("keeps each student's enrolments separate", async () => {
    expect(await page(SEMESTER, UNDERGRAD)).not.toContain("COMP8020");
    expect((await enrol("COMP8020", UNDERGRAD)).status).toBe(403);
    expect((await enrol("COMP4020", UNDERGRAD)).status).toBe(303);
    expect(await page(SEMESTER, UNDERGRAD)).toContain("COMP4020");
    expect(await page(SEMESTER)).not.toContain("COMP4020");
  });
});
