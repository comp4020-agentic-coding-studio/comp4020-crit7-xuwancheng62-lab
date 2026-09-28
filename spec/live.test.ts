import axe from "axe-core";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { signUp } from "./auth";

// The public landing page and live enrolment updates. These also mirror the
// post-deploy checks in .github/workflows/checks.yml (a signed-out / answers
// 200, /api/events streams, same-origin form POSTs pass and cross-site ones
// are refused), so a red deploy job shows up here first.
const baseUrl = inject("baseUrl");
const url = (path: string) => new URL(path, baseUrl);

// Own students, so other spec files' enrolments can't reach these streams.
const WATCHER = "u8000077";
const OTHER = "u8000078";
let watcher = "";
let other = "";

const enrol = (course: string, cookie: string) =>
  fetch(url("/api/enrolments"), {
    method: "POST",
    headers: { origin: baseUrl, cookie },
    body: new URLSearchParams({ session: "2026-S2", course }),
    redirect: "manual",
  });

// Opens /api/events and returns everything received within `ms`.
async function listen(cookie: string, ms: number, during?: () => Promise<unknown>) {
  const abort = new AbortController();
  const res = await fetch(url("/api/events"), { headers: { cookie }, signal: abort.signal });
  expect(res.headers.get("content-type")).toContain("text/event-stream");
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let text = "";
  const reading = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += value;
      }
    } catch {
      // aborted
    }
  })();
  // let the stream open before acting
  await new Promise((r) => setTimeout(r, 150));
  await during?.();
  await new Promise((r) => setTimeout(r, ms));
  abort.abort();
  await reading;
  return text;
}

beforeAll(async () => {
  watcher = await signUp(baseUrl, WATCHER, "Postgraduate", "mcomp");
  other = await signUp(baseUrl, OTHER, "Postgraduate", "mcomp");
});

describe("public landing page", () => {
  let doc: Document;
  let dom: JSDOM;

  beforeAll(async () => {
    const res = await fetch(url("/"), { redirect: "manual" });
    expect(res.status).toBe(200);
    dom = new JSDOM(await res.text(), { url: url("/").href, runScripts: "outside-only", pretendToBeVisual: true });
    doc = dom.window.document;
  });

  it("answers a signed-out visitor at / with a page and a way to sign in", () => {
    expect(doc.querySelectorAll("h1").length).toBe(1);
    expect(doc.querySelector('a[href="/sign-in/"]')).toBeTruthy();
  });

  it("meets the accessibility floor", async () => {
    const window = dom.window as unknown as { eval: (source: string) => void; axe: typeof axe };
    window.eval(axe.source);
    const results = await window.axe.run(doc, {
      rules: { "color-contrast": { enabled: false }, "link-in-text-block": { enabled: false } },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("still shows a signed-in student their own home", async () => {
    const html = await (await fetch(url("/"), { headers: { cookie: watcher } })).text();
    expect(html).toContain("Welcome back");
  });

  it("keeps every other page behind sign-in", async () => {
    const res = await fetch(url("/courses/"), { redirect: "manual" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/^\/sign-in\//);
  });

  it("accepts same-origin form posts and refuses cross-site ones", async () => {
    const post = (origin: string) =>
      fetch(url("/"), {
        method: "POST",
        headers: { origin, "content-type": "application/x-www-form-urlencoded" },
        body: "probe=1",
        redirect: "manual",
      });
    expect((await post(baseUrl)).status).not.toBe(403);
    expect((await post("https://cross-site.example.com")).status).toBe(403);
  });
});

describe("live enrolment updates", () => {
  it("opens with bytes straight away, even signed out", async () => {
    expect(await listen("", 100)).toContain(": connected");
  });

  it("tells a student's open pages when their enrolments change", async () => {
    const text = await listen(watcher, 300, () => enrol("COMP8020", watcher));
    expect(text).toContain(`data: {"session":"2026-S2"}`);
  });

  it("says nothing about another student's changes", async () => {
    const text = await listen(watcher, 300, () => enrol("COMP6442", other));
    expect(text).not.toContain("data:");
  });

  it("puts the listener on each page that shows enrolments", async () => {
    for (const path of ["/", "/profile/", "/courses/", "/sessions/2026-S2/", "/sessions/2026-S2/courses/COMP8020/"]) {
      const html = await (await fetch(url(path), { headers: { cookie: watcher } })).text();
      expect(html, path).toContain("data-live-enrolments");
    }
  });
});
