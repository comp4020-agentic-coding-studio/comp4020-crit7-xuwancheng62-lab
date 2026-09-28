import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import { classes, courseGroups, courses, sessions } from "./schema";

// Illustrative catalogue for the prototype, not authoritative ANU data.
// Upserted on every boot so catalogue edits reach the deployed volume; the
// enrolments table is never touched here.

// Deliberately not in date order: the pages must sort by startDate.
const SESSIONS = [
  { code: "2026-S2", name: "Second Semester 2026", startDate: "2026-07-20", endDate: "2026-10-30", digit: 6 },
  { code: "2025-S1", name: "First Semester 2025", startDate: "2025-02-24", endDate: "2025-05-30", digit: 1 },
  { code: "2027-S1", name: "First Semester 2027", startDate: "2027-02-22", endDate: "2027-05-28", digit: 8 },
  { code: "2026-SU", name: "Summer Session 2026", startDate: "2026-01-05", endDate: "2026-02-13", digit: 3 },
  { code: "2025-S2", name: "Second Semester 2025", startDate: "2025-07-21", endDate: "2025-10-31", digit: 2 },
  { code: "2026-WI", name: "Winter Session 2026", startDate: "2026-06-15", endDate: "2026-07-17", digit: 5 },
  { code: "2026-S1", name: "First Semester 2026", startDate: "2026-02-23", endDate: "2026-05-29", digit: 4 },
  { code: "2027-SU", name: "Summer Session 2027", startDate: "2027-01-04", endDate: "2027-02-12", digit: 7 },
];

const GROUPS = [
  { id: "agentic-coding-studio", name: "Agentic Coding Studio", summary: "Build, direct and evaluate software written with AI coding agents." },
  { id: "algorithms", name: "Algorithms", summary: "Design and analysis of efficient algorithms and data structures." },
  { id: "software-construction", name: "Software Construction", summary: "Building larger programs well: design, testing and teamwork." },
  { id: "structured-programming", name: "Structured Programming", summary: "Object-oriented programming in Java, from classes to data structures." },
  { id: "software-engineering", name: "Software Engineering", summary: "Requirements, process and quality in real software projects." },
  { id: "programming-as-problem-solving", name: "Programming as Problem Solving", summary: "A first course in programming through functional problem solving." },
  { id: "maths-applications-1", name: "Mathematics and Applications 1", summary: "Calculus and linear algebra for science and engineering." },
  { id: "maths-applications-2", name: "Mathematics and Applications 2", summary: "Multivariable calculus, differential equations and more linear algebra." },
  { id: "statistical-techniques", name: "Statistical Techniques", summary: "Practical statistics: data, inference and regression." },
  { id: "data-management", name: "Data Management and Analysis", summary: "Databases, data wrangling and analysis for postgraduate computing." },
  { id: "computing-project", name: "Computing Project", summary: "A semester-long industry or research project in a team." },
];

const UG_ELIGIBILITY = "Available to undergraduate students.";
const PG_ELIGIBILITY = "Available to postgraduate coursework students in computing programs.";

type CourseSeed = {
  code: string;
  id: number;
  groupId: string;
  career: "Undergraduate" | "Postgraduate";
  name: string;
  units: number;
  summary: string;
  description: string;
  prerequisites: string;
  teachingMode: string;
  assessment: string;
  schedule: string;
  sessions: string[];
};

const pg = (base: { description: string }, extra: string) => `${base.description}\n\n${extra}`;

const agentic = {
  groupId: "agentic-coding-studio",
  name: "Agentic Coding Studio",
  units: 6,
  summary: "Build and evaluate software with AI coding agents, one shipped prototype a week.",
  description:
    "A studio course about directing AI coding agents to build real software. Each week you ship a small web prototype in response to a design provocation, and present it at a crit where peers and tutors question both the result and the process behind it.\n\nTopics include prompting and planning, harnesses and project rules, tests as backpressure, full-stack web development with a server and database, and deploying to production. The emphasis throughout is on judgement: knowing what good looks like, grounding the agent in the right context, and catching it when it is wrong.\n\nOn completion you will be able to plan, build, verify and deploy a working application with an agent, and give a clear account of how you directed, grounded and corrected the work.",
  teachingMode: "In person",
  assessment:
    "Weekly crits and reflections — 20%\nAssignment 1: static prototype — 15%\nAssignment 2: interactive prototype — 25%\nAssignment 3: final project — 40%",
  schedule:
    "Lecture · Mon 09:00–11:00 · Kambri Cultural Centre T2\nStudio crit · Mon or Wed 14:00–17:00 · CSIT N114\nDrop-in lab · Fri 11:00–13:00 · CSIT N113",
  sessions: ["2025-S2", "2026-S2"],
};

