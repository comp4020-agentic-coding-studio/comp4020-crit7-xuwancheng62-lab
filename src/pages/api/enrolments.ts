import type { APIRoute } from "astro";
import { enrol, MAX_COURSES_PER_SESSION } from "../../lib/db";

// The confirm page's form posts session + course code; the class number is
// resolved here, server-side, against the signed-in student's career.
// Post/Redirect/Get, so no client JS is needed. Middleware guarantees a student.
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const session = String(form.get("session") ?? "");
  const course = String(form.get("course") ?? "");
  const result = enrol(session, course, locals.student!);
  if (result === "not-offered") return new Response("Course not offered in this session", { status: 400 });
  if (result === "ineligible") return new Response("Not available for your academic career", { status: 403 });
  if (result === "limit") return new Response(`You're already enrolled in ${MAX_COURSES_PER_SESSION} courses this session`, { status: 409 });
  return redirect(`/sessions/${encodeURIComponent(session)}/?added=${encodeURIComponent(course)}`, 303);
};
