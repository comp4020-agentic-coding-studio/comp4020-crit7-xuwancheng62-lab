import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

export type Career = "Undergraduate" | "Postgraduate";

export const sessions = sqliteTable("sessions", {
  code: text().primaryKey(),
  name: text().notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
});

// A subject a student wants to study; its courses are the administrative
// variants (e.g. COMP4020 for undergraduates, COMP8020 for postgraduates).
export const courseGroups = sqliteTable("course_groups", {
  id: text().primaryKey(),
  name: text().notNull(),
  summary: text().notNull(),
});

export const courses = sqliteTable("courses", {
  code: text().primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => courseGroups.id),
  career: text().$type<Career>().notNull(),
  eligibility: text().notNull(),
  name: text().notNull(),
  units: int().notNull(),
  summary: text().notNull(),
  description: text().notNull(),
  prerequisites: text().notNull(),
  teachingMode: text("teaching_mode").notNull(),
  assessment: text().notNull(),
});

// classNumber is the administrative identifier: stored, never shown or asked for.
export const classes = sqliteTable("classes", {
  classNumber: int("class_number").primaryKey(),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.code),
  sessionCode: text("session_code")
    .notNull()
    .references(() => sessions.code),
  schedule: text().notNull(),
});

export const enrolments = sqliteTable("enrolments", {
  id: int().primaryKey({ autoIncrement: true }),
  classNumber: int("class_number")
    .notNull()
    .unique()
    .references(() => classes.classNumber),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Session = typeof sessions.$inferSelect;
export type CourseGroup = typeof courseGroups.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Class = typeof classes.$inferSelect;
