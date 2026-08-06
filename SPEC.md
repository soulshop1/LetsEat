# Let's Eat! — Product Specification

A simple, self-hosted recipe manager inspired by Recipe Keeper's clean, approachable
experience — deliberately smaller in scope, built for one person, running on a home
server, used mostly from a phone.

> **Status: APPROVED by owner on 2026-08-06. Implementation in progress.**

Decisions in this document come from the discovery interview (2026-08-06). Items the
interview did not settle are listed in §14 with the default I have assumed.

---

## 1. Product vision

Let's Eat! is a single-user, self-hosted recipe library. It does one thing well: capture
recipes from anywhere (typed in, pasted from a website URL, migrated from Recipe
Keeper — later, photographed or pulled from Instagram/YouTube), then make them fast to
find and pleasant to cook from on a phone in the kitchen.

It is **not** a meal planner, a shopping-list app, a social network, or a nutrition
tracker. Those are either roadmap items or permanently out of scope. The whole app
ships as one Docker container with one data folder; backup is copying that folder.

Guiding principles:

- **Phone-first.** Every screen is designed at mobile width first; desktop is a wider
  arrangement of the same pieces.
- **Owner's data, owner's hardware.** SQLite + files on one volume, full export at any
  time, no external calls except AI-assisted imports the owner explicitly triggers.
- **Simpler than Recipe Keeper.** When in doubt, leave a feature out.

## 2. Feature comparison vs Recipe Keeper

