import type { APIRoute } from "astro";
import { saveProfile } from "../../lib/db";
import { findProgram } from "../../lib/programs";

// Saves study level + program. The program has to belong to the chosen level,
// since that pairing is what decides course variants.
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const career = String(form.get("career") ?? "");
  const program = findProgram(String(form.get("program") ?? ""));
  if (career !== "Undergraduate" && career !== "Postgraduate") return redirect("/profile/edit/?error=career", 303);
  if (!program) return redirect("/profile/edit/?error=program", 303);
  if (program.career !== career) return redirect("/profile/edit/?error=mismatch", 303);
  const firstTime = !locals.student;
  saveProfile(locals.studentId!, career, program.id);
  return redirect(firstTime ? "/" : "/profile/?saved=1", 303);
};
