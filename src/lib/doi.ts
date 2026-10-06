// DOI autofill. When an entry gives a DOI and no hand-written citation, the paper's details
// are looked up from Crossref while the site builds. A failed lookup never breaks the build:
// the entry simply shows the DOI link without a citation.

export interface DoiInfo {
  doi: string;
  url: string;
  citation?: string;
}

const cache = new Map<string, Promise<DoiInfo>>();

// Accepts "10.1000/xyz", "doi:10.1000/xyz" or a full doi.org address.
export function cleanDoi(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const doi = input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
  return /^10\.\d{4,9}\/\S+$/.test(doi) ? doi : undefined;
}

const initials = (given: string) =>
  given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .join("");

function format(m: any): string | undefined {
  const title = Array.isArray(m?.title) ? m.title[0] : undefined;
  if (typeof title !== "string" || !title.trim()) return undefined;
  const people = (Array.isArray(m.author) ? m.author : [])
    .map((a: any) => (a?.family ? `${a.family}${a.given ? ` ${initials(String(a.given))}` : ""}` : a?.name))
    .filter((s: unknown) => typeof s === "string" && s.trim());
  const authors = people.length > 3 ? `${people.slice(0, 3).join(", ")}, et al.` : people.join(", ");
  const journal = Array.isArray(m["container-title"]) ? m["container-title"][0] : undefined;
  const year = m?.issued?.["date-parts"]?.[0]?.[0] ?? m?.published?.["date-parts"]?.[0]?.[0];
  const clean = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
  return [authors, clean(title), journal ? clean(String(journal)) : "", year ? String(year) : ""]
    .filter(Boolean)
    .map((part) => `${part}.`)
    .join(" ")
    .replace(/\.\.$/, ".")
    .replace(/et al\.\./, "et al.");
}

async function fetchInfo(doi: string): Promise<DoiInfo> {
  const base: DoiInfo = { doi, url: `https://doi.org/${doi}` };
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": "neuralnotes-site/1.0 (https://neuralnotess.com)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return base;
    const json = await res.json();
    return { ...base, citation: format(json?.message) };
  } catch {
    return base;
  }
}

export function lookupDoi(input: string | undefined): Promise<DoiInfo | undefined> {
  const doi = cleanDoi(input);
  if (!doi) return Promise.resolve(undefined);
  const key = doi.toLowerCase();
  if (!cache.has(key)) cache.set(key, fetchInfo(doi));
  return cache.get(key)!;
}
