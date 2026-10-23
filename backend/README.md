# Touchline backend — Node.js + MySQL

Standalone API project. Requires Node.js **22.12+**, MySQL **8.0.16+**, InnoDB and utf8mb4. It has no frontend dependency or build step.

## Code maintenance

Feature handlers and SQL are grouped in `src/routes/`. User administration is in `users.js`; role and ownership checks are in `src/permissions.js`. Request security and shared error responses are in `src/middleware/`; input rules are in `src/validation.js`. `src/app.js` only assembles the application. Add behavior-focused tests in `tests/` when changing API behavior.

Use `npm run format` or `npm run format:check` for consistent formatting. Prettier is a development dependency; `npm ci --omit=dev` excludes it in production. No imports reference frontend files.

## Local setup

Run commands from this directory:

```sh
npm ci
```

Copy `.env.example` to `.env`, create an empty MySQL database and set the credentials. For local development use `APP_ORIGIN=http://127.0.0.1:5173`.

```sh
npm run db:setup
npm run db:import
```

Set `ADMIN_EMAIL`, `ADMIN_NAME` and an `ADMIN_PASSWORD` of at least 12 characters in `.env`, then:

```sh
npm run admin:create
npm run dev
```

Remove `ADMIN_PASSWORD` after admin creation. `admin:create` creates a super administrator. Existing accounts are not overwritten; there is no default password/public registration.

API prefix: `http://127.0.0.1:3005/api`. The server root returns `{"service":"Touchline API","status":"ok"}`. It never serves Vue files. Match frontend `DEV_API_TARGET` to backend `PORT` if changing the port. In development only, localhost and 127.0.0.1 frontend origins are interchangeable on the configured scheme/port; production requires the exact origin.

The API listens on `HOST` (default `127.0.0.1`). Keep loopback behind a local reverse proxy. Configure a different interface explicitly only when your hosting network requires it. For a Windows Server 2022 VPS, use the repository's `deploy/windows/README.md` and its separate production environment template.

## cPanel / shared hosting

1. Create `api.example.com`, enable HTTPS, and create a MySQL database/user in cPanel. Use the exact cPanel-prefixed database and username.
2. Upload this directory's contents to an application root **outside `public_html`**, e.g. `/home/account/touchline-api`. Include `src/`, `scripts/`, `database/`, `data/`, `app.cjs`, `package.json`, `package-lock.json` and this README. Exclude local `.env` and `node_modules`.
3. In “Setup Node.js App”, select a supported Node version, production mode, the application root and API URL. Startup file: **`app.cjs`**. Let the host supply `PORT`.
4. Create a private `.env` in the application root, or configure equivalent cPanel variables:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://app.example.com
SESSION_SAME_SITE=strict
TRUST_PROXY=0
DB_HOST=localhost
DB_PORT=3306
DB_NAME=account_efootball
DB_USER=account_efuser
DB_PASSWORD=your-database-password
DB_POOL_SIZE=5
```

`APP_ORIGIN` is the **frontend** origin, without a path/trailing slash. It must exactly match the browser URL's origin. Set `TRUST_PROXY=1` only when your provider confirms exactly one trusted reverse proxy; otherwise use its confirmed configuration.

5. Activate the Node environment cPanel provides and run:

```sh
npm ci --omit=dev
npm run db:setup
npm run db:import
```

Set the administrator variables, run `npm run admin:create`, then remove `ADMIN_PASSWORD`. Alternatively, use phpMyAdmin to import `database/schema.sql` and then `database/players-seed.sql` **once into an empty player table**; run `npm run db:migrate` afterward to seed the playing-style reference list. Admin creation still requires a Node command runner/terminal.

6. Restart the application. Check status JSON at the API domain root. In the separately deployed frontend's `config.js`, set `apiUrl` to `https://api.example.com/api`.
7. Verify login, player editing, game ID creation, assignments, rating updates and history against the actual MySQL database before using production records.

No frontend folder/root package is needed. PHP-only hosting cannot run this API. Never put `.env`, source files or database exports in a public static document root.

## Separate-host sessions and CORS

