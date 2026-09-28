export const paragraphs = (text: string) => text.split(/\n\s*\n/);

export const lines = (text: string) => text.split("\n").filter(Boolean);

// "Assignment 1 — 20%" → { item: "Assignment 1", weight: "20%" }
export const assessmentItems = (text: string) =>
  lines(text).map((line) => {
    const [item, weight = ""] = line.split(" — ");
    return { item, weight };
  });

// "Lecture · Mon 09:00–11:00 · Kambri" → { kind, when, where }
export const scheduleItems = (text: string) =>
  lines(text).map((line) => {
    const [kind, when = "", where = ""] = line.split(" · ");
    return { kind, when, where };
  });

const dateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });
export const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00`));

export const totalUnits = (items: { units: number }[]) => items.reduce((sum, c) => sum + c.units, 0);
