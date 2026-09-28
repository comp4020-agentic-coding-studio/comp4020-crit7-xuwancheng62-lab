// One-time import of 2026 COMP courses from the public ANU Programs & Courses
// catalogue into a committed snapshot (src/lib/catalogue/anu-2026-comp.json).
// src/lib/seed.ts loads that snapshot into SQLite on boot, so pages never
// fetch from ANU. Re-run by hand to refresh: `pnpm catalogue:import`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const BASE = "https://programsandcourses.anu.edu.au";
const YEAR = 2026;
const OUT = "src/lib/catalogue/anu-2026-comp.json";
const DELAY_MS = 300;

// Only sessions the app models; others (Autumn, Spring, Quarters) are skipped.
const SESSION_CODES: Record<string, string> = {
  "Summer Session": `${YEAR}-SU`,
  "First Semester": `${YEAR}-S1`,
  "Winter Session": `${YEAR}-WI`,
  "Second Semester": `${YEAR}-S2`,
};

export type ImportedOffering = {
  session: string;
  classNumber: number | null;
  startDate: string | null;
  endDate: string | null;
  teachingMode: string | null;
};

export type ImportedCourse = {
  code: string;
  name: string;
  units: number;
  career: "Undergraduate" | "Postgraduate";
  teachingMode: string;
  summary: string;
  description: string;
  prerequisites: string;
  assessment: string;
  offerings: ImportedOffering[];
  skippedSessions: string[];
};

const clean = (text: string | null | undefined) =>
  (text ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

// "In Person" → "In person", matching the curated catalogue's wording.
export const modeLabel = (text: string) => {
  const t = clean(text).toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
};

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// "23 Feb 2026" → "2026-02-23"
export const isoDate = (text: string): string | null => {
  const m = clean(text).match(/^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/);
  return m && MONTHS[m[2]] ? `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, "0")}` : null;
};

// "Assignment(s) (30) [LO 1,2,3]" → "Assignment(s) — 30%", matching the
// app's "Item — weight" assessment format.
export const assessmentLine = (text: string): string => {
  const line = clean(text).replace(/\s*\[LO[^\]]*\]\s*$/i, "");
  const m = line.match(/^(.*?)\s*\((\d+(?:\.\d+)?)\)$/);
  if (m) return `${m[1]} — ${m[2]}%`;
  return line.replace(/\s*\((?:null)?\)$/i, "");
};

export const summaryOf = (description: string): string => {
  const first = description.split(/\n\s*\n/)[0] ?? "";
  const sentence = first.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? first;
  return sentence.length > 180 ? `${sentence.slice(0, 177).trimEnd()}…` : sentence;
};

const codeText = (doc: Document, heading: string) => {
  for (const h of doc.querySelectorAll(".degree-summary__code-heading")) {
    if (clean(h.textContent) === heading) return clean(h.parentElement?.querySelector(".degree-summary__code-text")?.textContent);
  }
  return "";
};

// Elements after `start` up to the next h2.
const until = (start: Element | null) => {
  const out: Element[] = [];
  for (let el = start?.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) out.push(el);
  return out;
};

