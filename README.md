# Touchline — eFootball Manager

Vue 3 frontend and Node.js/MySQL backend, **independent projects with separate dependencies and deployment**.

```text
backend/
  src/routes/       Separate auth, player, style, account, assignment and analytics APIs
  src/middleware/   Shared request security and error handling
  src/              App setup, authentication, validation and MySQL access
  scripts/          Database setup, import, administrator creation
  database/         MySQL schema, additive migrations and full player SQL seed
  data/             Original PLAYERS.sql and FootballPlayers.csv
  tests/            API, validation and transaction tests
  app.cjs           cPanel / Passenger startup
  .env.example      Private backend settings
  package.json
  package-lock.json
frontend/
  src/views/        Separate overview, players, squads, analytics, history and login screens
  src/components/   Reusable icons, modal and workspace dialogs
  src/composables/  Shared workspace state and actions
  src/config/       Navigation and player position options
  src/utils/        Player display formatting and detailed CSV exports
  public/config.js  Public API URL, editable after deployment
  dist/             Generated static website
  tests/            API configuration and CSV export tests
  .env.example      Optional public build-time settings
  package.json
  package-lock.json
```

The root package contains convenience commands only. Neither project needs the root package or the other project's files to build or run.

For a file-by-file guide to changing features, see [MAINTENANCE.md](MAINTENANCE.md). Run `npm run format` to format code, or `npm run format:check` to check formatting. Each project supports these commands independently as well. Prettier is a development-only tool, excluded from the production backend install.

## Features

- Player entry/editing/deletion, search, country/position filters, pagination and CSV export.
- Multiple game IDs, separate squads and player assignments.
- Shared playing-style reference table, custom styles, per-squad player styles and detailed squad CSV exports that open in Excel.
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

Run `npm run dev:api` and `npm run dev` in two terminals. Open `http://localhost:5173` or `http://127.0.0.1:5173`. Vite proxies relative `/api` requests to backend port **3005**. If you change backend `PORT`, set `DEV_API_TARGET` in `frontend/.env.development.local` to match. Keep `VITE_API_URL=/api` locally so session cookies stay on the frontend hostname. Development permits localhost/127.0.0.1 aliases on the configured scheme and port; production still requires the exact `APP_ORIGIN`.

For a browser-only demo, run `npm run demo`. It uses your 103 players and fictional accounts/ratings, stored only in browser local storage. Production builds exclude the demo adapter and sample data.

## Separate deployment

For **Windows with PM2 and Nginx** at `efootball.shadiqur.bd`, follow the [PM2 + Nginx deployment steps](deploy/windows/PM2-NGINX.md). The repository includes `ecosystem.config.cjs`, the matching Nginx server blocks, and an API `/health` endpoint.

For **Windows Server 2022 VPS**, use the [IIS + Windows service deployment guide](deploy/windows/README.md). Run `npm run release:windows` locally to create `releases/touchline-windows-vps.zip`, containing the built frontend, separate backend and Windows configuration templates. Generate the real domain settings on the VPS with `Prepare-Config.ps1`; configure HTTPS, MySQL and IIS there. Local `.env`, administrator accounts, backups and dependencies are excluded from the package. The guide includes transferring your existing database with squads and ratings.

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

Both projects deploy independently. Node serves only the API. Database credentials belong only in the backend. Existing installations with the old unique player-code index must apply `backend/database/migrations/001_allow_shared_player_codes.sql`; the Excel importer applies this index change automatically.

Use HTTPS on both subdomains. Default Strict cookies work with same-site HTTPS subdomains. For entirely different sites, see the backend's optional cookie setting and browser restrictions. Credentialed CORS permits only the exact configured frontend origin. [Cookie behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), [credentialed CORS](https://expressjs.com/en/resources/middleware/cors/).

## Data and behavior

Original files now live in `backend/data/` with their contents preserved. The original SQL is an Oracle export; import `backend/database/schema.sql` then `backend/database/players-seed.sql` into MySQL instead.

- All 15 original `PLAYERS` columns remain, with MySQL-compatible types. Original IDs remain in a fresh database.
- The full `backend/data/players.xlsx` contains **32,622 players**. Its typed extraction, `players-excel.json`, preserves all 15 source fields and original IDs. Repeated player codes belong to distinct player IDs and are retained.
- `npm run db:import` imports the full Excel extraction. It skips existing matching IDs without overwriting edits and stops on conflicting IDs. It saves a backup before importing. The original 103-row SQL/CSV importer remains available inside the backend as `npm run db:import:legacy`.
- To refresh the extraction locally, install Python/openpyxl and run `python backend/scripts/extract-excel.py`; Node-only hosting uses the generated JSON and does not need Python. The unchanged initial 103-row seed can be reconciled once with `npm run db:import:excel -- --replace-initial-seed`; this checks for edits and existing squads before changing seed IDs.
- Missing positions and five unusual source heights are retained, not guessed. Review `backend/data/players-import-report.json` for details.
- `npm run db:seed-file` regenerates the SQL seed, intended for a one-time import into an empty player table.
- Relations: `GAME_ACCOUNTS → ASSIGNMENTS ← PLAYERS`, assignment-level `RATING_HISTORY`, and authentication `USERS`/`SESSIONS`.

Players must be removed from squads before deletion. Deleting an account or assignment deletes its associated rating history; the UI explains this before confirmation. Back up MySQL for recovery. The overview shows 8 recent changes; individual assignments expose their latest 100 changes, while older history remains stored.

## Validation

```sh
npm test
npm run build
```

17 backend tests and 4 frontend tests pass. They cover authentication, CORS/preflights, local hostname aliases, strict production origins, cookie configuration, API-only serving, source conversion, validation, bound queries, transactional history and the separate-domain API client. The production frontend builds successfully.

API unit tests use a controlled database double. A local MySQL 8.0.46 smoke check also passed: all 32,622 Excel records matched all 15 database fields with zero mismatches; administrator login, session access, player listing, analytics, assignment, rating change and history worked. Temporary test records were removed. Browser visual verification remains unavailable because local preview access was denied. Repeat these smoke checks after production deployment.

Security includes scrypt password hashing, hashed 12-hour sessions, HttpOnly cookies, exact write-origin checks, parameter-bound SQL, server validation, bounded requests, rate limits, Helmet API headers and frontend Apache security/cache headers. No ORM, external fonts, UI framework or charting dependency is required.
