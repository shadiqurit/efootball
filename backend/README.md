# Touchline backend — Node.js + MySQL

Standalone API project. Requires Node.js **22.12+**, MySQL **8.0.16+**, InnoDB and utf8mb4. It has no frontend dependency or build step.

## Code maintenance

Feature handlers and SQL are grouped in `src/routes/auth.js`, `players.js`, `accounts.js`, `assignments.js` and `analytics.js`. Request security and shared error responses are in `src/middleware/`; input rules are in `src/validation.js`. `src/app.js` only assembles the application. Add behavior-focused tests in `tests/` when changing API behavior.

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

Remove `ADMIN_PASSWORD` after admin creation. Existing administrators are not overwritten; there is no default password/public registration.

API prefix: `http://127.0.0.1:3000/api`. The server root returns `{"service":"Touchline API","status":"ok"}`. It never serves Vue files.

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

Set the administrator variables, run `npm run admin:create`, then remove `ADMIN_PASSWORD`. Alternatively, use phpMyAdmin to import `database/schema.sql` and then `database/players-seed.sql` **once into an empty player table**; skip the CLI database setup/import in that case. Admin creation still requires a Node command runner/terminal.

6. Restart the application. Check status JSON at the API domain root. In the separately deployed frontend's `config.js`, set `apiUrl` to `https://api.example.com/api`.
7. Verify login, player editing, game ID creation, assignments, rating updates and history against the actual MySQL database before using production records.

No frontend folder/root package is needed. PHP-only hosting cannot run this API. Never put `.env`, source files or database exports in a public static document root.

## Separate-host sessions and CORS

For `https://app.example.com` and `https://api.example.com`, keep `SESSION_SAME_SITE=strict`. Cookies remain host-only on the API. Frontend requests include credentials, and the API permits exactly `APP_ORIGIN`.

For completely different sites, `SESSION_SAME_SITE=none` is supported **only in production mode over HTTPS**. Browsers can still block third-party cookies; same-site subdomains are the recommended deployment. No cookie Domain override is needed. [Cookie reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

If login succeeds but subsequent requests return 401, check HTTPS, the API URL, cookie settings and whether hosts are same-site. For 403/preflight failures, check `APP_ORIGIN`, including hostname/port, and restart the backend. CORS intentionally has no wildcard.

## Maintenance

Original files are in `data/`; do not import the Oracle SQL directly into MySQL. `db:import` reads both files, preserving edits by skipping existing codes. `db:seed-file` regenerates the phpMyAdmin seed. Schema creation uses `IF NOT EXISTS` and does not drop records.

```sh
npm test
npm audit
npm start
```

15 backend tests pass using a controlled database double; they do not verify real MySQL execution. Passwords use scrypt, sessions expire in 12 hours, and rating/history writes share a locked transaction. Back up MySQL before imports or irreversible record deletion.
