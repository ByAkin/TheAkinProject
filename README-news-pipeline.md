# Automated News Pipeline — Setup

This adds a self-updating news feed to your existing `news.html` page.
Your design, CSS, canvas background, and layout are untouched — only
the `.news-grid` content becomes dynamic.

## What was added

```
feeds.json                          ← your editable list of RSS feeds by category
scripts/fetch-news.mjs              ← fetches + parses + dedupes + writes news.json
package.json                        ← declares the one dependency (fast-xml-parser)
.github/workflows/update-news.yml   ← GitHub Action, runs every 30 min
news.html                           ← your original file + one small <script> appended
news.json                           ← generated automatically (do not hand-edit)
```

## How it works

1. Every 30 minutes (and on every push to `feeds.json` or the script),
   GitHub Actions spins up, runs `node scripts/fetch-news.mjs`, which:
   - Fetches every RSS/Atom URL listed in `feeds.json`
   - Parses title, link, publish date, description, and image
   - Skips any feed that fails or times out (logged, not fatal)
   - Dedupes by URL/title, sorts newest-first, caps per category and total
   - Writes the result to `news.json`
2. If `news.json` changed, the workflow commits and pushes it back to
   the repo automatically, using the built-in `GITHUB_TOKEN` — **no
   secrets to create, no API keys involved anywhere.**
3. Your `news.html` fetches `news.json` client-side (same-origin, so
   no CORS issue on GitHub Pages) and renders each article into a
   `.card` element using your exact existing CSS classes.
4. If `news.json` is temporarily unreachable or empty, the page just
   keeps showing the original hardcoded fallback cards — it never
   breaks or goes blank.

## Setup steps

1. Copy these files into your repo (`byakin/TheAkinProject` or wherever
   `news.html` currently lives), preserving the folder structure:
   - `feeds.json`
   - `scripts/fetch-news.mjs`
   - `package.json`
   - `.github/workflows/update-news.yml`
   - Replace your existing `news.html` with the updated version (or
     manually paste the final `<script>` block from
     `news-loader.snippet.html` into your current file, right before
     `</body>`).

2. Commit and push to your default branch (usually `main`).

3. In your repo's **Settings → Actions → General → Workflow permissions**,
   make sure "Read and write permissions" is selected. This lets the
   Action commit `news.json` back to the repo. (This is a repo setting,
   not a secret — nothing to generate or paste in.)

4. **No GitHub Secrets are required.** RSS feeds are public endpoints;
   there's no API key anywhere in this pipeline. If you later swap in
   a provider that requires a key (e.g. NewsAPI.org), add it under
   **Settings → Secrets and variables → Actions → New repository secret**
   and reference it in the workflow as `${{ secrets.YOUR_KEY_NAME }}` —
   never hardcode it in the script or commit it.

5. Trigger the first run manually: go to the **Actions** tab → "Update
   News Feed" → **Run workflow**. Check that `news.json` appears at
   your repo root afterward.

6. Once GitHub Pages redeploys (automatic on push), open `news.html`
   in a browser and confirm the grid populates with live articles.

## Editing categories / feeds later

Open `feeds.json`. Each key under `"categories"` is a tag shown on the
cards (`AI`, `TECH`, `PROGRAMMING`, `STARTUPS`, `BUSINESS`, `SCIENCE`
are pre-filled). Add or remove RSS URLs freely — no code changes
needed. `maxPerCategory` and `maxTotal` control how many articles show
overall. Pushing a change to `feeds.json` also auto-triggers a fresh
fetch immediately (via the `push: paths:` trigger in the workflow).

## Changing the schedule

Edit the `cron` line in `.github/workflows/update-news.yml`. It's
currently `*/30 * * * *` (every 30 minutes). GitHub Actions cron on
public repos is free but can be delayed a few minutes under load —
this is normal and not a bug.

## Cost

Everything here runs on GitHub's free tier: public repos get
unlimited included Actions minutes, and each run takes well under a
minute. RSS feeds are free, public endpoints — no paid API involved.
