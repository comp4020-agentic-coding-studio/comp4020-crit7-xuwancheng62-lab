import { describe, expect, it } from "vitest";
import { assessmentLine, isoDate, parseCoursePage, summaryOf } from "./import-anu-catalogue.ts";

// A trimmed copy of a real Programs & Courses course page: the same classes,
// ids and nesting the importer reads, none of the surrounding chrome.
const page = (career = "PGRD") => `
<h1 class="intro__degree-title"><span class="intro__degree-title__component">Software Construction</span></h1>
<ul>
  <li class="degree-summary__requirements-units"><span class="degree-summary__requirements-heading">Unit Value</span> 6 units </li>
</ul>
<ul class="degree-summary__codes-column">
  <li class="degree-summary__code"><span class="degree-summary__code-heading">Academic career</span> <span class="degree-summary__code-text">${career}</span></li>
  <li class="degree-summary__code"><span class="degree-summary__code-heading">Mode of delivery</span> <span class="degree-summary__code-text">In Person</span></li>
</ul>
<div class="introduction" id="introduction"><p>This course explores medium-scale software. It builds on prior programming.&nbsp;</p><p>Second paragraph.</p></div>
<h2 id="learning-outcomes">Learning Outcomes</h2>
<h2 id="indicative-assessment">Indicative Assessment</h2>
<ol><li>Assignment(s) (30) [LO 1,2,3]</li><li>Labs and Video Assignments (25) [LO 1,2]</li><li>Exam (45) [LO 1,2,3]</li></ol>
<p>Turnitin text.</p>
<h2 id="workload">Workload</h2>
<h2 id="incompatibility">Requisite and Incompatibility</h2>
<div class="requisite">To enrol you must have completed <a href="/2026/course/COMP6710">COMP6710</a>. Incompatible with <a>COMP2100</a>.</div>
<div class="course-tabs-menu"><div class="course-tab current"><a href="#course-tab-1">2026</a></div><div class="course-tab"><a href="#course-tab-2">2027</a></div></div>
<div id="course-tab-1" class="course-tab-content">
  <h3>First Semester</h3>
  <table class="table-terms"><thead><tr><th>Class number</th></tr></thead>
    <tbody><tr><td>3728</td><td> 23 Feb 2026 </td><td> 02 Mar 2026 </td><td> 31 Mar 2026 </td><td> 29 May 2026 </td><td> In Person </td><td>View</td></tr></tbody></table>
  <h3>Spring Session</h3>
  <table class="table-terms"><tbody><tr><td>9001</td><td> 1 Sep 2026 </td><td></td><td></td><td> 30 Nov 2026 </td><td> Online </td><td></td></tr></tbody></table>
  <h3>Second Semester</h3>
  <table class="table-terms"><tbody><tr><td>8707</td><td> 27 Jul 2026 </td><td></td><td></td><td> 30 Oct 2026 </td><td> In Person </td><td></td></tr></tbody></table>
</div>
<div id="course-tab-2" class="course-tab-content">
  <h3>First Semester</h3>
  <table class="table-terms"><tbody><tr><td>1234</td><td> 22 Feb 2027 </td><td></td><td></td><td> 28 May 2027 </td><td> In Person </td><td></td></tr></tbody></table>
</div>`;

describe("catalogue import: parsing a course page", () => {
  const course = parseCoursePage("COMP6442", page());

  it("reads the core fields", () => {
    expect(course).toMatchObject({
      code: "COMP6442",
      name: "Software Construction",
      units: 6,
      career: "Postgraduate",
      teachingMode: "In person",
    });
  });

  it("keeps the description's paragraphs and derives a one-sentence summary", () => {
    if ("skip" in course) throw new Error("skipped");
    expect(course.description).toBe("This course explores medium-scale software. It builds on prior programming.\n\nSecond paragraph.");
    expect(course.summary).toBe("This course explores medium-scale software.");
  });

  it("normalises assessment and requisites to plain text", () => {
    if ("skip" in course) throw new Error("skipped");
    expect(course.assessment).toBe("Assignment(s) — 30%\nLabs and Video Assignments — 25%\nExam — 45%");
    expect(course.prerequisites).toBe("To enrol you must have completed COMP6710. Incompatible with COMP2100.");
  });

  it("takes this year's offerings in modelled sessions, with class numbers and dates", () => {
    if ("skip" in course) throw new Error("skipped");
    expect(course.offerings).toEqual([
      { session: "2026-S1", classNumber: 3728, startDate: "2026-02-23", endDate: "2026-05-29", teachingMode: "In person" },
      { session: "2026-S2", classNumber: 8707, startDate: "2026-07-27", endDate: "2026-10-30", teachingMode: "In person" },
    ]);
    expect(course.skippedSessions).toEqual(["Spring Session"]);
  });

  it("skips research courses", () => {
    expect(parseCoursePage("COMP8999", page("RSCH"))).toEqual({ code: "COMP8999", skip: "career RSCH" });
  });
});

describe("catalogue import: helpers", () => {
  it("turns ANU dates into ISO dates", () => {
    expect(isoDate(" 5 Jan 2026 ")).toBe("2026-01-05");
    expect(isoDate("TBA")).toBeNull();
  });

  it("formats assessment items as item and weight", () => {
    expect(assessmentLine("Final Exam (50) [LO 1-4]")).toBe("Final Exam — 50%");
    expect(assessmentLine("Participation (null) [LO 1]")).toBe("Participation");
  });

  it("caps long summaries", () => {
    expect(summaryOf(`${"word ".repeat(60)}end.`).length).toBeLessThanOrEqual(180);
  });
});
