import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import type { ImportedCourse } from "../../scripts/import-anu-catalogue";
import snapshot from "./catalogue/anu-2026-comp.json";
import { classes, courseGroups, courses, sessions } from "./schema";

// The catalogue: hand-curated courses below (illustrative timetables and
// assessment), plus 2026 COMP courses imported from ANU Programs & Courses.
// Upserted on every boot so catalogue edits reach the deployed volume; the
// enrolments table is never touched here.

// Deliberately not in date order: the pages must sort by startDate.
const SESSIONS = [
  { code: "2026-S2", name: "Second Semester 2026", startDate: "2026-07-20", endDate: "2026-10-30", digit: 6 },
  { code: "2027-S1", name: "First Semester 2027", startDate: "2027-02-22", endDate: "2027-05-28", digit: 8 },
  { code: "2026-SU", name: "Summer Session 2026", startDate: "2026-01-05", endDate: "2026-02-13", digit: 3 },
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
  { id: "data-management", name: "Data Management, Analysis and Security", summary: "Databases, data wrangling, analysis and security for postgraduate computing." },
  { id: "computing-project", name: "Advanced Computing Team Project", summary: "A supervised TechLauncher team project for an industry or research client, taken across two semesters." },
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
    "A studio course about directing AI coding agents to build real software. Each week you ship a small web prototype in response to a design provocation, and present it at a crit where peers and tutors question both the result and the process behind it.\n\nTopics include prompting and planning, harnesses and project rules, tests as backpressure, full-stack web development with a server and database, and deploying to production. The emphasis throughout is on judgement: knowing what good looks like, grounding the agent in the right context, and catching it when it is wrong.\n\nOn completion you will be able to plan, build, verify and deploy a working application with an agent, and give a clear account of how you directed, grounded and corrected the work.\n\nThis is one topic offered under Advanced Topics in Human-Centred and Creative Computing, ANU's variable-topic course in this area: the topic, and the assessment tied to it, changes each time the course runs.",
  teachingMode: "In person",
  assessment:
    "Weekly crits and reflections — 20%\nAssignment 1: static prototype — 15%\nAssignment 2: interactive prototype — 25%\nAssignment 3: final project — 40%",
  schedule:
    "Lecture · Mon 09:00–11:00 · Kambri Cultural Centre T2\nStudio crit · Mon or Wed 14:00–17:00 · CSIT N114\nDrop-in lab · Fri 11:00–13:00 · CSIT N113",
  sessions: ["2026-S2"],
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
  sessions: ["2026-S2"],
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
  sessions: ["2026-S1", "2026-S2", "2027-S1"],
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
  sessions: ["2026-S1", "2026-S2", "2027-S1"],
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
  sessions: ["2026-S1", "2027-S1"],
};

