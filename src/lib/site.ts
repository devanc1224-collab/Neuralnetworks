import { getCollection, type CollectionEntry } from "astro:content";
import raw from "../data/site.json";

export type Entry = CollectionEntry<"entries">;

const text = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() !== "" ? v.trim() : fallback);

// Site settings, edited in the editor under "Site settings". Empty values fall back to safe defaults.
export const site = {
  name: text((raw as any).name, "neural notes"),
  tagline: text((raw as any).tagline, "Studies, experiments, and notes on science."),
  about: text((raw as any).about),
  author: text((raw as any).author),
  bio: text((raw as any).bio),
  contact: (Array.isArray((raw as any).contact) ? (raw as any).contact : [])
    .map((c: any) => ({ label: text(c?.label), url: text(c?.url) }))
    .filter((c: { label: string; url: string }) => c.label && c.url),
};

// Topic verdicts and the glossary are edited in the editor under "Topics" and "Glossary".
import rawTopics from "../data/topics.json";
import rawGlossary from "../data/glossary.json";

export const topicNotes = new Map<string, { verdict: string; updated?: Date }>();
for (const t of Array.isArray((rawTopics as any)?.topics) ? (rawTopics as any).topics : []) {
  const key = slugifyEarly(text(t?.name));
  const verdict = text(t?.verdict);
  if (!key || !verdict) continue;
  const when = t?.updated ? new Date(t.updated) : undefined;
  topicNotes.set(key, { verdict, updated: when && !Number.isNaN(when.getTime()) ? when : undefined });
}

export const glossary: { term: string; definition: string }[] = (
  Array.isArray((rawGlossary as any)?.terms) ? (rawGlossary as any).terms : []
)
  .map((g: any) => ({ term: text(g?.term), definition: text(g?.definition) }))
  .filter((g: { term: string; definition: string }) => g.term && g.definition)
  .sort((a: { term: string }, b: { term: string }) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));

function slugifyEarly(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const topicUrl = (slug: string) => `/topics/${slug}`;

export const TYPES = {
  study: { label: "study summary", plural: "study summaries" },
  research: { label: "original research", plural: "original research" },
  note: { label: "note", plural: "notes" },
} as const;

export type EntryType = keyof typeof TYPES;

// Study designs and the evidence level each one maps to (4 = most a single entry can tell us).
// The level reflects the design only. It is a rough guide, not a judgement of how well a study was run.
export const DESIGNS = {
  meta: { label: "meta-analysis", level: 4 },
  review: { label: "systematic review", level: 4 },
  rct: { label: "randomized trial", level: 3 },
  observational: { label: "observational study", level: 2 },
  case: { label: "case report", level: 1 },
  animal: { label: "animal study", level: 1 },
  cell: { label: "cell study", level: 1 },
  other: { label: "other design", level: 0 },
} as const;

export const LEVELS: Record<number, string> = {
  4: "pooled evidence",
  3: "randomized",
  2: "observational",
  1: "early evidence",
};

export function evidence(e: Entry) {
  const d = e.data.design ? DESIGNS[e.data.design] : undefined;
  return d ? { label: d.label, level: d.level, group: LEVELS[d.level] ?? "" } : undefined;
}

// Entries that share topics with this one, most overlap first, then newest.
export function related(entry: Entry, all: Entry[], max = 3) {
  const mine = new Set(entry.data.topics.map(slugify).filter(Boolean));
  if (!mine.size) return [];
  return all
    .filter((e) => e.id !== entry.id)
    .map((e) => ({ e, shared: e.data.topics.map(slugify).filter((t) => mine.has(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.e.data.date.getTime() - a.e.data.date.getTime())
    .slice(0, max)
    .map((x) => x.e);
}

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// Published entries, newest first.
export async function getEntries(): Promise<Entry[]> {
  const all = await getCollection("entries", ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title));
}

// Topics in use, most common first. Topics are matched without regard to capitalization.
export function topicList(entries: Entry[]) {
  const map = new Map<string, { slug: string; label: string; count: number }>();
  for (const e of entries) {
    for (const t of e.data.topics) {
      const slug = slugify(t);
      if (!slug) continue;
      const cur = map.get(slug);
      if (cur) cur.count++;
      else map.set(slug, { slug, label: t.trim().toLowerCase(), count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const entryUrl = (e: Entry) => `/entries/${e.id}`;
