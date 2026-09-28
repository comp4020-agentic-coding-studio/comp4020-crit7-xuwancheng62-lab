import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { POSTGRAD, signUpPostgrad, signUpUndergrad, UNDERGRAD } from "./auth";

// The course catalogue: browse a session's courses without knowing what to
// search for. It defaults to the student's own study level, can show every
// course, and shares its matching with search.
const baseUrl = inject("baseUrl");

const page = async (path: string, cookie = POSTGRAD) => {
  const res = await fetch(new URL(path, baseUrl), { headers: { cookie } });
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
};

type Row = { code: string; career: string; recommended: boolean; eligible: boolean; href: string };

const rows = (doc: Document): Row[] =>
  [...doc.querySelectorAll(".results > li")].map((li) => ({
    code: li.querySelector(".code")!.textContent!.trim(),
    career: li.querySelector(".meta")?.textContent ?? "",
    recommended: li.querySelector(".rec-tag") !== null,
    eligible: !li.classList.contains("unavailable"),
    href: li.querySelector("h3 a")!.getAttribute("href")!,
  }));

const codes = async (path: string, cookie = POSTGRAD) => rows(await page(path, cookie)).map((r) => r.code);

beforeAll(async () => {
  await signUpPostgrad(baseUrl);
  await signUpUndergrad(baseUrl);
});

describe("course catalogue", () => {
  it("is in the main navigation next to Enrolment and Profile", async () => {
    const nav = [...(await page("/")).querySelectorAll('nav[aria-label="Site"] a')].map((a) => a.textContent);
    expect(nav).toEqual(expect.arrayContaining(["Enrolment", "Courses", "Profile"]));
  });

  it("lists courses without a search, defaulting to the student's study level", async () => {
    const list = rows(await page("/courses/?session=2026-S2"));
    expect(list.length).toBeGreaterThan(10);
    expect(list.every((r) => r.career.includes("Postgraduate") && r.eligible)).toBe(true);
    expect(list.map((r) => r.code)).toContain("COMP8020");
    expect(list.map((r) => r.code)).not.toContain("COMP4020");
  });

  it("marks the program's recommended courses and lists them first", async () => {
    const list = rows(await page("/courses/?session=2026-S2"));
    expect(list.find((r) => r.code === "COMP8020")?.recommended).toBe(true);
    const firstPlain = list.findIndex((r) => !r.recommended);
    expect(firstPlain).toBeGreaterThan(0);
    expect(list.slice(firstPlain).some((r) => r.recommended)).toBe(false);
  });

  it("shows every study level when asked, marking what the student can't take", async () => {
    const list = rows(await page("/courses/?session=2026-S2&scope=all"));
    const ug = list.find((r) => r.code === "COMP4020");
    expect(ug?.eligible).toBe(false);
    expect(ug?.recommended).toBe(false);
    expect(list.find((r) => r.code === "COMP8020")?.eligible).toBe(true);
  });

  it("searches by course code, title and keyword", async () => {
    expect(await codes("/courses/?session=2026-S2&q=comp 6442")).toEqual(["COMP6442"]);
    expect(await codes("/courses/?session=2026-S2&q=Software Construction")).toContain("COMP6442");
    expect(await codes("/courses/?session=2026-S2&q=design patterns")).toContain("COMP6442");
  });

  it("filters by subject, course level, teaching mode and study level", async () => {
    const maths = await codes("/courses/?session=2026-S2&subject=MATH", UNDERGRAD);
    expect(maths.length).toBeGreaterThan(0);
    expect(maths.every((c) => c.startsWith("MATH"))).toBe(true);

    const level = await codes("/courses/?session=2026-S2&level=6000");
    expect(level.length).toBeGreaterThan(0);
    expect(level.every((c) => /^[A-Z]+6/.test(c))).toBe(true);

    expect(await codes("/courses/?session=2026-S2&mode=Online", UNDERGRAD)).toContain("STAT1003");

    const ugOnly = rows(await page("/courses/?session=2026-S2&scope=all&career=Undergraduate"));
    expect(ugOnly.length).toBeGreaterThan(0);
    expect(ugOnly.every((r) => r.career.includes("Undergraduate"))).toBe(true);
  });

  it("follows the selected session", async () => {
    const s1 = await codes("/courses/?session=2026-S1");
    expect(s1).toContain("COMP6120");
    expect(await codes("/courses/?session=2026-S2")).not.toContain("COMP6120");
  });

  it("links each course to its detail page for that session", async () => {
    for (const r of rows(await page("/courses/?session=2026-S2&scope=all"))) {
      expect(r.href).toBe(`/sessions/2026-S2/courses/${r.code}/`);
    }
  });

  it("agrees with search, because both use the same catalogue", async () => {
    const browse = new Set(await codes("/courses/?session=2026-S2&scope=all&q=software"));
    const search = await codes("/sessions/2026-S2/search/?q=software");
    expect(search.length).toBeGreaterThan(0);
    for (const code of search) expect(browse).toContain(code);
  });

  it("never shows a class number", async () => {
    const html = (await page("/courses/?session=2026-S2&scope=all")).documentElement.outerHTML;
    expect(html).not.toMatch(/class\s*(number|nbr)/i);
    // COMP4020's and COMP8020's 2026-S2 class numbers (seed.ts)
    expect(html).not.toMatch(/\b60(20|21)\b/);
  });
});