const CATALOGUE: CourseSeed[] = [
  {
    ...agentic,
    code: "COMP4020",
    id: 20,
    career: "Undergraduate",
    prerequisites: "COMP3900. A permission code from the College of Engineering, Computing & Cybernetics is required to enrol. May be repeated for credit (max 3 times) provided each enrolment covers a different topic.",
  },
  {
    ...agentic,
    code: "COMP8020",
    id: 21,
    career: "Postgraduate",
    description: pg(agentic, "Postgraduate students complete an additional research-informed critique of their own agentic workflow as part of the final project."),
    prerequisites: "COMP6390. A permission code from the College of Engineering, Computing & Cybernetics is required to enrol. May be repeated for credit (max 3 times) provided each enrolment covers a different topic.",
  },
  {
    ...algorithms,
    code: "COMP3600",
    id: 30,
    career: "Undergraduate",
    prerequisites: "24 units of COMP-coded courses; and (6 units of 1000-level MATH, or COMP1600). Incompatible with COMP6466 (co-taught).",
  },
  {
    ...algorithms,
    code: "COMP6466",
    id: 31,
    career: "Postgraduate",
    description: pg(algorithms, "Postgraduate students complete an additional assignment on randomised algorithms."),
    prerequisites: "Enrolment in the Master of Computing or Master of Computing (Advanced); or completion of COMP6710, COMP7710, COMP1110 or COMP1140. Incompatible with COMP3600 (co-taught).",
  },
  {
    ...softwareConstruction,
    code: "COMP2100",
    id: 40,
    career: "Undergraduate",
    prerequisites: "COMP1110 or COMP1140; and 6 units of 1000-level MATH (BSc/BASc students also require COMP1600). Not open to students who have completed COMP6442 (co-taught).",
  },
  {
    ...softwareConstruction,
    code: "COMP6442",
    id: 41,
    career: "Postgraduate",
    description: pg(softwareConstruction, "Postgraduate students take a lead role in the group project and submit an individual design report."),
    prerequisites: "COMP1110, COMP1140, COMP6710 or COMP7710; and a mathematics/logic course (MATH1005, COMP1600, MATH6005 or COMP6260) completed or in progress. Not open to students who have completed COMP2100 (co-taught).",
  },
  {
    ...structuredProgramming,
    code: "COMP1110",
    id: 50,
    career: "Undergraduate",
    prerequisites: "COMP1100, COMP1130 or COMP1730. Incompatible with COMP1140, COMP6710 and COMP7710.",
  },
  {
    ...structuredProgramming,
    code: "COMP6710",
    id: 51,
    career: "Postgraduate",
    prerequisites:
      "No formal prerequisite; incompatible with COMP1110, COMP1140 and COMP7710, and not available to students in the Master of Computing (Advanced). No prior programming experience assumed.",
    sessions: [...structuredProgramming.sessions, "2026-SU", "2027-SU"],
  },
  {
    ...softwareEngineering,
    code: "COMP2120",
    id: 60,
    career: "Undergraduate",
    prerequisites: "COMP2100, completed or in progress. Incompatible with COMP2130, COMP6120 and COMP6311. Co-taught with COMP6120.",
  },
  {
    ...softwareEngineering,
    code: "COMP6120",
    id: 61,
    career: "Postgraduate",
    prerequisites: "COMP6442 or COMP2100, completed or in progress. Incompatible with COMP2120. Co-taught with COMP2120.",
  },
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
    prerequisites: "None; incompatible with COMP1130. Assumed background: mathematics to at least ACT Mathematical Methods or NSW Mathematics Advanced.",
    teachingMode: "Hybrid",
    assessment: "Labs — 10%\nAssignments — 40%\nFinal exam — 50%",
    schedule: "Lecture · Mon 11:00–13:00 · Llewellyn Hall (recorded)\nLab · Wed 14:00–16:00 · CSIT N111",
    sessions: ["2026-SU", "2026-S1", "2026-S2", "2027-S1"],
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
    prerequisites: "No formal prerequisite; recommended background is ACT Specialist Mathematics (Major-Minor) or NSW HSC Mathematics Extension 1. Incompatible with MATH1113 and MATH1115.",
    teachingMode: "In person",
    assessment: "Weekly quizzes — 10%\nAssignments — 20%\nMid-semester exam — 20%\nFinal exam — 50%",
    schedule: "Lecture · Mon, Wed, Fri 10:00–11:00 · Manning Clark Hall\nTutorial · Tue 13:00–14:00 · Hanna Neumann 1.37",
    sessions: ["2026-S1", "2026-S2", "2027-S1"],
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
    prerequisites: "MATH1013, MATH1115 or MATH1113. Incompatible with MATH1116.",
    teachingMode: "In person",
    assessment: "Weekly quizzes — 10%\nAssignments — 20%\nMid-semester exam — 20%\nFinal exam — 50%",
    schedule:
      "Lecture · Mon, Wed, Fri 12:00–13:00 · Manning Clark Hall\nTutorial · Thu 11:00–12:00 · Hanna Neumann 1.37",
    sessions: ["2026-S1", "2026-S2", "2026-WI"],
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
    prerequisites: "None; incompatible with STAT1008.",
    teachingMode: "Online",
    assessment: "Weekly quizzes — 20%\nAssignments — 30%\nFinal exam — 50%",
    schedule: "Lecture · recorded, released Mondays\nOnline tutorial · Thu 18:00–19:00 · Zoom",
    sessions: ["2026-S1", "2026-WI", "2026-S2", "2027-S1"],
  },
  {
    code: "COMP6420",
    id: 80,
    groupId: "data-management",
    career: "Postgraduate",
    name: "Introduction to Data Management, Analysis and Security",
    units: 6,
    summary: "Databases, data wrangling, analysis and security for postgraduate computing.",
    description:
      "Covers the storage, querying and analysis of data: relational databases and SQL, data cleaning and transformation, and exploratory analysis in Python, alongside the security fundamentals data-driven systems rely on, including cryptographic techniques, digital signatures and PKI.\n\nOn completion you will be able to design a database, query it effectively, turn raw data into an analysis and reason about the security of the systems that hold it.",
    prerequisites: "COMP6710, COMP1110 or COMP1140. Incompatible with COMP2420 (co-taught).",
    teachingMode: "Hybrid",
    assessment: "Labs — 10%\nAssignment 1 — 20%\nAssignment 2 — 30%\nFinal exam — 40%",
    schedule: "Lecture · Tue 18:00–20:00 · CSIT N101 (recorded)\nLab · Thu 18:00–19:00 · CSIT N112",
    sessions: ["2026-S1", "2026-S2", "2027-S1"],
  },
  {
    code: "COMP8715",
    id: 81,
    groupId: "computing-project",
    career: "Postgraduate",
    name: "Advanced Computing Team Project",
    units: 12,
    summary: "A supervised, TechLauncher team project for an industry or research client, taken across two semesters.",
    description:
      "An annual capstone course, taken across two consecutive semesters for 12 units total. Delivered under TechLauncher, you work in a small team on a supervised project that deepens your expertise in a computing area, with weekly client and tutor meetings and real-world, multidisciplinary teamwork.\n\nOn completion you will be able to deliver a substantial software project to a real stakeholder and account for your contribution to it.",
    prerequisites:
      "Enrolment in the Master of Computing or Master of Machine Learning and Computer Vision; completion of COMP6442 or COMP2100; and COMP6250, COMP8260 or COMP8280. Students must join an approved TechLauncher project group by the end of week 1. Incompatible with COMP8755, COMP8800 and COMP8830.",
    teachingMode: "In person",
    assessment: "Project deliverables — 60%\nTeam audits — 20%\nFinal presentation — 20%",
    schedule: "Team meeting · weekly, arranged with client\nAudit · Fri 14:00–17:00 · CSIT N114 (weeks 3, 6, 10)",
    sessions: ["2026-S1", "2026-S2", "2027-S1"],
  },
];

