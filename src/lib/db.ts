import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Career, type Course, classes, courseGroups, courses, enrolments, type Session, sessions } from "./schema";
import { seedCatalogue } from "./seed";

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

export function listSessions(): Session[] {
  return db.select().from(sessions).orderBy(asc(sessions.startDate)).all();
}

// The session containing today, else the next one to start.
export function featuredSession(all: Session[], today = canberraToday()): Session | undefined {
  return (
    all.find((s) => statusOf(s, today) === "Current") ?? all.find((s) => statusOf(s, today) === "Upcoming")
  );
}

export function getSession(code: string): Session | undefined {
  return db.select().from(sessions).where(eq(sessions.code, code)).get();
}

function offerings(sessionCode: string): Offering[] {
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
    .leftJoin(enrolments, eq(enrolments.classNumber, classes.classNumber))
    .where(eq(classes.sessionCode, sessionCode))
    .orderBy(asc(courses.code))
    .all()
    .map(({ enrolmentId, ...rest }) => ({ ...rest, enrolled: enrolmentId !== null }));
}

export type SubjectResult = {
  groupName: string;
  eligible: Offering | null;
  // shown muted: the variant this student can't take, when there's reason to mention it
  ineligible: Offering | null;
};

// The student searches for a subject; the system picks the variant their
// career can take. An ineligible variant is only surfaced when the student
// named its code, or when there's no eligible variant at all.
export function searchSubjects(sessionCode: string, query: string, career: Career): SubjectResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = offerings(sessionCode);
  const compact = q.replace(/\s+/g, "");
  const matches = all.filter((o) =>
    [o.code, o.name, o.description, o.groupName].some((field) => field.toLowerCase().includes(q)) ||
    o.code.toLowerCase().includes(compact),
  );

  const results: SubjectResult[] = [];
  for (const groupId of new Set(matches.map((m) => m.groupId))) {
    const variants = all.filter((o) => o.groupId === groupId);
    const eligible = variants.find((o) => o.career === career) ?? null;
    const matchedHere = matches.filter((m) => m.groupId === groupId && m.career !== career);
    const ineligible = eligible
      ? (matchedHere.find((m) => compact.includes(m.code.toLowerCase())) ?? null)
      : (matchedHere[0] ?? null);
    results.push({ groupName: variants[0].groupName, eligible, ineligible });
  }
  return results.sort(
    (a, b) =>
      Number(!a.eligible) - Number(!b.eligible) ||
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

export function getCourseView(sessionCode: string, courseCode: string, career: Career): CourseView | undefined {
  const all = offerings(sessionCode);
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

export function listEnrolments(sessionCode: string): Offering[] {
  return offerings(sessionCode).filter((o) => o.enrolled);
}

export function enrol(
  sessionCode: string,
  courseCode: string,
  career: Career,
): "ok" | "not-offered" | "ineligible" {
  const found = db
    .select({ classNumber: classes.classNumber, career: courses.career })
    .from(classes)
    .innerJoin(courses, eq(classes.courseCode, courses.code))
    .where(and(eq(classes.sessionCode, sessionCode), eq(classes.courseCode, courseCode)))
    .get();
  if (!found) return "not-offered";
  if (found.career !== career) return "ineligible";
  db.insert(enrolments).values({ classNumber: found.classNumber }).onConflictDoNothing().run();
  return "ok";
}
