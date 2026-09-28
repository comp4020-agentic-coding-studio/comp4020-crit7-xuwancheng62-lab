# ISIS enrolment, redesigned

A full-stack prototype of ANU course enrolment, rebuilt around what a student
is actually trying to do: find the course they want to study, understand it,
and enrol. The ISIS version asks for administrative detail up front. It wants
a numeric Class Number, it makes you know which course code belongs to your
academic career, and its search results say too little about a course to
decide from. In this version the student picks the subject and the semester,
and the system works out the rest.

**Design principle: the student chooses what they want to study; the system
resolves the correct course code, offering and class number from their
student profile.**

## The flow

Sign in as a demo student → choose semester → search by name, code or
topic → course details → Add → confirm → enrolled.

- **Sign in establishes who you are.** The sign-in is simulated: you pick one
  of two demo profiles (an undergraduate, or a postgraduate in the Master of
  Computing), and a cookie remembers the choice. The profile's name, program
  and academic career sit in the header, and every search, eligibility check
  and enrolment uses it. Each profile has its own enrolments.
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
  subject, *Agentic Coding Studio*). Signed in as the postgraduate, searching
  for the subject shows COMP8020; signed in as the undergraduate, it shows
  COMP4020. If the postgraduate types COMP4020, the result explains that it
  isn't available for their academic career and points to COMP8020. An ineligible course has no Add
  button, and the server refuses it too.
- **No Class Number, anywhere.** The class number is the database key for an
  offering. It is resolved on the server when you confirm and never shown or
  asked for.

## What good looks like here

Good means a student can enrol in the right course without knowing anything
administrative, and can see why when a course isn't for them.

- **Enforced by checks** (`spec/`):
  - pages ask you to sign in first, and the chosen profile is remembered
  - an enrolment persists across a reload
  - each profile sees its own variant and its own enrolments
  - the server refuses the ineligible variant and saves nothing
  - every page meets the structural and accessibility floor
- **Judgement calls, left to the crit:** whether the flow is clearer than
  ISIS, and whether the eligibility messages are the ones a confused student
  needs.

## What this prototype doesn't do

- no real authentication: no passwords, ANU SSO or OAuth. Choosing a demo
  profile stands in for "the system knows who you are"
- eligibility is one simple rule (course career = student career), not ANU's
  degree rules
- no dropping or swapping courses, class-time choices, timetable-clash
  checks or enrolment caps

The course catalogue (sessions, descriptions, prerequisites, schedules,
assessment) is **illustrative prototype data, not authoritative ANU data**.