export function parseCoursePage(code: string, html: string): ImportedCourse | { code: string; skip: string } {
  const doc = new JSDOM(html).window.document;
  const name = clean(doc.querySelector(".intro__degree-title__component")?.textContent);
  if (!name) return { code, skip: "no course page" };

  const careerCode = codeText(doc, "Academic career");
  const career = careerCode === "UGRD" ? "Undergraduate" : careerCode === "PGRD" ? "Postgraduate" : null;
  if (!career) return { code, skip: `career ${careerCode || "unknown"}` };

  const units = Number(clean(doc.querySelector(".degree-summary__requirements-units")?.textContent).match(/\d+/)?.[0] ?? 6);

  const intro = doc.querySelector("#introduction");
  const paras = intro ? [...intro.querySelectorAll("p, li")].map((p) => clean(p.textContent)).filter(Boolean) : [];
  const description = (paras.length ? paras : [clean(intro?.textContent)]).filter(Boolean).join("\n\n");

  const assessment = until(doc.querySelector("#indicative-assessment"))
    .flatMap((el) => [...el.querySelectorAll("li")])
    .map((li) => assessmentLine(li.textContent ?? ""))
    .filter(Boolean)
    .join("\n");

  const prerequisites = clean(doc.querySelector(".requisite")?.textContent) || "None listed.";

  const offerings: ImportedOffering[] = [];
  const skippedSessions: string[] = [];
  const tab = doc.querySelector("#course-tab-1");
  const tabYear = clean(doc.querySelector('.course-tabs-menu a[href="#course-tab-1"]')?.textContent);
  if (tab && tabYear === String(YEAR)) {
    let session = "";
    for (const el of tab.querySelectorAll("h3, table")) {
      if (el.tagName === "H3") {
        session = clean(el.textContent);
        continue;
      }
      const sessionCode = SESSION_CODES[session];
      if (!sessionCode) {
        if (session && !skippedSessions.includes(session)) skippedSessions.push(session);
        continue;
      }
      for (const row of el.querySelectorAll("tbody tr")) {
        const cells = [...row.querySelectorAll("td")].map((td) => clean(td.textContent));
        const classNumber = /^\d+$/.test(cells[0] ?? "") ? Number(cells[0]) : null;
        offerings.push({
          session: sessionCode,
          classNumber,
          startDate: isoDate(cells[1] ?? ""),
          endDate: isoDate(cells[4] ?? ""),
          teachingMode: cells[5] ? modeLabel(cells[5]) : null,
        });
      }
    }
  }

  return {
    code,
    name,
    units,
    career,
    teachingMode: modeLabel(codeText(doc, "Mode of delivery")) || offerings[0]?.teachingMode || "In person",
    summary: summaryOf(description) || name,
    description: description || `${name}.`,
    prerequisites,
    assessment: assessment || "See the class summary for assessment details.",
    offerings,
    skippedSessions,
  };
}

async function get(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "COMP4020 student prototype catalogue import (one-off)", "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

async function listCodes(): Promise<string[]> {
  const params = new URLSearchParams({
    SearchText: "COMP",
    SelectedYear: String(YEAR),
    PageIndex: "0",
    MaxPageSize: "10",
    PageSize: "Infinity",
    ShowAll: "true",
  });
  const data = (await (await get(`${BASE}/data/CourseSearch/GetCourses?${params}`)).json()) as {
    Items: { CourseCode: string }[];
  };
  return [...new Set(data.Items.map((i) => i.CourseCode).filter((c) => /^COMP\d{4}$/.test(c)))].sort();
}

async function main() {
  const codes = await listCodes();
  console.log(`Found ${codes.length} COMP courses for ${YEAR}.`);
  const courses: ImportedCourse[] = [];
  const skipped: { code: string; skip: string }[] = [];
  for (const [i, code] of codes.entries()) {
    const html = await (await get(`${BASE}/${YEAR}/course/${code}`)).text();
    const parsed = parseCoursePage(code, html);
    if ("skip" in parsed) skipped.push(parsed);
    else courses.push(parsed);
    process.stdout.write(`\r${i + 1}/${codes.length} ${code}   `);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  mkdirSync(dirname(OUT), { recursive: true });
  const snapshot = {
    source: `${BASE}/catalogue (SearchText=COMP, ${YEAR})`,
    importedAt: new Date().toISOString().slice(0, 10),
    year: YEAR,
    courses,
    skipped,
  };
  writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  const offered = courses.filter((c) => c.offerings.length > 0).length;
  console.log(`\nWrote ${courses.length} courses (${offered} with ${YEAR} offerings in modelled sessions) to ${OUT}.`);
  if (skipped.length) console.log(`Skipped: ${skipped.map((s) => `${s.code} (${s.skip})`).join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