const algorithms = {
  groupId: "algorithms",
  name: "Algorithms",
  units: 6,
  summary: "Designing efficient algorithms and proving they are correct and fast.",
  description:
    "An in-depth study of the design and analysis of algorithms. You will learn to reason about correctness and running time, and to choose the right technique for a problem rather than the first one that comes to mind.\n\nTopics include asymptotic analysis, divide and conquer, dynamic programming, greedy algorithms, graph algorithms (shortest paths, spanning trees, network flow), amortised analysis, and an introduction to NP-completeness and approximation.\n\nOn completion you will be able to design an algorithm for an unfamiliar problem, prove it correct, analyse its complexity and implement it.",
  teachingMode: "In person",
  assessment:
    "Assignment 1: divide and conquer — 15%\nAssignment 2: dynamic programming and graphs — 15%\nMid-semester exam — 20%\nFinal exam — 50%",
  schedule:
    "Lecture · Tue 12:00–14:00 · Manning Clark Hall\nLecture · Thu 12:00–13:00 · Manning Clark Hall\nTutorial · Wed 15:00–16:00 · Hanna Neumann B109",
  sessions: ["2025-S2", "2026-S2"],
};

const softwareConstruction = {
  groupId: "software-construction",
  name: "Software Construction",
  units: 6,
  summary: "Designing, testing and building larger programs in a team.",
  description:
    "Moves from writing programs to constructing software. You will work in Java and in a team to build an application larger than any one person could comfortably hold in their head.\n\nTopics include software design and design patterns, data structures in practice, unit and integration testing, version control workflows, persistence and parsing, and working to a specification.\n\nOn completion you will be able to design a modular program, test it systematically and deliver it collaboratively.",
  teachingMode: "In person",
  assessment:
    "Individual assignment — 20%\nGroup project — 40%\nFinal exam — 40%",
  schedule:
    "Lecture · Mon 13:00–15:00 · Kambri Cultural Centre T1\nLab · Wed 10:00–12:00 · CSIT N112",
  sessions: ["2025-S1", "2026-S1", "2026-S2", "2027-S1"],
};

const structuredProgramming = {
  groupId: "structured-programming",
  name: "Structured Programming",
  units: 6,
  summary: "Object-oriented programming in Java, from classes to data structures.",
  description:
    "An introduction to structured and object-oriented programming in Java. You will write, test and debug programs of increasing size, and learn how the way you organise code shapes how easy it is to change.\n\nTopics include classes and objects, inheritance and interfaces, recursion, exceptions, collections and generics, basic data structures, and an introduction to complexity.\n\nOn completion you will be able to write a well-structured Java program of moderate size and explain the design decisions behind it.",
  teachingMode: "Hybrid",
  assessment:
    "Weekly labs — 10%\nAssignment 1 — 15%\nGroup assignment — 25%\nFinal exam — 50%",
  schedule:
    "Lecture · Tue 10:00–12:00 · Llewellyn Hall (recorded)\nLab · Thu 13:00–15:00 · CSIT N111",
  sessions: ["2025-S1", "2025-S2", "2026-S1", "2026-S2", "2027-S1"],
};

const softwareEngineering = {
  groupId: "software-engineering",
  name: "Software Engineering",
  units: 6,
  summary: "Requirements, process and quality in real software projects.",
  description:
    "Covers how software is engineered in practice: eliciting requirements, choosing a process, managing risk and assuring quality.\n\nOn completion you will be able to plan and run a small software project and critique the process of a larger one.",
  teachingMode: "In person",
  assessment: "Project reports — 50%\nFinal exam — 50%",
  schedule: "Lecture · Wed 09:00–11:00 · Copland G030\nWorkshop · Fri 10:00–12:00 · CSIT N101",
  sessions: ["2025-S1", "2026-S1", "2027-S1"],
};