// Imported ANU courses (scripts/import-anu-catalogue.ts) fill out the
// catalogue; a hand-curated course above wins over an imported one with the
// same code, keeping its topic, illustrative timetable and class numbers.
function importedCatalogue(curated: CourseSeed[], taken: Set<number>, digitOf: Map<string, number>) {
  const curatedCodes = new Set(curated.map((c) => c.code));
  const groupByName = new Map(curated.map((c) => [c.name.toLowerCase(), c.groupId]));
  const groups = new Map<string, { id: string; name: string; summary: string }>();
  const rows: { course: typeof courses.$inferInsert; classes: (typeof classes.$inferInsert)[] }[] = [];

  for (const c of (snapshot as { courses: ImportedCourse[] }).courses) {
    if (curatedCodes.has(c.code)) continue;
    let groupId = groupByName.get(c.name.toLowerCase());
    if (!groupId) {
      groupId = `anu-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      if (!groups.has(groupId)) groups.set(groupId, { id: groupId, name: c.name, summary: c.summary });
    }
    const offered = c.offerings.filter((o) => digitOf.has(o.session));
    rows.push({
      course: {
        code: c.code,
        groupId,
        career: c.career,
        eligibility: c.career === "Postgraduate" ? PG_ELIGIBILITY : UG_ELIGIBILITY,
        name: c.name,
        units: c.units,
        summary: c.summary,
        description: c.description,
        prerequisites: c.prerequisites,
        teachingMode: c.teachingMode,
        assessment: c.assessment,
      },
      // ANU's own class number where it has one and it's free; otherwise a
      // stable number outside ANU's range. Never shown either way.
      classes: offered.map((o) => {
        const fallback = 1_000_000 + Number(c.code.slice(4)) * 10 + digitOf.get(o.session)!;
        const classNumber = o.classNumber && !taken.has(o.classNumber) ? o.classNumber : fallback;
        taken.add(classNumber);
        return { classNumber, courseCode: c.code, sessionCode: o.session, schedule: "" };
      }),
    });
  }
  return { groups: [...groups.values()], rows };
}

export function seedCatalogue(db: BetterSQLite3Database) {
  const digitOf = new Map(SESSIONS.map((s) => [s.code, s.digit]));
  // Stable across deploys so existing enrolments keep pointing at the same class.
  const curatedClasses = CATALOGUE.flatMap((course) =>
    course.sessions.map((sessionCode) => ({
      classNumber: (digitOf.get(sessionCode) ?? 9) * 1000 + course.id,
      courseCode: course.code,
      sessionCode,
      schedule: course.schedule,
    })),
  );
  const imported = importedCatalogue(CATALOGUE, new Set(curatedClasses.map((c) => c.classNumber)), digitOf);

  db.transaction((tx) => {
    for (const { digit: _digit, ...session } of SESSIONS) {
      tx.insert(sessions).values(session).onConflictDoUpdate({ target: sessions.code, set: session }).run();
    }
    for (const group of [...GROUPS, ...imported.groups]) {
      tx.insert(courseGroups).values(group).onConflictDoUpdate({ target: courseGroups.id, set: group }).run();
    }
    const courseRows = [
      ...CATALOGUE.map(({ id: _id, schedule: _schedule, sessions: _sessions, ...course }) => ({
        ...course,
        eligibility: course.career === "Postgraduate" ? PG_ELIGIBILITY : UG_ELIGIBILITY,
      })),
      ...imported.rows.map((r) => r.course),
    ];
    for (const row of courseRows) {
      tx.insert(courses).values(row).onConflictDoUpdate({ target: courses.code, set: row }).run();
    }
    for (const row of [...curatedClasses, ...imported.rows.flatMap((r) => r.classes)]) {
      tx.insert(classes)
        .values(row)
        .onConflictDoUpdate({
          target: classes.classNumber,
          set: { courseCode: sql`excluded.course_code`, sessionCode: sql`excluded.session_code`, schedule: sql`excluded.schedule` },
        })
        .run();
    }
  });
}
