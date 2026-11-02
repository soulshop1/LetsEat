# Let's Eat! 🍳

Personal recipe box. **Native iOS (SwiftUI) is the primary product direction** — see [`ios/`](./ios/) and open `ios/LetsEat.xcodeproj` on a Mac.

The existing SvelteKit + Docker web app remains in-repo as a transitional library / export source (not being redesigned). Spec for that stack: [SPEC.md](./SPEC.md).

## Status

**v1 feature-complete:** recipe library (create/edit, photos, grid browse, full-text
search and filters, serving scaler, ratings/favorites/cook log, print view), import
from website URLs with review-before-save, full-library zip export, cook mode with
screen wake lock, installable PWA, single-password auth, Docker deployment, CI.

Recipe Keeper migration is deferred until an export file is supplied. Next up on the
roadmap (v1.1): AI-assisted photo and Instagram/YouTube imports.

## Run it

```sh
docker compose up -d
```

Open `http://<your-server>:3000`, set your password on first visit, done. All state
(database + photos) lives in `./data` — back it up by copying that folder.

## Develop

```sh
npm install
npm run dev        # dev server on http://localhost:5173
npm test           # unit tests
npm run check      # type checking
```

The dev server stores data in `./data` too (git-ignored). Set `DATA_DIR` to use a
different location.

## Notes

- Designed for LAN/VPN use over plain HTTP; sessions use SameSite=Lax cookies (the
  SvelteKit origin check is off because LAN hosts vary — see `svelte.config.js`).
  If you ever expose it to the internet, put an HTTPS reverse proxy in front.
- `GET /healthz` is unauthenticated, for container health checks.
