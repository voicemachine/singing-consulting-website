# blakebeckemeyer.com

Source for Blake Beckemeyer's website — migrated off Squarespace to a free,
static [Eleventy](https://www.11ty.dev/) site hosted on GitHub Pages.

This repo replaces the Squarespace site with a plain-text, no-CMS,
no-monthly-fee alternative. All public content from the old site (bio,
engagements archive, news, resume, audition recordings, and the Power
Platform & Fabric consulting posts) has been migrated here.

## How content is organized

Everything that changes often lives as **data**, not as hand-written HTML, so
it can be edited directly in GitHub's web editor (click the pencil icon on
any file at github.com) without touching templates:

| Content | Where to edit |
| --- | --- |
| Upcoming/past engagements | [`src/_data/engagements.json`](src/_data/engagements.json) — add a new object to the array |
| News posts | [`src/_data/news.json`](src/_data/news.json) |
| Power Platform & Fabric posts | [`src/_data/platform.json`](src/_data/platform.json) |
| Bio | [`src/bio.md`](src/bio.md) |
| Resume/CV | [`src/resume.md`](src/resume.md) |
| Contact info | [`src/contact.md`](src/contact.md) |
| Listen (Spotify embeds) | [`src/listen.njk`](src/listen.njk) |
| Home page copy | [`src/index.njk`](src/index.njk) |

Each entry in the `*.json` data files looks like this:

```json
{
  "id": "unique-id",
  "slug": "url-friendly-slug",
  "fullUrl": "/engagements-beckemeyer/2026/7/22/some-event",
  "title": "Event Title",
  "excerpt": "",
  "bodyMarkdown": "Markdown text for the full description...",
  "startDate": 1753142400000,
  "endDate": null,
  "location": { "title": "Venue Name", "line1": "", "line2": "City, ST", "country": "" },
  "tags": [],
  "categories": [],
  "image": "/assets/images/engagements/some-event.webp"
}
```

- `startDate`/`endDate` are JavaScript millisecond timestamps. The easiest way
  to get one: run `new Date("2026-07-22").getTime()` in any browser console.
- `fullUrl` controls the page's URL. New entries can use any path you like,
  e.g. `/engagements/my-new-event` — it does not need the old
  `/engagements-beckemeyer/...` prefix (that prefix was only kept for
  existing items, to preserve their original Squarespace URLs for SEO).
- `image` should point at a file in `src/assets/images/<collection>/`. Upload
  images there via the GitHub web UI (drag-and-drop works in the file
  browser), then reference the resulting path.
- Images are optional — omit `image` (or set it to `null`) and the card will
  render without a photo.

Every commit to `main` automatically rebuilds and redeploys the site via
GitHub Actions (see `.github/workflows/deploy.yml`) — no manual build step is
needed when editing on GitHub.com.

## Local development

```bash
npm install
npm run start     # dev server at http://localhost:8080 with live reload
npm run build     # production build to _site/ (also builds Pagefind search index)
```

## Re-running the Squarespace scrape

`scripts/scrape.mjs` was used for the one-time migration: it pulls content
from the live Squarespace site via its `?format=json` API, downloads images
locally, and converts HTML bodies to Markdown. It's safe to re-run
(`npm run scrape`) but will overwrite the `_data/*.json` files, so only do
this before the Squarespace subscription is cancelled and only if you want to
re-sync (e.g., you added something on Squarespace you forgot to port over
here first).

## Deploying / DNS cutover

1. This repo deploys to GitHub Pages automatically on every push to `main`.
2. In the repo's **Settings → Pages**, set the source to "GitHub Actions"
   (already configured by the workflow) and confirm the custom domain shows
   `blakebeckemeyer.com` (from the committed `src/CNAME` file).
3. At your domain registrar (wherever `blakebeckemeyer.com` is currently
   managed — check Squarespace Domains or wherever DNS is hosted), point the
   domain at GitHub Pages:
   - **Apex domain (`blakebeckemeyer.com`)**: four `A` records to
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`.
   - **`www` subdomain**: a `CNAME` record to `voicemachine.github.io`.
4. Wait for DNS to propagate (can take a few minutes to 48 hours), then
   enable "Enforce HTTPS" in the Pages settings once GitHub shows the
   certificate as issued.
5. Only after confirming the new site is live and correct should you cancel
   the Squarespace subscription.

## Known gaps from the migration

- **Partner Organizations**: the original page's link to "Tonos del Sur" was
  already broken on the live Squarespace site (pointed at a stale URL on a
  collaborator's site). It's been fixed here to point at the current page.
- Content ownership/copyright for embedded recordings (Spotify, YouTube)
  remains with their respective rights holders; only embed links were
  migrated, not the media itself.
