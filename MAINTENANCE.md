# Maintaining Touchline

The frontend and backend are independent projects. Each has its own `package.json`, lockfile, environment example, tests, formatter and deployment instructions. No source file imports code from the other project. Their only runtime connection is the HTTP JSON API.

## Where to make changes

| Change | File or folder |
| --- | --- |
| Player screen/table | `frontend/src/views/PlayersView.vue` |
| Game IDs and squads screen | `frontend/src/views/GamesView.vue` |
| Overview, analytics, history, login screens | Corresponding files in `frontend/src/views/` |
| Entry/edit/rating forms | `frontend/src/components/WorkspaceDialogs.vue` |
| Modal keyboard/focus behavior | `frontend/src/components/Modal.vue` |
| Navigation and position options | `frontend/src/config/workspace.js` |
| Shared frontend state, loading and save actions | `frontend/src/composables/useWorkspace.js` |
| Player initials, date formatting, position colors | `frontend/src/utils/player-format.js` |
| Color palette and spacing tokens | `frontend/src/styles/tokens.css` |
| App shell, sidebar and top bar | `frontend/src/styles/layout.css` |
| Cards, tables, buttons and dialogs | `frontend/src/styles/components.css` |
| Dashboard, login and feature-specific styling | `frontend/src/styles/pages.css` |
| Phone/tablet/desktop layouts | `frontend/src/styles/responsive.css` |
| Mobile navigation keyboard/focus handling | `frontend/src/composables/useNavigationDrawer.js` |
| API requests and error handling | `frontend/src/http.js` |
| Deployed API URL | Uploaded frontend `config.js` |
| Player endpoints and player SQL | `backend/src/routes/players.js` |
| Game ID endpoints and SQL | `backend/src/routes/accounts.js` |
| Assignment/rating/history endpoints and transactions | `backend/src/routes/assignments.js` |
| Analytics queries | `backend/src/routes/analytics.js` |
| Playing-style reference list | `backend/src/routes/playing-styles.js` |
| Playing-style migration and starter references | `backend/scripts/migrate-db.js` and `backend/database/migrations/002_playing_styles.sql` |
| CSV escaping, columns and squad export details | `frontend/src/utils/csv-export.js` |
| Selected squad sorting and export order | `frontend/src/utils/squad-sort.js` and `useWorkspace.js` |
| Selected squad name search and CSV filtering | `frontend/src/utils/squad-filter.js` and `useWorkspace.js` |
| Searchable playing-style selector | `frontend/src/components/PlayingStyleSelect.vue` |
| Windows Server 2022 VPS setup | `deploy/windows/README.md`, `Prepare-Config.ps1` and XML templates |
| Rebuild the Windows deployment ZIP | `npm run release:windows` / `deploy/windows/Build-Package.ps1` |
| Login/logout/session endpoints | `backend/src/routes/auth.js` |
| Password/session helpers | `backend/src/auth.js` |
| Account settings and user management screen | `frontend/src/views/SettingsView.vue` |
| User administration endpoints | `backend/src/routes/users.js` |
| Role checks and squad ownership | `backend/src/permissions.js` |
| Roles/ownership database upgrade | `backend/scripts/migrate-access.js` |
| Request field validation | `backend/src/validation.js` |
| CORS, Origin checks, request limits, security headers | `backend/src/middleware/security.js` |
| Public API error messages | `backend/src/middleware/error-handler.js` |
| Route registration | `backend/src/app.js` |
| MySQL pool and transaction helper | `backend/src/db.js` |
| Initial schema and seed | `backend/database/` |
| Original source records and import conversion | `backend/data/` and `backend/scripts/source-data.js` |

## Backend organization

`src/index.js` starts the server. `src/app.js` wires middleware and feature routers. The auth router exposes login, then protects session endpoints; the remaining routers run behind shared authentication. Keep that order when adding routes. Catalog mutations require an admin role, user management requires a super admin, and squad reads/writes must check ownership for every non-super-admin request, including analytics and history.

Each feature router contains its handlers and parameter-bound SQL together. This keeps related changes in one place without adding controller, service and repository layers to a small application. Input rules stay in `validation.js`; shared error handling and request security stay in `middleware/`.

Use `transaction()` for operations that must succeed together. Rating writes must keep their row lock and history insert in the same transaction. Never concatenate request values into SQL or bypass API validation.

## Frontend organization

`App.vue` contains the application shell and screen selection. Each view contains only its screen template and the workspace values/actions it uses. Shared forms are in `WorkspaceDialogs.vue`.

`App.vue` calls `provideWorkspace()` once. Views and dialogs call `useWorkspace()` to access that same set of Vue refs and actions. This preserves state when switching screens and avoids duplicating login/refresh requests. Add a new shared value to the composable's returned object, then destructure it only in the view that needs it. Display helpers and navigation constants are in small separate modules.

`api.js` chooses the real API or the explicitly enabled demo adapter. `http.js` handles normal requests, credentials and errors. The production build removes the optional demo code. Do not import backend files into frontend source.

The stylesheet entry `src/style.css` imports focused CSS files from `src/styles/`. The interface uses local system fonts, CSS illustrations and existing SVG icons. At 900px and below, navigation moves to a bottom bar with a keyboard-accessible drawer; 901–1150px uses a compact sidebar rail. At 700px and below, data tables become labeled cards. Smaller overrides at 430px/360px keep forms and controls usable. `prefers-reduced-motion` is respected. To change the theme, start with `styles/tokens.css` rather than layering duplicate overrides.

The current light theme uses white surfaces, royal blue actions and peach accents against blue/violet hero panels. Shared colors are in `tokens.css`; hero/pitch gradients are in `pages.css`, and position badges are in `components.css`. Keep small text contrast at least 4.5:1 when adjusting colors.

Typography uses a 16px root with shared size tokens in `tokens.css`: 16px body text, 15px labels, 14px supporting text and 12px metadata. Responsive rules use the same tokens. Main text is near-black; secondary text is dark gray. Keep text at natural width and allow wrapping instead of squeezing letters or shrinking text on phones.

## Typical changes

For a new player field, update the backend validation and SQL schema, then the player form and save payload in the frontend. SQL schema creation is only initial setup: for an existing database, write an explicit migration and back up the database before applying it. Do not rely on editing `CREATE TABLE IF NOT EXISTS` to change existing tables.

For a new endpoint, add its handler to the relevant router, validate input and add a behavior-focused API test. For a new screen, add a view and a navigation entry; register it in `App.vue` and use shared state/actions only when needed.

For a visual-only edit, change the relevant view or stylesheet, build the frontend, then upload the contents of `frontend/dist/`. Preserve or reapply the deployed `config.js` API URL, since a new build copies its source default. The backend does not need restarting for frontend changes.

For a backend change, test it, upload the changed backend project files and restart the Node application. Run `npm ci --omit=dev` if dependency files changed. The frontend does not need rebuilding unless the API contract changed.

## Routine checks

From the repository root:

```sh
npm run format
npm test
npm run build
```

Or, independently inside either project:

```sh
npm ci
npm run format:check
npm test
```

The frontend also supports `npm run build`; the backend has no build step. Formatter packages are development dependencies. Production backend installs use `npm ci --omit=dev`.

The automated API tests use a database double. A local MySQL 8.0.46 check has also verified all 32,622 Excel records field by field, plus login, CRUD, assignments, ratings and history. Repeat real-database smoke checks after database/schema or deployment changes. Browser visual verification remains unavailable in this environment.
