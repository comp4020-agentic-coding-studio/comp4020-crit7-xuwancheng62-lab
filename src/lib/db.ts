import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { isRecommended } from "./programs";
import { type Career, type Course, classes, courseGroups, courses, enrolments, type Session, sessions, students } from "./schema";
import { seedCatalogue } from "./seed";
import { isArchived } from "./sessions";
import type { Student } from "./student";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });
seedCatalogue(db);

export type SessionStatus = "Past" | "Current" | "Upcoming";

// The one enrolment rule the prototype enforces.
export const MAX_COURSES_PER_SESSION = 4;

export type StudentRecord = typeof students.$inferSelect;

export function getStudent(id: string): StudentRecord | undefined {
  return db.select().from(students).where(eq(students.id, id)).get();
}

export function ensureStudent(id: string): StudentRecord {
  db.insert(students).values({ id }).onConflictDoNothing().run();
  return getStudent(id)!;
}

export function saveProfile(id: string, career: Career, program: string) {
  db.update(students).set({ career, program }).where(eq(students.id, id)).run();
}

// A course as offered in one session. The class number stays out of it on
// purpose: pages never see it.
export type Offering = Course & { groupName: string; schedule: string; enrolled: boolean };

function canberraToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Canberra" }).format(new Date());
}

export function statusOf(session: Session, today = canberraToday()): SessionStatus {
  if (session.endDate < today) return "Past";
  if (session.startDate <= today) return "Current";
  return "Upcoming";
}

// Sessions open to enrolment pages. Archived ones appear only in history.
export function listSessions(): Session[] {
  return db
    .select()
    .from(sessions)
    .orderBy(asc(sessions.startDate))
    .all()
    .filter((s) => !isArchived(s));
}

// The session containing today, else the next one to start.
export function featuredSession(all: Session[], today = canberraToday()): Session | undefined {
  return (
    all.find((s) => statusOf(s, today) === "Current") ?? all.find((s) => statusOf(s, today) === "Upcoming")
  );
}

export function getSession(code: string): Session | undefined {
  const session = db.select().from(sessions).where(eq(sessions.code, code)).get();
  return session && !isArchived(session) ? session : undefined;
}

function offerings(sessionCode: string, studentId: string): Offering[] {
  return db
    .select({
      ...getTableColumns(courses),
      groupName: courseGroups.name,
      schedule: classes.schedule,
      enrolmentId: enrolments.id,
    })
    .from(classes)
    .innerJoin(courses, eq(classes.courseCode, courses.code))
    .innerJoin(courseGroups, eq(courses.groupId, courseGroups.id))
    .leftJoin(
      enrolments,
      and(eq(enrolments.classNumber, classes.classNumber), eq(enrolments.studentId, studentId)),
    )
    .where(eq(classes.sessionCode, sessionCode))
    .orderBy(asc(courses.code))
    .all()
    .map(({ enrolmentId, ...rest }) => ({ ...rest, enrolled: enrolmentId !== null }));
}

// Catalogue facets derived from the course code: "COMP6442" is subject COMP,
// course level 6000.
export const subjectOf = (code: string) => code.match(/^[A-Z]+/)?.[0] ?? code;
export const levelOf = (code: string) => Number(code.match(/\d/)?.[0] ?? 0) * 1000;

// An offering as the catalogue sees it for one student.
export type CatalogueEntry = Offering & { subject: string; level: number; eligible: boolean; recommended: boolean };

function catalogueEntries(sessionCode: string, student: Student): CatalogueEntry[] {
  return offerings(sessionCode, student.id).map((o) => ({
    ...o,
    subject: subjectOf(o.code),
    level: levelOf(o.code),
    eligible: o.career === student.career,
    recommended: isRecommended(student.program, o.groupId),
  }));
}

// The one definition of "matches a search", for both search and browse: code
// (spaces ignored, so "comp 6442" works), title, description or subject name.
function matchesQuery(o: Offering, q: string) {
  if (!q) return true;
  const compact = q.replace(/\s+/g, "");
  return (
    [o.code, o.name, o.description, o.groupName].some((field) => field.toLowerCase().includes(q)) ||
    o.code.toLowerCase().includes(compact)
  );
}

export type CatalogueFilters = {
  q?: string;
  // "mine": only courses the student's study level can take (the default)
  scope?: "mine" | "all";
  career?: Career;
  subject?: string;
  level?: number;
  mode?: string;
  recommendedOnly?: boolean;
};

export type CatalogueFacets = { subjects: string[]; levels: number[]; modes: string[] };

export type Catalogue = { entries: CatalogueEntry[]; total: number; facets: CatalogueFacets };

