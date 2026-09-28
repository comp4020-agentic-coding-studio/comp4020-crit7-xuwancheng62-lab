# Process overview

## What I built

A redesign of ANU's ISIS enrolment flow as a full-stack app: a student picks a
semester, finds a course by name, code or topic (or browses the catalogue),
reads its details and enrols, without ever seeing a Class Number.

## How I got here

I started from the real ISIS flow, not the agent. Sessions weren't in date
order, and "Add Class" asks for a numeric Class Number that students don't
know, so they leave ISIS for Programs & Courses and come back. I reframed the
brief from "improve the interface" to "enrol around what the student already
knows": choose semester → search or browse → understand the course → add →
confirm.

I had the spec tests written first, persistence across a reload and eligibility
([`a8e49ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/a8e49ea)),
then Claude Code modelled subjects, per-career variants and offerings, keeping
the Class Number server-side
([`d7f6a2c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/d7f6a2c)).
When the plan let students add straight from search results, I pushed back:
understanding the course is the point, so every result goes through details
first ([`2c411eb`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/2c411eb)).

Rather than list COMP4020 and COMP8020 and make students choose, a profile
(study level and program) resolves the right variant and drives
recommendations: first two demo profiles
([`8f67108`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/8f67108)),
then Student ID sign-in with a four-course limit, history, Drop and Switch
([`808bf39`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/808bf39)).
I imported the 2026 COMP courses from Programs & Courses
([`abf098c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/abf098c))
and, because search assumes you know what you want, added a browsable catalogue
that shares one query with search
([`9ff4964`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/9ff4964)).
Last, I reworked the layout after anu.edu.au itself, with the ANU logo, so it
reads as part of ANU's web
([`e210be9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-xuwancheng62-lab/commit/e210be9)).

## How I knew it was right

The spec suite drives the built server: persistence, per-student variants, the
four-course limit, Switch rolling back when the add fails, catalogue filters,
no Class Number in any page, and an accessibility floor. Whether the flow beats
ISIS is for the crit to judge.
