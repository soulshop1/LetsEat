# Let's Eat! 🍳

A simple, self-hosted recipe manager for one person. Phone-first, runs on your own
hardware, one Docker container, all data in a single folder.

See [SPEC.md](./SPEC.md) for the full product specification and roadmap.

## Status

**Phase 0** — skeleton: app shell, SQLite schema, single-password auth, Docker
deployment, CI. Recipe management arrives in Phase 1.

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
