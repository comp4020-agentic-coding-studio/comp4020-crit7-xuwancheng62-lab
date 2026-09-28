# ISIS enrolment, redesigned

A full-stack prototype of ANU course enrolment, rebuilt around what a student
is actually trying to do: find the course they want to study, understand it,
and enrol. The ISIS version asks for administrative detail up front. It wants
a numeric Class Number, it makes you know which course code belongs to your
academic career, and its search results say too little about a course to
decide from. In this version the student picks the subject and the semester,
and the system works out the rest.

**Design principle: students choose what they want to study; the system
handles program eligibility, course variants and administrative details
(course code, offering, class number) automatically, from their student
profile.**

## The flow

Sign in with a Student ID → (first time) set study level and program →
choose semester → search by name, code or topic → course details → Add →
confirm → enrolled.

- **A Student ID is enough to sign in.** The sign-in is simulated: any ID in
  the ANU shape (u and seven digits) works, and a cookie remembers it. The
  first time, the student sets their study level (undergraduate or
  postgraduate) and program; a program has to match the level. The ID,
  program and study level sit in the header, and every search, eligibility
  check and enrolment uses them. Each student has their own enrolments.
- **A profile page.** Shows the Student ID, study level and program with an
  Edit profile action, the student's current and upcoming enrolments, and
  their enrolment history from earlier sessions.
- **Recommended for your program.** Each program names the subjects it
  recommends (a short, rule-based list, not degree rules). Those courses
  carry a Recommended tag, come first in search, and are offered as
  shortcuts on the semester page, always in the student's own variant.
- **At most four courses a session.** Once a student has four, Add gives way
  to a clear message on the semester, search, details and confirm pages, and
  the server refuses a fifth.
- **Sessions in date order.** Every session is listed by its start date with
  a Past, Current or Upcoming label, and the current (or next) semester is
  highlighted in place.
- **Search by what you know.** A search matches course names, codes and
  descriptions. Results carry units, teaching mode and a summary, so they
  help you decide.
- **Details before enrolling.** A search result leads to the course details
  (description, prerequisites, schedule, assessment) and never straight to
  enrolment. Having to leave ISIS to understand a course is the round trip
  this redesign removes.
- **The right variant, automatically.** Some subjects have separate
  undergraduate and postgraduate codes (COMP4020 and COMP8020 are one
  subject, *Agentic Coding Studio*). A postgraduate searching for the subject
  sees COMP8020; an undergraduate sees COMP4020. If a postgraduate types
  COMP4020, the result explains that it isn't available at their study level
  and points to COMP8020. An ineligible course has no Add button, and the
  server refuses it too.
- **Drop and Switch.** Each course in a current or upcoming session has Drop
  and Switch beside it. Drop goes through a confirmation page showing the
  resulting unit total. Switch searches for a replacement with the same
  profile and eligibility rules as Add, shows the two courses side by side
  with the resulting load, and then drops and adds in one database
  transaction: if the new course can't be added, the student keeps the
  original. A switch doesn't change the course count, so it works at the
  four-course limit.
- **No Class Number, anywhere.** The class number is the database key for an
  offering. It is resolved on the server when you confirm and never shown or
  asked for.

## What good looks like here

Good means a student can enrol in the right course without knowing anything
administrative, and can see why when a course isn't for them.

- **Enforced by checks** (`spec/`):
  - pages ask you to sign in first; a new student sets up a profile before
    anything else, and a program must match the study level
  - an enrolment persists across a reload
  - each student sees their own variant and their own enrolments
  - recommendations follow the student's program
  - a fifth course in one session is refused, and the page says why
  - the profile page shows the ID, study level, program and enrolments
  - Drop confirms, shows the new total and persists; Switch replaces a course
    in one transaction and leaves the original in place whenever the add
    fails (ineligible, not offered, already taken)
  - the catalogue importer parses course pages into the stored shape, and
    imported courses are searchable like the rest
  - the server refuses the ineligible variant and saves nothing
  - every page meets the structural and accessibility floor
- **Judgement calls, left to the crit:** whether the flow is clearer than
  ISIS, and whether the eligibility messages are the ones a confused student
  needs.

## What this prototype doesn't do

- no real authentication: no passwords, ANU SSO or OAuth. Typing a Student
  ID stands in for "the system knows who you are", and anyone can type any ID
- eligibility is one simple rule (course career = student career), and
  recommendations are a fixed list per program, not ANU's degree rules
- the only enrolment rule is four courses a session; no class-time choices,
  timetable-clash checks, class capacity or drop deadlines (ended sessions
  just can't be changed)

## The course catalogue

`pnpm catalogue:import` runs a one-time importer
(`scripts/import-anu-catalogue.ts`). It lists 2026 COMP courses from the
public ANU Programs & Courses catalogue, reads each course page (code, title,
units, academic career, description, requisites, indicative assessment, mode
of delivery, and 2026 offerings with class numbers) and writes a normalised
snapshot to `src/lib/catalogue/anu-2026-comp.json`. The app loads that
snapshot into SQLite when it boots; it never fetches from ANU while serving
pages. Only sessions the app models (2026 Summer, First Semester, Winter,
Second Semester) are imported, and ANU publishes timetables separately, so
imported courses show no class times.

A handful of courses are hand-curated in `src/lib/seed.ts` and take priority
over imported ones with the same code: they carry this prototype's topic for
COMP4020/COMP8020 and illustrative timetables. The catalogue is **prototype
data, not authoritative ANU data**: it's a snapshot, and the hand-curated
timetables and assessment are made up.
