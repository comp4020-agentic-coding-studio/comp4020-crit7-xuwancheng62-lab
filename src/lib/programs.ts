import type { Career } from "./schema";

// A deliberately small, rule-based stand-in for degree rules: each program
// names the subjects (course group ids from seed.ts) it recommends. The
// system resolves the right code for the student's career on its own.
export type Program = { id: string; name: string; career: Career; recommends: string[] };

export const PROGRAMS: Program[] = [
  {
    id: "bac",
    name: "Bachelor of Advanced Computing (Honours)",
    career: "Undergraduate",
    recommends: [
      "programming-as-problem-solving",
      "structured-programming",
      "software-construction",
      "algorithms",
      "software-engineering",
      "maths-applications-1",
      "agentic-coding-studio",
    ],
  },
  {
    id: "bcomp",
    name: "Bachelor of Computing",
    career: "Undergraduate",
    recommends: [
      "programming-as-problem-solving",
      "structured-programming",
      "software-construction",
      "software-engineering",
      "algorithms",
    ],
  },
  {
    id: "bsc",
    name: "Bachelor of Science",
    career: "Undergraduate",
    recommends: ["maths-applications-1", "maths-applications-2", "statistical-techniques", "programming-as-problem-solving"],
  },
  {
    id: "mcomp",
    name: "Master of Computing",
    career: "Postgraduate",
    recommends: [
      "structured-programming",
      "software-construction",
      "algorithms",
      "software-engineering",
      "data-management",
      "computing-project",
      "agentic-coding-studio",
    ],
  },
  {
    id: "mmlcv",
    name: "Master of Machine Learning and Computer Vision",
    career: "Postgraduate",
    recommends: ["algorithms", "software-construction", "data-management", "computing-project"],
  },
  {
    id: "msda",
    name: "Master of Statistical Data Analysis",
    career: "Postgraduate",
    recommends: ["data-management"],
  },
];

export const findProgram = (id: string | null | undefined) => PROGRAMS.find((p) => p.id === id);

export const isRecommended = (programId: string, groupId: string) =>
  findProgram(programId)?.recommends.includes(groupId) ?? false;