// Browse the courses offered in a session. Facets come from the whole
// session so filter options don't vanish as filters narrow the list.
// Recommended and eligible courses sort first, then by code.
export function browseCatalogue(sessionCode: string, student: Student, filters: CatalogueFilters = {}): Catalogue {
  const all = catalogueEntries(sessionCode, student);
  const q = (filters.q ?? "").trim().toLowerCase();
  const scoped = filters.scope === "all" ? all : all.filter((e) => e.eligible);
  const entries = scoped
    .filter(
      (e) =>
        matchesQuery(e, q) &&
        (filters.scope !== "all" || !filters.career || e.career === filters.career) &&
        (!filters.subject || e.subject === filters.subject) &&
        (!filters.level || e.level === filters.level) &&
        (!filters.mode || e.teachingMode === filters.mode) &&
        (!filters.recommendedOnly || e.recommended),
    )
    .sort(
      (a, b) =>
        Number(!a.eligible) - Number(!b.eligible) ||
        Number(!a.recommended) - Number(!b.recommended) ||
        a.code.localeCompare(b.code),
    );
  const distinct = <T>(values: T[]) => [...new Set(values)];
  return {
    entries,
    total: scoped.length,
    facets: {
      subjects: distinct(all.map((e) => e.subject)).sort(),
      levels: distinct(all.map((e) => e.level)).sort((a, b) => a - b),
      modes: distinct(all.map((e) => e.teachingMode)).sort(),
    },
  };
}

export type SubjectResult = {
  groupName: string;
  eligible: Offering | null;
  // shown muted: the variant this student can't take, when there's reason to mention it
  ineligible: Offering | null;
  recommended: boolean;
};

// The student searches for a subject; the system picks the variant their
// career can take. An ineligible variant is only surfaced when the student
// named its code, or when there's no eligible variant at all. Built on the
// same catalogue as browsing, grouped by subject.
export function searchSubjects(sessionCode: string, query: string, student: Student): SubjectResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = catalogueEntries(sessionCode, student);
  const matches = browseCatalogue(sessionCode, student, { q, scope: "all" }).entries;
  const compact = q.replace(/\s+/g, "");

  const results: SubjectResult[] = [];
  for (const groupId of new Set(matches.map((m) => m.groupId))) {
    const variants = all.filter((o) => o.groupId === groupId);
    const eligible = variants.find((o) => o.eligible) ?? null;
    const matchedHere = matches.filter((m) => m.groupId === groupId && !m.eligible);
    const ineligible = eligible
      ? (matchedHere.find((m) => compact.includes(m.code.toLowerCase())) ?? null)
      : (matchedHere[0] ?? null);
    results.push({
      groupName: variants[0].groupName,
      eligible,
      ineligible,
      recommended: variants[0].recommended,
    });
  }
  return results.sort(
    (a, b) =>
      Number(!a.eligible) - Number(!b.eligible) ||
      Number(!a.recommended) - Number(!b.recommended) ||
      (a.eligible ?? a.ineligible)!.code.localeCompare((b.eligible ?? b.ineligible)!.code),
  );
}

export type CourseView = {
  offering: Offering;
  eligible: boolean;
  // this student's variant of the same subject, offered this session
  alternative: Offering | null;
  equivalents: Pick<Course, "code" | "career">[];
};

export function getCourseView(sessionCode: string, courseCode: string, student: Student): CourseView | undefined {
  const { career } = student;
  const all = offerings(sessionCode, student.id);
  const offering = all.find((o) => o.code === courseCode);
  if (!offering) return undefined;
  const equivalents = db
    .select({ code: courses.code, career: courses.career })
    .from(courses)
    .where(eq(courses.groupId, offering.groupId))
    .orderBy(asc(courses.code))
    .all()
    .filter((c) => c.code !== courseCode);
  const eligible = offering.career === career;
  const alternative = eligible
    ? null
    : (all.find((o) => o.groupId === offering.groupId && o.career === career) ?? null);
  return { offering, eligible, alternative, equivalents };
}

export function listEnrolments(sessionCode: string, studentId: string): Offering[] {
  return offerings(sessionCode, studentId).filter((o) => o.enrolled);
}

// The student's own variants of their program's recommended subjects, leaving
// out any subject they've enrolled in in any session.
export function listRecommended(sessionCode: string, student: Student): Offering[] {
  const taken = new Set(
    db
      .select({ groupId: courses.groupId })
      .from(enrolments)
      .innerJoin(classes, eq(enrolments.classNumber, classes.classNumber))
      .innerJoin(courses, eq(classes.courseCode, courses.code))
      .where(eq(enrolments.studentId, student.id))
      .all()
      .map((r) => r.groupId),
  );
  return offerings(sessionCode, student.id).filter(
    (o) => o.career === student.career && !taken.has(o.groupId) && isRecommended(student.program, o.groupId),
  );
}

export type EnrolmentHistory = { session: Session; courses: Pick<Course, "code" | "name" | "units">[] }[];

