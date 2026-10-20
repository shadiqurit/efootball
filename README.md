# Touchline — eFootball Manager

Vue 3 frontend and Node.js/MySQL backend, **independent projects with separate dependencies and deployment**.

```text
backend/
  src/routes/       Separate auth, player, account, assignment and analytics APIs
  src/middleware/   Shared request security and error handling
  src/              App setup, authentication, validation and MySQL access
  scripts/          Database setup, import, administrator creation
  database/         MySQL schema and 103-player SQL seed
  data/             Original PLAYERS.sql and FootballPlayers.csv
  tests/            15 backend tests
  app.cjs           cPanel / Passenger startup
  .env.example      Private backend settings
  package.json
  package-lock.json
frontend/
  src/views/        Separate overview, players, squads, analytics, history and login screens
  src/components/   Reusable icons, modal and workspace dialogs
  src/composables/  Shared workspace state and actions
  src/config/       Navigation and player position options
  src/utils/        Player display formatting
  public/config.js  Public API URL, editable after deployment
  dist/             Generated static website
  tests/            4 frontend tests
  .env.example      Optional public build-time settings
  package.json
  package-lock.json
```

The root package contains convenience commands only. Neither project needs the root package or the other project's files to build or run.

For a file-by-file guide to changing features, see [MAINTENANCE.md](MAINTENANCE.md). Run `npm run format` to format code, or `npm run format:check` to check formatting. Each project supports these commands independently as well. Prettier is a development-only tool, excluded from the production backend install.

## Features

- Player entry/editing/deletion, search, country/position filters, pagination and CSV export.
- Multiple game IDs, separate squads and player assignments.
- Per-assignment ratings from **1 to 120**, with previous/new rating history and administrator attribution.
- Squad balance, highest/average ratings, top players, recent changes and account comparisons.
- Responsive interface and private administrator login.

This manages your records; it does not connect to or modify the eFootball game itself. Administrators share one workspace.

## Local development

Requires Node.js **22.12+** and MySQL **8.0.16+**.

```sh
npm run install:all
```

Copy `backend/.env.example` to `backend/.env`, configure MySQL, and create an empty database. Keep `APP_ORIGIN=http://127.0.0.1:5173` for local development.

```sh
npm run db:setup
npm run db:import
```

Set `ADMIN_EMAIL`, `ADMIN_NAME` and a unique `ADMIN_PASSWORD` of at least 12 characters in `backend/.env`, run `npm run admin:create`, then remove `ADMIN_PASSWORD`. There is no default password.

Run `npm run dev:api` and `npm run dev` in two terminals. Open `http://127.0.0.1:5173`. Vite proxies `/api` to port 3000. The URL and `APP_ORIGIN` must use the same hostname; `localhost` and `127.0.0.1` differ.

For a browser-only demo, run `npm run demo`. It uses your 103 players and fictional accounts/ratings, stored only in browser local storage. Production builds exclude the demo adapter and sample data.

## Separate deployment

| Project | Example URL | Upload |
| --- | --- | --- |
| Vue frontend | `https://app.example.com` | Contents of `frontend/dist/` into the static document root |
| Node.js backend | `https://api.example.com` | The `backend/` project into its own Node application root outside the public document root |

1. **Backend:** configure its private `.env` with MySQL credentials and `APP_ORIGIN=https://app.example.com`. Set up the cPanel Node application using `app.cjs`, install backend dependencies, initialize/import MySQL and create the administrator. [Backend instructions](backend/README.md).
2. **Frontend:** run `npm run build`, upload the **contents** of `frontend/dist/`, and edit the uploaded `config.js`:

```js
globalThis.TOUCHLINE_CONFIG = { apiUrl: 'https://api.example.com/api' };
```

Include `/api` in the API URL. This public setting can change **without rebuilding**. [Frontend instructions](frontend/README.md).

Both projects deploy independently. Node serves only the API. Database credentials belong only in the backend. This replaces the old combined-server layout; database tables are unchanged.

Use HTTPS on both subdomains. Default Strict cookies work with same-site HTTPS subdomains. For entirely different sites, see the backend's optional cookie setting and browser restrictions. Credentialed CORS permits only the exact configured frontend origin. [Cookie behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), [credentialed CORS](https://expressjs.com/en/resources/middleware/cors/).

## Data and behavior

Original files now live in `backend/data/` with their contents preserved. The original SQL is an Oracle export; import `backend/database/schema.sql` then `backend/database/players-seed.sql` into MySQL instead.

- All 15 original `PLAYERS` columns remain, with MySQL-compatible types. Original IDs remain in a fresh database.
- 16 Oracle rows and 87 additional CSV players produce 103 unique records. Dates/times and accents are preserved; the importer repairs the damaged `Lúcio` encoding.
- `npm run db:import` skips existing codes without overwriting edits, and allocates new IDs if source IDs are occupied.
- `npm run db:seed-file` regenerates the SQL seed, intended for a one-time import into an empty player table.
- Relations: `GAME_ACCOUNTS → ASSIGNMENTS ← PLAYERS`, assignment-level `RATING_HISTORY`, and authentication `USERS`/`SESSIONS`.

Players must be removed from squads before deletion. Deleting an account or assignment deletes its associated rating history; the UI explains this before confirmation. Back up MySQL for recovery. The overview shows 8 recent changes; individual assignments expose their latest 100 changes, while older history remains stored.

## Validation

```sh
npm test
npm run build
```

15 backend tests and 4 frontend tests pass. They cover authentication, CORS/preflights, cookie configuration, API-only serving, source conversion, validation, bound queries, transactional history and the separate-domain API client. The production frontend builds successfully.

API tests use a controlled database double: **real MySQL execution is not verified in this environment**. Browser visual verification was unavailable because local preview access was denied. After deployment, smoke-test login, player editing, assignments, ratings and history with the real database.

Security includes scrypt password hashing, hashed 12-hour sessions, HttpOnly cookies, exact write-origin checks, parameter-bound SQL, server validation, bounded requests, rate limits, Helmet API headers and frontend Apache security/cache headers. No ORM, external fonts, UI framework or charting dependency is required.
