import type { APIRoute } from "astro";
import { enrol } from "../../lib/db";
import { student } from "../../lib/student";

// The confirm page's form posts session + course code; the class number is
// resolved here, server-side. Post/Redirect/Get, so no client JS is needed.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const session = String(form.get("session") ?? "");
  const course = String(form.get("course") ?? "");
  const result = enrol(session, course, student.career);
  if (result === "not-offered") return new Response("Course not offered in this session", { status: 400 });
  if (result === "ineligible") return new Response("Not available for your academic career", { status: 403 });
  return redirect(`/sessions/${encodeURIComponent(session)}/?added=${encodeURIComponent(course)}`, 303);
};
