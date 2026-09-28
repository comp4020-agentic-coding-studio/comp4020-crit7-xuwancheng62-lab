import type { Career } from "./schema";

// The prototype has no sign-in: one fixed demo student stands in for "the
// system already knows who you are".
export const student: { name: string; program: string; career: Career } = {
  name: "Demo Student",
  program: "Master of Computing",
  career: "Postgraduate",
};
