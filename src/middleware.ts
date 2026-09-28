import { defineMiddleware } from "astro:middleware";
import { currentStudent } from "./lib/student";

const PUBLIC = ["/sign-in", "/readme", "/api/session"];

export const onRequest = defineMiddleware((context, next) => {
  const student = currentStudent(context.cookies);
  context.locals.student = student;
  const path = context.url.pathname;
  if (student || PUBLIC.some((p) => path === p || path.startsWith(`${p}/`)) || path.startsWith("/_astro/")) {
    return next();
  }
  if (path.startsWith("/api/")) return new Response("Sign in first", { status: 401 });
  const target = path === "/" ? "" : `?next=${encodeURIComponent(path + context.url.search)}`;
  return context.redirect(`/sign-in/${target}`, 303);
});