const CATALOGUE: CourseSeed[] = [
  { ...agentic, code: "COMP4020", id: 20, career: "Undergraduate", prerequisites: "COMP2100 or COMP2140; and 12 units of 3000-level COMP courses." },
  {
    ...agentic,
    code: "COMP8020",
    id: 21,
    career: "Postgraduate",
    description: pg(agentic, "Postgraduate students complete an additional research-informed critique of their own agentic workflow as part of the final project."),
    prerequisites: "Enrolment in the Master of Computing or a related postgraduate program; COMP6442 or equivalent programming experience.",
  },
  { ...algorithms, code: "COMP3600", id: 30, career: "Undergraduate", prerequisites: "COMP2100 or COMP2600; and MATH1005 or MATH2222." },
  {
    ...algorithms,
    code: "COMP6466",
    id: 31,
    career: "Postgraduate",
    description: pg(algorithms, "Postgraduate students complete an additional assignment on randomised algorithms."),
    prerequisites: "Enrolment in a postgraduate computing program; COMP6442 or equivalent.",
  },
  { ...softwareConstruction, code: "COMP2100", id: 40, career: "Undergraduate", prerequisites: "COMP1110 or COMP1140." },
  {
    ...softwareConstruction,
    code: "COMP6442",
    id: 41,
    career: "Postgraduate",
    description: pg(softwareConstruction, "Postgraduate students take a lead role in the group project and submit an individual design report."),
    prerequisites: "COMP6710, or equivalent programming experience approved by the course convener.",
  },
  { ...structuredProgramming, code: "COMP1110", id: 50, career: "Undergraduate", prerequisites: "COMP1100 or COMP1130." },
  {
    ...structuredProgramming,
    code: "COMP6710",
    id: 51,
    career: "Postgraduate",
    prerequisites: "Enrolment in a postgraduate program. No prior programming experience assumed.",
    sessions: [...structuredProgramming.sessions, "2026-SU", "2027-SU"],
  },
  { ...softwareEngineering, code: "COMP2120", id: 60, career: "Undergraduate", prerequisites: "COMP1110 or COMP1140." },
  { ...softwareEngineering, code: "COMP6120", id: 61, career: "Postgraduate", prerequisites: "Enrolment in a postgraduate computing program." },
  {
    code: "COMP1100",
    id: 10,
    groupId: "programming-as-problem-solving",
    career: "Undergraduate",
    name: "Programming as Problem Solving",
    units: 6,
    summary: "A first course in programming, through functional problem solving in Haskell.",
    description:
      "A first course in programming for students with or without prior experience. You will learn to break problems down and express solutions precisely, using the functional language Haskell.\n\nOn completion you will be able to design, write and test small programs and reason about what they do.",
    prerequisites: "None.",
    teachingMode: "Hybrid",
    assessment: "Labs — 10%\nAssignments — 40%\nFinal exam — 50%",
    schedule: "Lecture · Mon 11:00–13:00 · Llewellyn Hall (recorded)\nLab · Wed 14:00–16:00 · CSIT N111",
    sessions: ["2025-S1", "2025-S2", "2026-SU", "2026-S1", "2026-S2", "2027-S1"],
  },
  {
    code: "MATH1013",
    id: 70,
    groupId: "maths-applications-1",
    career: "Undergraduate",
    name: "Mathematics and Applications 1",
    units: 6,
    summary: "Calculus and linear algebra for science and engineering.",
    description:
      "Introduces the calculus of functions of one variable and linear algebra, with applications across the sciences.\n\nOn completion you will be able to apply differentiation, integration and matrix methods to applied problems.",
    prerequisites: "ACT Specialist Mathematics or NSW Mathematics Extension 1, or equivalent.",
    teachingMode: "In person",
    assessment: "Weekly quizzes — 10%\nAssignments — 20%\nMid-semester exam — 20%\nFinal exam — 50%",
    schedule: "Lecture · Mon, Wed, Fri 10:00–11:00 · Manning Clark Hall\nTutorial · Tue 13:00–14:00 · Hanna Neumann 1.37",
    sessions: ["2025-S1", "2025-S2", "2026-S1", "2026-S2", "2027-S1"],
  },
  {
    code: "MATH1014",
    id: 71,
    groupId: "maths-applications-2",
    career: "Undergraduate",
    name: "Mathematics and Applications 2",
    units: 6,
    summary: "Multivariable calculus, differential equations and more linear algebra.",
    description:
      "Continues MATH1013, extending calculus to functions of several variables and developing the linear algebra needed across science and engineering.\n\nTopics include partial derivatives and multiple integrals, first- and second-order differential equations, vector spaces, eigenvalues and eigenvectors, and an introduction to complex numbers and series.\n\nOn completion you will be able to model applied problems with differential equations and multivariable functions, and solve them with analytic and matrix methods.",
    prerequisites: "MATH1013 or MATH1115.",
    teachingMode: "In person",
    assessment: "Weekly quizzes — 10%\nAssignments — 20%\nMid-semester exam — 20%\nFinal exam — 50%",
    schedule:
      "Lecture · Mon, Wed, Fri 12:00–13:00 · Manning Clark Hall\nTutorial · Thu 11:00–12:00 · Hanna Neumann 1.37",
    sessions: ["2025-S2", "2026-S1", "2026-S2", "2026-WI"],
  },
  {
    code: "STAT1003",
    id: 72,
    groupId: "statistical-techniques",
    career: "Undergraduate",
    name: "Statistical Techniques",
    units: 6,
    summary: "Practical statistics: describing data, inference and regression.",
    description:
      "A practical introduction to statistics for students from any discipline, using R.\n\nOn completion you will be able to summarise data, carry out common hypothesis tests and fit simple regression models.",
    prerequisites: "None.",
    teachingMode: "Online",
    assessment: "Weekly quizzes — 20%\nAssignments — 30%\nFinal exam — 50%",
    schedule: "Lecture · recorded, released Mondays\nOnline tutorial · Thu 18:00–19:00 · Zoom",
    sessions: ["2025-S1", "2025-S2", "2026-S1", "2026-WI", "2026-S2", "2027-S1"],
  },
  {
    code: "COMP6420",
    id: 80,
    groupId: "data-management",
    career: "Postgraduate",
    name: "Data Management and Analysis",
    units: 6,
    summary: "Databases, data wrangling and analysis for postgraduate computing.",
    description:
      "Covers the storage, querying and analysis of data: relational databases and SQL, data cleaning and transformation, and exploratory analysis in Python.\n\nOn completion you will be able to design a database, query it effectively and turn raw data into an analysis.",
    prerequisites: "Enrolment in a postgraduate computing program.",
    teachingMode: "Hybrid",
    assessment: "Labs — 10%\nAssignment 1 — 20%\nAssignment 2 — 30%\nFinal exam — 40%",
    schedule: "Lecture · Tue 18:00–20:00 · CSIT N101 (recorded)\nLab · Thu 18:00–19:00 · CSIT N112",
    sessions: ["2025-S2", "2026-S1", "2026-S2", "2027-S1"],
  },
  {
    code: "COMP8715",
    id: 81,
    groupId: "computing-project",
    career: "Postgraduate",
    name: "Computing Project",
    units: 12,
    summary: "A semester-long industry or research project in a team.",
    description:
      "Work in a team on a project for an industry or research client, from requirements through to delivery, with weekly client and tutor meetings.\n\nOn completion you will be able to deliver a substantial software project to a real stakeholder.",
    prerequisites: "Completion of 48 units of the Master of Computing, including COMP6442.",
    teachingMode: "In person",
    assessment: "Project deliverables — 60%\nTeam audits — 20%\nFinal presentation — 20%",
    schedule: "Team meeting · weekly, arranged with client\nAudit · Fri 14:00–17:00 · CSIT N114 (weeks 3, 6, 10)",
    sessions: ["2025-S1", "2025-S2", "2026-S1", "2026-S2", "2027-S1"],
  },
];

