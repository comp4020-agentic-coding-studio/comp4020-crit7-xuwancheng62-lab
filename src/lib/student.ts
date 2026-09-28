import type { AstroCookies } from "astro";
import type { Career } from "./schema";

// Prototype sign-in: a Student ID is all it takes. There are no passwords and
// nothing here is secret; the cookie only records which student is using the
// app, so career-based variants and program recommendations resolve.
export type Student = { id: string; career: Career; program: string };

export const STUDENT_COOKIE = "student";

// ANU-style IDs: "u" and seven digits. The "u" is optional when typed.
export const parseStudentId = (raw: string): string | undefined => {
  const match = raw.trim().toLowerCase().match(/^u?(\d{7})$/);
  return match ? `u${match[1]}` : undefined;
};

export const studentIdFromCookie = (cookies: AstroCookies) => parseStudentId(cookies.get(STUDENT_COOKIE)?.value ?? "");
