import { defineMiddleware } from "astro:middleware";
import { getStudent } from "./lib/db";
import { findProgram } from "./lib/programs";
import { studentIdFromCookie } from "./lib/student";

const PUBLIC = ["/sign-in", "/readme", "/api/session"];
const PROFILE_SETUP = ["/profile/edit", "/api/profile"];

const under = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export const onRequest = defineMiddleware((context, next) => {
  const path = context.url.pathname;
  if (path.startsWith("/_astro/")) return next();

  const id = studentIdFromCookie(context.cookies);
  const record = id ? getStudent(id) : undefined;
  const complete = record?.career && findProgram(record.program)?.career === record.career;
  context.locals.studentId = record?.id;
  context.locals.student = complete ? { id: record.id, career: record.career!, program: record.program! } : undefined;

  if (under(path, PUBLIC)) return next();
  if (!record) {
    if (path.startsWith("/api/")) return new Response("Sign in first", { status: 401 });
    const target = path === "/" ? "" : `?next=${encodeURIComponent(path + context.url.search)}`;
    return context.redirect(`/sign-in/${target}`, 303);
  }
  if (!complete && !under(path, PROFILE_SETUP)) {
    if (path.startsWith("/api/")) return new Response("Set up your profile first", { status: 403 });
    return context.redirect("/profile/edit/", 303);
  }
  return next();
});
