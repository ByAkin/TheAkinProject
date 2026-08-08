#!/usr/bin/env node
/**
 * fetch-news.mjs
 *
 * Reads feeds.json, pulls each RSS/Atom feed, normalizes entries,
 * dedupes, sorts newest-first, and writes news.json at the repo root.
 *
 * No API keys required — all sources are public RSS/Atom feeds.
 * Failures on individual feeds are logged and skipped; the run never
 * hard-fails just because one source is down.
 *
 * Usage: node scripts/fetch-news.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const FEEDS_PATH = new URL("../feeds.json", import.meta.url);
const OUTPUT_PATH = new URL("../news.json", import.meta.url);
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "TheAkinProjectNewsBot/1.0 (+https://byakin.github.io/TheAkinProject/)";

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

async function fetchFeed(url) {
  const { signal, cleanup } = withTimeout(null, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, text/xml, */*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text;
  } finally {
    cleanup();
  }
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(str, max = 160) {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

function firstImageFromHtml(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractImage(item) {
  // Common RSS image locations, checked in order of reliability.
  if (item["media:content"]) {
    const mc = Array.isArray(item["media:content"]) ? item["media:content"][0] : item["media:content"];
    if (mc?.["@_url"]) return mc["@_url"];
  }
  if (item["media:thumbnail"]) {
    const mt = Array.isArray(item["media:thumbnail"]) ? item["media:thumbnail"][0] : item["media:thumbnail"];
    if (mt?.["@_url"]) return mt["@_url"];
  }
  if (item.enclosure?.["@_url"] && /image/.test(item.enclosure["@_type"] || "")) {
    return item.enclosure["@_url"];
  }
  const fromDescription = firstImageFromHtml(item.description || item["content:encoded"]);
  if (fromDescription) return fromDescription;
  return null;
}

function normalizeRssItem(item, sourceName, category) {
  const title = stripHtml(item.title);
  const link =
    typeof item.link === "string"
      ? item.link
      : item.link?.["@_href"] || item.link?.["#text"] || item.guid?.["#text"] || item.guid || null;
  const rawDate = item.pubDate || item["dc:date"] || item.published || item.updated;
  const date = parseDate(rawDate);
  const description = truncate(stripHtml(item.description || item["content:encoded"] || item.summary));
  const image = extractImage(item);

  if (!title || !link) return null;

  return {
    title,
    url: typeof link === "string" ? link : null,
    source: sourceName,
    category,
    publishedAt: date ? date.toISOString() : null,
    description,
    image,
  };
}

function normalizeAtomEntry(entry, sourceName, category) {
  const title = stripHtml(typeof entry.title === "string" ? entry.title : entry.title?.["#text"]);
  let link = null;
  if (Array.isArray(entry.link)) {
    const alt = entry.link.find((l) => l["@_rel"] === "alternate") || entry.link[0];
    link = alt?.["@_href"] || null;
  } else if (entry.link?.["@_href"]) {
    link = entry.link["@_href"];
  }
  const rawDate = entry.published || entry.updated;
  const date = parseDate(rawDate);
  const description = truncate(
    stripHtml(entry.summary?.["#text"] || entry.summary || entry.content?.["#text"] || entry.content)
  );
  const image = extractImage(entry);

  if (!title || !link) return null;

  return {
    title,
    url: link,
    source: sourceName,
    category,
    publishedAt: date ? date.toISOString() : null,
    description,
    image,
  };
}

function sourceNameFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "unknown";
  }
}

async function parseFeed(xmlText, url, category) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });
  const parsed = parser.parse(xmlText);
  const sourceName =
    parsed.rss?.channel?.title || parsed.feed?.title || sourceNameFromUrl(url);

  const items = [];

  if (parsed.rss?.channel?.item) {
    const list = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
    for (const item of list) {
      const normalized = normalizeRssItem(item, stripHtml(sourceName), category);
      if (normalized) items.push(normalized);
    }
  } else if (parsed.feed?.entry) {
    const list = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    for (const entry of list) {
      const normalized = normalizeAtomEntry(entry, stripHtml(sourceName), category);
      if (normalized) items.push(normalized);
    }
  }

  return items;
}

function dedupeArticles(articles) {
  const seen = new Set();
  const result = [];
  for (const article of articles) {
    const key = (article.url || article.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }
  return result;
}

async function main() {
  const config = JSON.parse(await readFile(FEEDS_PATH, "utf-8"));
  const maxPerCategory = config.maxPerCategory ?? 8;
  const maxTotal = config.maxTotal ?? 24;

  const allArticles = [];
  const feedErrors = [];

  for (const [category, urls] of Object.entries(config.categories || {})) {
    const categoryArticles = [];

    for (const url of urls) {
      try {
        const xml = await fetchFeed(url);
        const items = await parseFeed(xml, url, category);
        categoryArticles.push(...items);
        console.log(`OK   [${category}] ${url} -> ${items.length} items`);
      } catch (err) {
        feedErrors.push({ category, url, error: String(err?.message || err) });
        console.warn(`FAIL [${category}] ${url} -> ${err?.message || err}`);
      }
    }

    categoryArticles.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });

    allArticles.push(...categoryArticles.slice(0, maxPerCategory));
  }

  let deduped = dedupeArticles(allArticles);

  deduped.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  deduped = deduped.slice(0, maxTotal);

  const output = {
    generatedAt: new Date().toISOString(),
    articleCount: deduped.length,
    feedErrors,
    articles: deduped,
  };

  // Preserve previous news.json if this run produced zero articles
  // (e.g. total outage) so the site never shows an empty page.
  if (deduped.length === 0) {
    try {
      const existing = JSON.parse(await readFile(OUTPUT_PATH, "utf-8"));
      if (existing?.articles?.length) {
        console.warn("No articles fetched this run — keeping previous news.json");
        existing.feedErrors = feedErrors;
        existing.lastAttemptAt = new Date().toISOString();
        await writeFile(OUTPUT_PATH, JSON.stringify(existing, null, 2));
        return;
      }
    } catch {
      // no existing file, fall through and write the (empty) result
    }
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${deduped.length} articles to news.json (${feedErrors.length} feed errors)`);
}

main().catch((err) => {
  console.error("Fatal error in fetch-news:", err);
  process.exit(1);
});
