import type { APIRoute } from "astro";
import { MAX_COURSES_PER_SESSION, type SwitchResult, switchCourse } from "../../lib/db";

const REFUSED: Record<Exclude<SwitchResult, "ok">, [number, string]> = {
  same: [400, "Choose a different course to switch to"],
  closed: [409, "That session has ended, so its enrolments can't change"],
  "not-enrolled": [409, "You're not enrolled in the course you're switching from"],
  "not-offered": [400, "That course isn't offered this session"],
  ineligible: [403, "Not available at your study level"],
  "already-enrolled": [409, "You're already enrolled in that course"],
  limit: [409, `You can take at most ${MAX_COURSES_PER_SESSION} courses a session`],
};

// Posted from the switch comparison page: session + two course codes. The
// drop and add happen in one transaction (see switchCourse).
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const session = String(form.get("session") ?? "");
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") ?? "");
  const result = switchCourse(session, from, to, locals.student!);
  if (result !== "ok") {
    const [status, message] = REFUSED[result];
    return new Response(message, { status });
  }
  const query = new URLSearchParams({ switched: from, to });
  return redirect(`/sessions/${encodeURIComponent(session)}/?${query}`, 303);
};
