import { EventEmitter } from "node:events";

// In-process bus for enrolment changes, fanned out to open /api/events
// streams. The app runs on one machine (fly.toml), so in-process is enough.
export type EnrolmentChange = { studentId: string; session: string };

export const bus = new EventEmitter();
bus.setMaxListeners(0);

export const announceEnrolmentChange = (change: EnrolmentChange) => bus.emit("enrolment", change);
