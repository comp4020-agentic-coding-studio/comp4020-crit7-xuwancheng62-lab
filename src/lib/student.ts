import type { AstroCookies } from "astro";
import type { Career } from "./schema";

// Prototype sign-in: picking a demo profile stands in for "the system knows
// who you are". There are no passwords and nothing here is secret; the cookie
// only records which profile was chosen, so career-based variants resolve.
export type Student = { id: string; name: string; program: string; career: Career };

export const STUDENTS: Student[] = [
  { id: "ug-demo", name: "Alex Nguyen", program: "Bachelor of Advanced Computing (Honours)", career: "Undergraduate" },
  { id: "pg-demo", name: "Sam Patel", program: "Master of Computing", career: "Postgraduate" },
];

export const STUDENT_COOKIE = "student";

export const findStudent = (id: string | undefined): Student | undefined => STUDENTS.find((s) => s.id === id);

export const currentStudent = (cookies: AstroCookies): Student | undefined =>
  findStudent(cookies.get(STUDENT_COOKIE)?.value);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