export function seedCatalogue(db: BetterSQLite3Database) {
  const digitOf = new Map(SESSIONS.map((s) => [s.code, s.digit]));
  db.transaction((tx) => {
    for (const { digit: _digit, ...session } of SESSIONS) {
      tx.insert(sessions).values(session).onConflictDoUpdate({ target: sessions.code, set: session }).run();
    }
    for (const group of GROUPS) {
      tx.insert(courseGroups).values(group).onConflictDoUpdate({ target: courseGroups.id, set: group }).run();
    }
    for (const { id: _id, schedule: _schedule, sessions: _sessions, ...course } of CATALOGUE) {
      const row = {
        ...course,
        eligibility: course.career === "Postgraduate" ? PG_ELIGIBILITY : UG_ELIGIBILITY,
      };
      tx.insert(courses).values(row).onConflictDoUpdate({ target: courses.code, set: row }).run();
    }
    for (const course of CATALOGUE) {
      for (const sessionCode of course.sessions) {
        // Stable across deploys so existing enrolments keep pointing at the same class.
        const classNumber = (digitOf.get(sessionCode) ?? 9) * 1000 + course.id;
        const row = { classNumber, courseCode: course.code, sessionCode, schedule: course.schedule };
        tx.insert(classes)
          .values(row)
          .onConflictDoUpdate({ target: classes.classNumber, set: { schedule: sql`excluded.schedule` } })
          .run();
      }
    }
  });
}
