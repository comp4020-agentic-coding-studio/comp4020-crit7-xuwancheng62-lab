// Prototype sign-in is a cookie holding the Student ID, set by /api/session;
// /api/profile then records study level and program. Specs go through the
// same two endpoints so the student really exists in the app's database.
export const POSTGRAD_ID = "u8000001";
export const UNDERGRAD_ID = "u4000001";

export const cookieFor = (id: string) => `student=${id}`;
export const POSTGRAD = cookieFor(POSTGRAD_ID);
export const UNDERGRAD = cookieFor(UNDERGRAD_ID);

const post = (baseUrl: string, path: string, body: Record<string, string>, cookie = "") =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl, cookie },
    body: new URLSearchParams(body),
    redirect: "manual",
  });

export const signIn = (baseUrl: string, id: string) => post(baseUrl, "/api/session", { studentId: id });

export const saveProfile = (baseUrl: string, id: string, career: string, program: string) =>
  post(baseUrl, "/api/profile", { career, program }, cookieFor(id));

// Idempotent: signing in again keeps the student, and the profile is re-saved.
export async function signUp(baseUrl: string, id: string, career: string, program: string) {
  await signIn(baseUrl, id);
  await saveProfile(baseUrl, id, career, program);
  return cookieFor(id);
}

export const signUpPostgrad = (baseUrl: string) => signUp(baseUrl, POSTGRAD_ID, "Postgraduate", "mcomp");
export const signUpUndergrad = (baseUrl: string) => signUp(baseUrl, UNDERGRAD_ID, "Undergraduate", "bac");
