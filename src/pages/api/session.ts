import type { APIRoute } from "astro";
import { findStudent, STUDENT_COOKIE } from "../../lib/student";

// Only same-site paths, so ?next= can't bounce the student to another origin.
const safeNext = (value: FormDataEntryValue | null) => {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
};

// Prototype sign-in: choosing a profile sets a cookie naming it. No passwords.
export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  if (form.get("action") === "sign-out") {
    cookies.delete(STUDENT_COOKIE, { path: "/" });
    return redirect("/sign-in/", 303);
  }
  const student = findStudent(String(form.get("student") ?? ""));
  if (!student) return new Response("Unknown demo profile", { status: 400 });
  cookies.set(STUDENT_COOKIE, student.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  });
  return redirect(safeNext(form.get("next")), 303);
};
