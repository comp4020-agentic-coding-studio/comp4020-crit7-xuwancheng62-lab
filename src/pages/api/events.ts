import type { APIRoute } from "astro";
import { bus, type EnrolmentChange } from "../../lib/events";

// Live enrolment updates over server-sent events. A signed-in student's open
// pages hear when their own enrolments change (Add, Drop or Switch in another
// tab) and refresh; see components/LiveEnrolments.astro. Only the session code
// is sent, never another student's changes. Signed-out visitors (and the
// post-deploy CI probe) get the opening comment and heartbeats, nothing else.
export const GET: APIRoute = ({ locals }) => {
  const studentId = locals.studentId;
  let onChange: (change: EnrolmentChange) => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // bytes immediately, then a periodic comment so proxies don't drop the
      // connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
      onChange = (change) => {
        if (studentId && change.studentId === studentId) {
          controller.enqueue(`data: ${JSON.stringify({ session: change.session })}\n\n`);
        }
      };
      bus.on("enrolment", onChange);
    },
    cancel() {
      clearInterval(heartbeat);
      bus.off("enrolment", onChange);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
