import type { Session } from "./schema";

// Enrolment opens with 2026. Earlier sessions (2025 rows kept on the deployed
// volume) are archived: never offered for enrolment, only shown as history
// on the student's profile.
export const ENROLMENT_FROM = "2026-01-01";

export const isArchived = (session: Pick<Session, "startDate">) => session.startDate < ENROLMENT_FROM;