For `https://app.example.com` and `https://api.example.com`, keep `SESSION_SAME_SITE=strict`. Cookies remain host-only on the API. Frontend requests include credentials, and the API permits exactly `APP_ORIGIN`.

For completely different sites, `SESSION_SAME_SITE=none` is supported **only in production mode over HTTPS**. Browsers can still block third-party cookies; same-site subdomains are the recommended deployment. No cookie Domain override is needed. [Cookie reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

If login succeeds but subsequent requests return 401, check HTTPS, the API URL, cookie settings and whether hosts are same-site. For 403/preflight failures, check `APP_ORIGIN`, including hostname/port, and restart the backend. CORS intentionally has no wildcard.

## Maintenance

For an existing installation, back up MySQL, upload the updated backend, run `npm run db:migrate` from this directory, and restart the Node application before deploying the updated frontend. The additive migration creates `PLAYING_STYLES`, seeds 22 starter references and adds nullable `ASSIGNMENTS.PLAYING_STYLE_ID` with a foreign key. It is safe to rerun and preserves existing players, assignments, ratings and history. Fresh `db:setup` runs this migration automatically.

Authenticated users can list references with `GET /api/playing-styles`; only administrators and super administrators can add them with `POST /api/playing-styles`. `PATCH /api/assignments/:id/playing-style` accepts `{ "PLAYING_STYLE_ID": 1 }` or `null` to clear it. Assignment creation also accepts the optional style ID. Styles belong to individual squad assignments; changing a style leaves rating timestamps and history untouched. `GET /api/assignments?accountId=...` returns style ID/name and the assignment creation timestamp for detailed exports.

`db:migrate` also upgrades legacy users with roles/status and assigns existing squads to the oldest legacy administrator, who becomes the initial super administrator. Other legacy administrators retain the `admin` role. New users default to `user`; new squads always belong to their creator. Reruns preserve assigned roles and owners. Users/admins can only read or modify their own squads, assignments and history; analytics and assignment counts use the same ownership scope. Super administrators can access all squads and transfer them with `PATCH /api/accounts/:id/owner`.

Users can update their profile with `PATCH /api/auth/profile` and change their password with `PUT /api/auth/password`; both require the current password. Super administrators manage users through `GET/POST /api/users`, `PUT /api/users/:id`, and `PUT /api/users/:id/password`. Password changes/resets, role changes and account disabling invalidate affected sessions. Disabling preserves the user's squads/history. The final active super administrator cannot be disabled or demoted. See [the upgrade and user access guide](../deploy/windows/USER-ACCESS.md).

Original files are in `data/`; do not import the Oracle SQL directly into MySQL. `db:import` now imports all 32,622 records from the typed Excel extraction, preserving edits by skipping existing matching IDs. Conflicting IDs stop the import. `db:import:legacy` retains the smaller SQL/CSV importer. `db:seed-file` regenerates the full phpMyAdmin seed. Schema creation uses `IF NOT EXISTS` and does not drop records.

`PLAYER_ID` is the player identity; different players can share `PLAYER_CODE`. The importer removes the old `uq_player_code` index when present and adds a regular code index. Existing installations can also apply `database/migrations/001_allow_shared_player_codes.sql` manually. An unchanged initial 103-player seed with no squads can be reconciled once using `npm run db:import:excel -- --replace-initial-seed`; a backup is saved first. This mode refuses edited or assigned data.

To read a newer workbook locally: install Python/openpyxl and run `python scripts/extract-excel.py`, then import the resulting JSON. The workbook remains unchanged. Shared hosting only needs the generated JSON, not Python. Data-quality observations are recorded in `data/players-import-report.json`; missing positions and unusual source heights remain untouched.

```sh
npm test
npm audit
npm start
```

19 backend tests pass using a controlled database double. A real local MySQL smoke check additionally passed full Excel/database reconciliation, login, session access, listing, analytics, assignment, rating updates and history. Login through the development proxy also passes on both localhost and 127.0.0.1. Browser visual verification remains unavailable. Passwords use scrypt, sessions expire in 12 hours, and rating/history writes share a locked transaction. Back up MySQL before imports or irreversible record deletion.
