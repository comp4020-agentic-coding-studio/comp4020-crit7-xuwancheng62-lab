import { describe, expect, it } from "vitest";
import { isArchived } from "../src/lib/sessions";

// Sessions before 2026 stay in the database as enrolment history but are
// never offered for enrolment (see src/lib/db.ts listSessions/getSession).
describe("archived sessions", () => {
  it("archives sessions that start before 2026", () => {
    expect(isArchived({ startDate: "2025-07-21" })).toBe(true);
    expect(isArchived({ startDate: "2025-12-31" })).toBe(true);
  });

  it("keeps 2026 and later open to enrolment pages", () => {
    expect(isArchived({ startDate: "2026-01-05" })).toBe(false);
    expect(isArchived({ startDate: "2027-02-22" })).toBe(false);
  });
});