// Every session the student has enrolled in, in date order.
export function enrolmentHistory(studentId: string): EnrolmentHistory {
  const rows = db
    .select({ session: sessions, code: courses.code, name: courses.name, units: courses.units })
    .from(enrolments)
    .innerJoin(classes, eq(enrolments.classNumber, classes.classNumber))
    .innerJoin(courses, eq(classes.courseCode, courses.code))
    .innerJoin(sessions, eq(classes.sessionCode, sessions.code))
    .where(eq(enrolments.studentId, studentId))
    .orderBy(asc(sessions.startDate), asc(courses.code))
    .all();
  const history: EnrolmentHistory = [];
  for (const { session, ...course } of rows) {
    const last = history.at(-1);
    if (last?.session.code === session.code) last.courses.push(course);
    else history.push({ session, courses: [course] });
  }
  return history;
}

export function getCourse(code: string): Course | undefined {
  return db.select().from(courses).where(eq(courses.code, code)).get();
}

type Tx = Pick<typeof db, "select" | "insert" | "delete">;

function classIn(tx: Tx, sessionCode: string, courseCode: string) {
  return tx
    .select({ classNumber: classes.classNumber, career: courses.career })
    .from(classes)
    .innerJoin(courses, eq(classes.courseCode, courses.code))
    .where(and(eq(classes.sessionCode, sessionCode), eq(classes.courseCode, courseCode)))
    .get();
}

function enrolledClassNumbers(tx: Tx, sessionCode: string, studentId: string): number[] {
  return tx
    .select({ classNumber: enrolments.classNumber })
    .from(enrolments)
    .innerJoin(classes, eq(enrolments.classNumber, classes.classNumber))
    .where(and(eq(enrolments.studentId, studentId), eq(classes.sessionCode, sessionCode)))
    .all()
    .map((r) => r.classNumber);
}

type AddResult = "ok" | "not-offered" | "ineligible" | "already-enrolled" | "limit";

// The one place the enrolment rules live; Add and Switch both go through it.
function addEnrolment(tx: Tx, sessionCode: string, courseCode: string, student: Student): AddResult {
  if (!getSession(sessionCode)) return "not-offered";
  const found = classIn(tx, sessionCode, courseCode);
  if (!found) return "not-offered";
  if (found.career !== student.career) return "ineligible";
  const taken = enrolledClassNumbers(tx, sessionCode, student.id);
  if (taken.includes(found.classNumber)) return "already-enrolled";
  if (taken.length >= MAX_COURSES_PER_SESSION) return "limit";
  tx.insert(enrolments).values({ studentId: student.id, classNumber: found.classNumber }).run();
  return "ok";
}

export function enrol(
  sessionCode: string,
  courseCode: string,
  student: Student,
): "ok" | "not-offered" | "ineligible" | "limit" {
  const result = addEnrolment(db, sessionCode, courseCode, student);
  return result === "already-enrolled" ? "ok" : result;
}

// Drop and Switch only change enrolments in sessions that haven't ended.
function sessionOpen(sessionCode: string) {
  const session = getSession(sessionCode);
  return session !== undefined && statusOf(session) !== "Past";
}

export type DropResult = "ok" | "not-enrolled" | "closed";

export function dropCourse(sessionCode: string, courseCode: string, student: Student): DropResult {
  if (!sessionOpen(sessionCode)) return "closed";
  const found = classIn(db, sessionCode, courseCode);
  if (!found) return "not-enrolled";
  const { changes } = db
    .delete(enrolments)
    .where(and(eq(enrolments.studentId, student.id), eq(enrolments.classNumber, found.classNumber)))
    .run();
  return changes > 0 ? "ok" : "not-enrolled";
}

export type SwitchResult = "ok" | "same" | "closed" | "not-enrolled" | Exclude<AddResult, "ok">;

class SwitchRejected extends Error {
  constructor(readonly reason: Exclude<SwitchResult, "ok">) {
    super(reason);
  }
}

// Drop `from` and add `to` in one transaction. The add runs the normal rules
// after the drop (so a student at the limit can still switch); if any rule
// fails, the transaction rolls back and the original enrolment is untouched.
export function switchCourse(sessionCode: string, from: string, to: string, student: Student): SwitchResult {
  if (from === to) return "same";
  if (!sessionOpen(sessionCode)) return "closed";
  try {
    db.transaction((tx) => {
      const original = classIn(tx, sessionCode, from);
      const removed = original
        ? tx
            .delete(enrolments)
            .where(and(eq(enrolments.studentId, student.id), eq(enrolments.classNumber, original.classNumber)))
            .run().changes
        : 0;
      if (removed === 0) throw new SwitchRejected("not-enrolled");
      const added = addEnrolment(tx, sessionCode, to, student);
      if (added !== "ok") throw new SwitchRejected(added);
    });
    return "ok";
  } catch (error) {
    if (error instanceof SwitchRejected) return error.reason;
    throw error;
  }
}