| Recipe Keeper feature | Decision | Notes |
|---|---|---|
| Recipe create/edit (structured form) | **Include** | Core. Paste-friendly multiline ingredients/steps. |
| Categories, courses, collections | **Simplify** | One flat **tag** system + one **course** field. No separate collections. |
| Cuisines | **Simplify** | Just a tag (e.g. `thai`), not a dedicated field. |
| Photos | **Simplify** | Multiple photos per recipe, first is cover. No arbitrary attachments in v1. |
| Serving-size scaling | **Include** | Client-side scaling of ingredient quantities. |
| Ratings, favorites | **Include** | 0–5 stars, favorite flag. |
| Personal notes | **Include** | Free-text notes field on each recipe. |
| Cooking history / "I cooked this" | **Simplify** | One-tap "Cooked today" log with date list. No streaks/stats. |
| Nutrition information | **Exclude** | Owner decision: no nutrition anywhere, permanently. |
| Recipe versioning | **Exclude** | Single current version; notes field covers tweaks. |
| Duplicate detection | **Defer** | Title-similarity warning on import, post-v1. |
| Import from website URL | **Include** | v1. schema.org/Recipe JSON-LD first, heuristics fallback, always lands in review screen. |
| Import from Recipe Keeper export | **Include** | v1. One-time migration from Recipe Keeper's export file. |
| Import from photo / PDF / scan (OCR) | **Defer to v1.1** | Via AI API (owner's Anthropic key). |
| Import from Instagram / YouTube links | **Defer to v1.1** | Via AI API on caption/transcript. Owner-added requirement, not a Recipe Keeper feature. |
| Browser extension / share sheet | **Simplify** | PWA share-target so the phone's share sheet can send URLs into the importer (v1.1, with social import). No browser extension. |
| Full-text search | **Include** | SQLite FTS5 over title, ingredients, steps, notes, tags. |
| Filters (tag, course, rating, time, favorite) | **Include** | Combinable with search. |
| Pantry-based suggestions / pantry inventory | **Exclude** | Out of scope for a simple app. |
| Saved searches | **Exclude** | Filters are fast enough at this scale. |
| Recently viewed / recently added | **Include** | Simple sort options + small "recent" row on home. |
| Meal planning calendar | **Defer (v2)** | Explicitly out of v1. |
| Shopping lists | **Defer (v2)** | Explicitly out of v1. |
| Multi-user, sharing, public links | **Exclude** | Single user by decision. Printable page covers "share with a friend". |
| Print recipe | **Include** | Clean print stylesheet. |
| Cookbook/PDF generation | **Defer** | Post-v1 nice-to-have. |
| Export | **Include** | Full-library export: JSON + photos in a zip. |
| Sync across devices | **Include (differently)** | It's a web app — any browser on the LAN sees the same data. No sync engine needed. |
| Cook mode | **Include** | Owner-selected: large-type step view, screen wake lock. |

## 3. Version-1 feature list

1. Recipe CRUD with structured form (title, description, servings, prep/cook time,
   course, tags, ingredients, steps, notes, source URL/name)
2. Photo upload (multiple per recipe, cover photo, server-side resize)
3. Photo-grid browse with sidebar/drawer (courses, tags, favorites), sort options
4. Full-text search + combinable filters (tag, course, rating, max total time, favorites)
5. Recipe detail view: two-panel (ingredients | steps) on wide screens, stacked on
   phones; serving-size scaler; star rating; favorite toggle; "Cooked today" button
   with history list
6. Cook mode: full-screen steps, large type, screen wake lock, ingredient peek
7. Import from URL with review/edit screen before saving
8. Import from Recipe Keeper export file (bulk, with per-recipe error report)
9. Full-library export (zip of JSON + photos)
10. Single-password login, session cookie, rate-limited
11. Installable PWA (manifest + icon; app-shell caching only, no offline data in v1)
12. Docker Compose deployment, single container, single `/data` volume, health endpoint

## 4. Future roadmap

- **v1.1 — AI imports:** photo/PDF/scan import and Instagram/YouTube link import via
  owner-supplied Anthropic API key; PWA share-target so the share sheet feeds the
  importer; duplicate-title warning on import.
- **v1.2 — Kitchen polish:** offline caching of recently viewed recipes; in-step
  timers.
- **v2 — Planning:** weekly meal planner and shopping-list generation with ingredient
  consolidation (re-interview before building; deliberately excluded from v1).
- **Later / maybe:** unit conversion (metric ⇄ US) in the scaler, cookbook PDF
  export, Litestream off-site DB replication, multi-user. Nutrition is excluded
  permanently by owner decision.

## 5. Key user journeys

1. **Save a recipe from the web (phone):** open Let's Eat! → "+" → "From URL" → paste link
   → importer fetches and parses → review screen shows extracted fields with photo →
   fix anything → Save → recipe detail. Target: under 30 seconds for a well-marked-up
   site.
2. **Cook from a recipe (phone in kitchen):** search or browse → recipe detail → set
   servings to 2× → "Cook" → screen stays awake, big steps, swipe/tap through, peek at
   ingredients any time → done → "Cooked today".
3. **Migrate from Recipe Keeper (one-time, desktop):** Settings → Import → upload
   Recipe Keeper export file → progress + per-recipe results (imported / needs review /
   failed) → browse library.
4. **Find "that quick weeknight thing":** home → filter course = Dinner, max time =
   30 min, sort by rating → grid of candidates → open one.
5. **Enter grandma's recipe by hand:** "+" → "New recipe" → type/paste ingredients
   (one per line) and steps (one per paragraph) → add photo from camera roll → Save.
6. **Back up everything:** Settings → "Export library" → downloads one zip. Separately,
   the server admin copies `/data` (or snapshots the volume) on a schedule.

## 6. Information architecture

- **Recipes** are the only first-class content object.
- **Tags** are flat, free-form, user-created (cuisines live here: `thai`, `baking`).
- **Course** is a single-select from a fixed editable list (Breakfast, Lunch, Dinner,
  Dessert, Snack, Side, Drink — editable in Settings).
- **Favorites** and **rating** are recipe attributes, not containers.
- **Cook log** entries hang off a recipe (date, optional note).
- **Photos** hang off a recipe, ordered; first = cover.
- Browsing = one grid, shaped by (search text × filters × sort). The sidebar is a
  filter shortcut, not separate pages — there is exactly one way to see the library.

## 7. Page and navigation map

```
/login
/                      Home: search bar, filter chips, sidebar/drawer, recipe grid
/recipes/new           Entry form (also target of edit)
/recipes/:id           Detail: photos, meta, scaler, ingredients | steps, notes,
                       cook log, actions (edit, cook, print, delete)
/recipes/:id/edit
/recipes/:id/cook      Cook mode (full-screen)
/import                Chooser: From URL | From Recipe Keeper file  (+AI options in v1.1)
/import/review         Parsed-recipe review/edit before save
/settings              Password, courses list, export library, import, (v1.1: API key)
```

Primary nav (mobile): bottom bar — Home, Add (+), Settings. Everything else is reached
from the grid or a recipe. Desktop: same pages, persistent sidebar, two-panel detail.

## 8. Data model

SQLite. `id` = ULID strings. Timestamps ISO-8601 UTC.

```
recipes
  id PK, title NOT NULL, description, course_id FK→courses NULL,
  servings REAL NULL, servings_unit TEXT ("servings"|"makes N cookies"…),
  prep_min INT NULL, cook_min INT NULL, total_min INT (generated or explicit),
  rating INT 0–5 DEFAULT 0, is_favorite BOOL DEFAULT 0,
  notes TEXT, source_name TEXT, source_url TEXT,
  created_at, updated_at

ingredients            -- ordered lines, parsed best-effort
  id PK, recipe_id FK, position INT,
  raw_text NOT NULL,             -- always preserved verbatim
  qty REAL NULL, unit TEXT NULL, item TEXT NULL,  -- parsed parts for scaling
  is_heading BOOL DEFAULT 0      -- "For the sauce:" section headers

steps
  id PK, recipe_id FK, position INT, body TEXT NOT NULL,
  is_heading BOOL DEFAULT 0

photos
  id PK, recipe_id FK, position INT, filename TEXT, width INT, height INT,
  created_at                     -- files live in /data/photos/{recipe_id}/

tags        id PK, name UNIQUE (case-insensitive)
recipe_tags recipe_id FK, tag_id FK, PK(recipe_id, tag_id)

courses     id PK, name UNIQUE, position INT

cook_log    id PK, recipe_id FK, cooked_on DATE, note TEXT NULL

settings    key PK, value       -- password hash, session secret, course defaults…

recipes_fts (FTS5, external content)
  title, description, notes, ingredients_text, steps_text, tags_text
  -- maintained by triggers on the source tables
```

Scaling model: the scaler multiplies `qty` where parsed and falls back to showing
`raw_text` unchanged (with a subtle "not scalable" mark) where parsing failed. Raw
text is never destroyed by parsing.

## 9. Self-hosted architecture

```
[Phone / laptop browser on LAN]
        │ HTTP (LAN)  — HTTPS via reverse proxy is optional and out of scope
        ▼
┌─────────────────────────────── Docker host ───────────────────────────────┐
│  lets-eat container (one process)                                            │
│   • Web app: server-rendered pages + API, session auth                    │
│   • Importer: URL fetcher/parser, Recipe Keeper file parser               │
│   • Image pipeline: resize/strip-EXIF on upload (sharp)                   │
│   • SQLite (WAL mode) via better-sqlite3                                  │
│   └── volume: /data                                                       │
│         /data/letseat.db (+ -wal/-shm)                                    │
│         /data/photos/…                                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

- One container, one volume, no external services in v1. v1.1 adds outbound HTTPS to
  the Anthropic API only when an AI import runs.
- `GET /healthz` for container health checks.
- URL import fetches the target page server-side with a size cap, timeout, and
  redirect limit, and refuses private-network targets (SSRF guard).

## 10. Technology stack and tradeoffs

**Recommended:**

| Layer | Choice | Why |
|---|---|---|
| Framework | **SvelteKit (Node 22, TypeScript)** | One codebase for pages + API; server-rendered with light client JS — right weight for a phone-first CRUD app; small bundles help kitchen phones. |
| DB access | **better-sqlite3 + Drizzle ORM** | Synchronous SQLite is simple and fast at this scale; Drizzle gives typed schema + migrations. |
| Search | **SQLite FTS5** | No extra service; excellent for ≤ tens of thousands of recipes. |
| Styling | **Tailwind CSS** | Fast to keep a small design system consistent, incl. dark mode + print styles. |
| Images | **sharp** | Resize to display sizes, strip EXIF (GPS!) on upload. |
| URL parsing | JSON-LD schema.org/Recipe extractor + microdata/heuristic fallback | Covers the large majority of recipe sites without per-site scrapers. |
| Auth | Argon2id password hash, HTTP-only session cookie, login rate limit | Right-sized for single-user LAN. |
| Deploy | Docker multi-stage build → distroless/alpine, Compose file, `/data` volume | Matches decision. |
| Tests | Vitest (unit: ingredient parser, importers) + Playwright (a few core flows) | Parsers are where the bugs will live. |

**Considered and rejected:**

- **Next.js/React** — heavier client runtime and more moving parts than this app
  needs; fine choice, just not the simplest.
- **Go + HTMX** — smallest runtime and a great self-hosting story, but the review
  screen, scaler, and cook mode want real client-side interactivity; also weaker
  library support for schema.org extraction.
- **Postgres** — capability we don't need at single-user scale; costs a second
  container and makes backup harder than "copy one folder."
- **Meilisearch/Typesense** — better fuzzy search than FTS5, but another service to
  run; FTS5 is enough.

## 11. Security, privacy, backup, migration

- **Threat model:** LAN-only, single user. Protect against nosy guests on the Wi-Fi
  and drive-by scanners — not nation-states.
- **Auth:** single password (set on first run), Argon2id-hashed; HTTP-only SameSite
  cookie; login rate-limited (5 tries → 15-min backoff); all routes except `/login`
  and `/healthz` require a session.
- **If ever internet-exposed** (not the plan): put a reverse proxy with HTTPS in
  front; the app must never assume it, but must not break behind one
  (`X-Forwarded-*` respected).
- **SSRF guard** on the URL importer (blocks localhost/RFC-1918/link-local targets,
  caps response size, follows ≤ 3 redirects).
- **Uploads:** images re-encoded server-side (neutralizes malformed files), EXIF
  stripped, size-capped.
- **Privacy:** zero telemetry, zero external calls in v1. v1.1 AI imports send only
  the specific photo/caption/transcript to Anthropic, only on explicit user action,
  clearly labeled in the UI. API key stored in the settings table, never logged.
- **Backup:** everything lives in `/data`. Documented procedure: stop-free backup via
  `sqlite3 .backup` + rsync of photos, or snapshot the volume; plus in-app full
  export zip (JSON + photos) as a portable, restore-tested format. Restore = put
  `/data` back (or import the zip into a fresh install).
- **Migration in:** Recipe Keeper export file. **Migration out:** the export zip's
  JSON is documented and stable — no lock-in.

## 12. Phased implementation plan

- **Phase 0 — Skeleton (small):** repo scaffold, Docker/Compose, `/data` volume,
  DB schema + migrations, auth, health check, CI (lint + tests).
- **Phase 1 — Core library:** recipe CRUD form, photo upload pipeline, detail view
  with scaler/rating/favorite/cook-log, grid + sidebar + FTS5 search + filters,
  print stylesheet. *App is daily-usable at the end of this phase.*
- **Phase 2 — Import/export:** URL importer + review screen, Recipe Keeper migration
  with per-recipe report, full-library export zip. Parser unit-test suite.
- **Phase 3 — Kitchen & polish:** cook mode with wake lock, PWA manifest/install,
  dark mode, accessibility pass, backup/restore docs. **← v1 ships here.**
- **Phase 4 (v1.1) — AI imports:** settings for API key, photo/PDF import, Instagram/
  YouTube import, share-target, duplicate warning.

Each phase lands as reviewable PRs on the feature branch; Phase N+1 doesn't start
until Phase N works end-to-end.

## 13. Acceptance criteria (v1)

**Recipe CRUD**
- Create with only a title succeeds; all other fields optional.
- Ingredients paste as one-per-line and round-trip verbatim; `# Heading` lines become
  section headers; steps paste as one-per-paragraph.
- Edit preserves photo order and cook history. Delete asks for confirmation and
  removes photos from disk.

**Photos**
- JPEG/PNG/WebP/HEIC up to 20 MB accepted from camera or gallery; stored re-encoded,
  EXIF-stripped, with cover + thumbnail sizes; grid thumbnails ≤ ~50 KB.

**Browse / search / filter**
- Search returns matches across title, ingredients, steps, notes, tags in < 200 ms at
  1,000 recipes; filters and search combine; empty states are designed, not blank.
- Sidebar counts per course/tag are correct; grid is responsive 2-col (phone) →
  5-col (desktop).

**Detail + scaler**
- Changing servings rescales all parsed quantities with sane fractions (½, ⅓, ¼…);
  unparseable lines display unchanged and marked; scaling never mutates stored data.
- Rating, favorite, and "Cooked today" persist without a full page reload.

**Cook mode**
- Screen stays awake (Wake Lock API) while open; steps navigable by tap/swipe/keys;
  ingredients accessible without leaving; survives accidental back-swipe with state.

**URL import**
- A schema.org/Recipe page imports title, ingredients, steps, times, servings, and
  photo correctly ≥ 90% of the time on the test corpus (≥ 20 popular recipe sites).
- Non-recipe or unparseable pages fail with a clear message and offer manual entry
  pre-filled with page title + URL. Nothing saves without passing the review screen.
- Importer refuses private-network URLs.

**Recipe Keeper migration**
- Given a real Recipe Keeper export, ≥ 95% of recipes import with title, ingredients,
  steps, photos, and categories→tags mapped; a per-recipe report lists failures with
  reasons; re-running the same file does not create duplicates.

**Export**
- Export zip contains machine-readable JSON for every recipe + all photos; importing
  it into a fresh install reproduces the library (round-trip test in CI).

**Auth**
- First run forces password setup; wrong password 5× triggers backoff; session
  survives container restart; logout works.

**Deployment**
- `docker compose up` from a clean checkout reaches a working app in one command;
  all state is in `/data`; container restart loses nothing; `/healthz` returns 200
  without auth.

**PWA / responsive / a11y**
- Installable to a phone home screen with icon and standalone display; Lighthouse
  accessibility ≥ 90 on home, detail, and form; dark mode follows system preference;
  print view of a recipe fits typical recipes on one page.

## 14. Decisions log and remaining defaults

Resolved by owner (interview round 3, 2026-08-06):

| Question | Decision |
|---|---|
| App name | **"Let's Eat!"** (slug `lets-eat`) |
| Nutrition info | **Excluded permanently** — no nutrition anywhere |
| Offline access | **Shell-only in v1**; offline recipe cache in v1.2 |
| Units | **Scale only, no conversion** — quantities stay in the recipe's units |

Still assumed by default (flag to change):

| # | Question | Default assumed |
|---|---|---|
| 1 | Language | English-only UI, no i18n scaffolding. |
| 2 | Library scale target | Designed/tested to ~5,000 recipes, comfortable headroom for one user. |
| 3 | AI provider (v1.1) | Anthropic API, owner-supplied key. |
| 4 | Recipe Keeper export sample | **Needed from you before Phase 2** — an actual export file to validate the migration parser against. |
| 5 | Repo naming | Code lives in this repo (`Commission-Tracker`) on the designated branch; consider renaming the repo. |

---

*Interview basis: single user · phone-first on LAN · Docker Compose + SQLite · v1 =
recipe library only (no planning/shopping) · v1 imports = URL + Recipe Keeper ·
AI-assisted photo & social imports approved for v1.1 · UI patterns to keep: photo
grid + sidebar, two-panel recipe view, fast entry form, cook mode.*

*Recipe Keeper is used as functional inspiration only. General patterns (grid browse,
two-panel recipe layout, structured entry) are common to the genre and reused; Recipe
Keeper's branding, assets, icons, copy, and distinctive visual identity are not copied.*
