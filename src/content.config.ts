import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// The editor can leave fields empty or type a number where text is expected.
// Every field below tolerates that, so one unfinished entry can never stop the site from building.
const blank = (v: unknown) => (v === "" || v === null ? undefined : v);
const text = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : String(v)), z.string().optional());
const strings = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim() !== "") : []),
  z.array(z.string()),
);
const optionalDate = z.preprocess(blank, z.coerce.date().optional().catch(undefined));
const group = <T extends z.ZodRawShape>(shape: T) =>
  z.preprocess((v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}), z.object(shape));

const entries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/entries" }),
  schema: z.object({
    title: z.preprocess(blank, z.coerce.string().default("Untitled")),
    type: z.preprocess(blank, z.enum(["study", "research", "note"]).catch("note")),
    date: z.preprocess(blank, z.coerce.date().catch(() => new Date())),
    summary: z.preprocess(blank, z.coerce.string().default("")),
    topics: strings,
    findings: strings,

    // trust signals, all optional
    design: z.preprocess(
      blank,
      z.enum(["meta", "review", "rct", "observational", "case", "animal", "cell", "other"]).optional().catch(undefined),
    ),
    sample: text,
    effect: group({ relative: text, absolute: text }),
    funding: text,
    limitations: strings,
    reviewed: optionalDate,
    status: z.preprocess(blank, z.enum(["current", "corrected", "retracted"]).catch("current")),

    source: group({ doi: text, citation: text, url: text }),
    cover: text,
    draft: z.preprocess((v) => v === true, z.boolean()),
  }),
});

export const collections = { entries };
