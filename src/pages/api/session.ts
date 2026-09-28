import type { APIRoute } from "astro";
import { ensureStudent } from "../../lib/db";
import { parseStudentId, STUDENT_COOKIE } from "../../lib/student";

// Only same-site paths, so ?next= can't bounce the student to another origin.
const safeNext = (value: FormDataEntryValue | null) => {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
};

// Prototype sign-in: a Student ID alone. First use creates the student, who
// then sets up their profile (middleware sends them there).
export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  if (form.get("action") === "sign-out") {
    cookies.delete(STUDENT_COOKIE, { path: "/" });
    return redirect("/sign-in/", 303);
  }
  const next = safeNext(form.get("next"));
  const id = parseStudentId(String(form.get("studentId") ?? ""));
  if (!id) {
    const back = next === "/" ? "" : `&next=${encodeURIComponent(next)}`;
    return redirect(`/sign-in/?error=format${back}`, 303);
  }
  ensureStudent(id);
  cookies.set(STUDENT_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  });
  return redirect(next, 303);
};
