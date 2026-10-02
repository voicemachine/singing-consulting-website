// One-time scrape script: pulls content from the live Squarespace site
// (blakebeckemeyer.com) via its JSON API, downloads referenced images,
// converts HTML bodies to Markdown, and writes clean data files + image
// assets into src/. Safe to re-run; it overwrites its own output only.
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const SITE = "https://blakebeckemeyer.com";
const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "src", "_data");
const IMG_DIR = path.join(ROOT, "src", "assets", "images");

const turndown = new TurndownService({ headingStyle: "atx" });

function decodeEntities(str) {
  if (!str) return str;
  // Cheerio's text() decodes HTML entities for us.
  return cheerio.load(`<div>${str}</div>`)("div").text();
}

function slugFromUrlId(urlId) {
  // urlId looks like "2026/7/22/tour-christ-church-cathedral-dublin-yorkminister"
  return urlId.split("/").pop();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

async function fetchAllCollectionItems(collectionPath) {
  let items = [];
  let url = `${SITE}${collectionPath}?format=json`;
  let page = 0;
  while (url) {
    const json = await fetchJson(url);
    const pageItems = [...(json.items || []), ...(json.upcoming || []), ...(json.past || [])];
    items = items.concat(pageItems);
    page++;
    if (json.pagination?.nextPage && json.pagination?.nextPageUrl) {
      const sep = json.pagination.nextPageUrl.includes("?") ? "&" : "?";
      url = `${SITE}${json.pagination.nextPageUrl}${sep}format=json`;
    } else {
      url = null;
    }
    if (page > 20) break; // safety guard
  }
  // de-dupe by id
  const seen = new Set();
  return items.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
}

function cleanBodyHtml(html) {
  if (!html) return "";
  const $$ = cheerio.load(html);
  // Strip squarespace wrapper noise, keep text/images/links
  $$("style, script").remove();
  return $$.root().html() || "";
}

// Extension lookup based on the *actual* HTTP response Content-Type, since
// Squarespace's JSON metadata contentType field is stale/wrong for older
// (pre-CDN-migration) static1.squarespace.com image URLs.
const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

async function downloadImage(url, destDir, destNameNoExt) {
  fs.mkdirSync(destDir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ! image fetch failed (${res.status}): ${url}`);
    return null;
  }
  const realContentType = (res.headers.get("content-type") || "").split(";")[0].trim();
  const ext = MIME_TO_EXT[realContentType] || (url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1] ?? "jpg");
  const destName = `${destNameNoExt}.${ext}`;
  const destPath = path.join(destDir, destName);
  if (fs.existsSync(destPath)) return destName;
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return destName;
}

async function processCollection(name, collectionPath) {
  console.log(`Fetching collection: ${name} (${collectionPath})`);
  const rawItems = await fetchAllCollectionItems(collectionPath);
  console.log(`  -> ${rawItems.length} items`);
  const imgDir = path.join(IMG_DIR, name);
  const out = [];

  for (const item of rawItems) {
    const slug = slugFromUrlId(item.urlId || item.fullUrl.split("/").pop());
    let bodyHtmlClean = cleanBodyHtml(item.body);

    // Download any inline <img> sources referenced in the body and rewrite
    // them to point at local copies, so posts remain fully self-contained.
    if (bodyHtmlClean) {
      const $$ = cheerio.load(bodyHtmlClean);
      const imgEls = $$("img").toArray();
      for (let i = 0; i < imgEls.length; i++) {
        const el = imgEls[i];
        const src = $$(el).attr("src");
        if (!src || !/^https?:\/\//.test(src)) continue;
        const inlineName = await downloadImage(src, imgDir, `${slug}-inline-${i + 1}`);
        if (inlineName) {
          $$(el).attr("src", `/assets/images/${name}/${inlineName}`);
          $$(el).removeAttr("srcset").removeAttr("data-src");
        }
      }
      bodyHtmlClean = $$.root().html() || "";
    }
    const bodyMarkdown = bodyHtmlClean ? turndown.turndown(bodyHtmlClean).trim() : "";

    let localImage = null;
    if (item.assetUrl) {
      const result = await downloadImage(item.assetUrl, imgDir, slug);
      if (result) localImage = `/assets/images/${name}/${result}`;
    }

    out.push({
      id: item.id,
      slug,
      fullUrl: item.fullUrl,
      title: decodeEntities(item.title),
      excerpt: decodeEntities(item.excerpt || ""),
      bodyMarkdown,
      startDate: item.startDate || item.publishOn || null,
      endDate: item.endDate || null,
      location: item.location
        ? {
            title: decodeEntities(item.location.addressTitle || ""),
            line1: decodeEntities(item.location.addressLine1 || ""),
            line2: decodeEntities(item.location.addressLine2 || ""),
            country: decodeEntities(item.location.addressCountry || ""),
          }
        : null,
      tags: item.tags || [],
      categories: item.categories || [],
      image: localImage,
    });
  }

  // sort newest first by startDate (engagements) / publishOn (news)
  out.sort((a, b) => (b.startDate || 0) - (a.startDate || 0));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(out, null, 2)
  );
  console.log(`  -> wrote ${name}.json, downloaded images to ${imgDir}`);
}

await processCollection("engagements", "/engagements-beckemeyer");
await processCollection("news", "/beckemeyer-news");
await processCollection("platform", "/em-power-ing-the-platform");

console.log("Done.");
