import { describe, expect, inject, it } from "vitest";

// Spec line 3: the core flow persists across a reload. The demo student is
// postgraduate, so they enrol in COMP8020 by course code and session only
// (never a class number), and it must still be listed on a fresh load.
const baseUrl = inject("baseUrl");
const SEMESTER = "/sessions/2026-S2/";

const enrol = (course: string) =>
  fetch(new URL("/api/enrolments", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams({ session: "2026-S2", course }),
    redirect: "manual",
  });

const semesterPage = async () => {
  const res = await fetch(new URL(SEMESTER, baseUrl));
  expect(res.status).toBe(200);
  return res.text();
};

describe("enrolment persists across a reload", () => {
  it("does not list the course before enrolling", async () => {
    expect(await semesterPage()).not.toContain("COMP8020");
  });

  it("accepts an enrolment and redirects", async () => {
    expect((await enrol("COMP8020")).status).toBe(303);
  });

  it("lists the course on a fresh load", async () => {
    expect(await semesterPage()).toContain("COMP8020");
  });
});

describe("eligibility", () => {
  it("refuses the undergraduate variant for the postgraduate student, and saves nothing", async () => {
    expect((await enrol("COMP4020")).status).toBe(403);
    expect(await semesterPage()).not.toContain("COMP4020");
  });
});
