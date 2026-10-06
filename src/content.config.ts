import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// The editor can leave fields empty. Every field below tolerates that,
// so one unfinished entry can never stop the site from building.
const blank = (v: unknown) => (v === "" || v === null ? undefined : v);
const strings = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim() !== "") : []),
  z.array(z.string()),
);

const entries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/entries" }),
  schema: z.object({
    title: z.preprocess(blank, z.string().default("Untitled")),
    type: z.preprocess(blank, z.enum(["study", "research", "note"]).catch("note")),
    date: z.preprocess(blank, z.coerce.date().catch(() => new Date())),
    summary: z.preprocess(blank, z.string().default("")),
    topics: strings,
    findings: strings,
    source: z.preprocess(
      (v) => (v && typeof v === "object" ? v : {}),
      z.object({
        citation: z.preprocess(blank, z.string().optional()),
        url: z.preprocess(blank, z.string().optional()),
      }),
    ),
    cover: z.preprocess(blank, z.string().optional()),
    draft: z.preprocess((v) => v === true, z.boolean()),
  }),
});

export const collections = { entries };
