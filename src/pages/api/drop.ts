import type { APIRoute } from "astro";
import { dropCourse } from "../../lib/db";

// Posted from the drop confirmation page: session + course code only.
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const session = String(form.get("session") ?? "");
  const course = String(form.get("course") ?? "");
  const result = dropCourse(session, course, locals.student!);
  if (result === "closed") return new Response("That session has ended, so its enrolments can't change", { status: 409 });
  if (result === "not-enrolled") return new Response("You're not enrolled in that course this session", { status: 409 });
  return redirect(`/sessions/${encodeURIComponent(session)}/?dropped=${encodeURIComponent(course)}`, 303);
};
