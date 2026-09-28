// The routes the invariants run against. When you add a page, add its route
// here, or the invariants stop covering it.
export const ROUTES = [
  "/",
  "/sign-in/",
  "/profile/",
  "/profile/edit/",
  "/readme/",
  "/courses/",
  "/courses/?scope=all&session=2026-S2",
  "/courses/?q=zzzz-no-match",
  "/sessions/2026-S2/",
  "/sessions/2026-S2/search/",
  "/sessions/2026-S2/search/?q=agentic",
  "/sessions/2026-S2/search/?q=COMP4020",
  "/sessions/2026-S2/courses/COMP8020/",
  "/sessions/2026-S2/courses/COMP4020/",
  "/sessions/2026-S2/courses/COMP8020/confirm/",
  "/sessions/2026-S2/courses/COMP2310/",
  "/sessions/2026-S2/courses/COMP8020/drop/",
  "/sessions/2026-S2/courses/COMP8020/switch/",
  "/sessions/2026-S2/courses/COMP8020/switch/?q=software",
  "/sessions/2026-S2/courses/COMP8020/switch/COMP6442/",
];
