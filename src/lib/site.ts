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

export const TYPES = {
  study: { label: "study summary", plural: "study summaries" },
  research: { label: "original research", plural: "original research" },
  note: { label: "note", plural: "notes" },
} as const;

export type EntryType = keyof typeof TYPES;

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
