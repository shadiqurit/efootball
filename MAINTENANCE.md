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
| Layout and appearance | `frontend/src/style.css` |
| API requests and error handling | `frontend/src/http.js` |
| Deployed API URL | Uploaded frontend `config.js` |
| Player endpoints and player SQL | `backend/src/routes/players.js` |
| Game ID endpoints and SQL | `backend/src/routes/accounts.js` |
| Assignment/rating/history endpoints and transactions | `backend/src/routes/assignments.js` |
| Analytics queries | `backend/src/routes/analytics.js` |
| Login/logout/session endpoints | `backend/src/routes/auth.js` |
| Password/session helpers | `backend/src/auth.js` |
| Request field validation | `backend/src/validation.js` |
| CORS, Origin checks, request limits, security headers | `backend/src/middleware/security.js` |
| Public API error messages | `backend/src/middleware/error-handler.js` |
| Route registration | `backend/src/app.js` |
| MySQL pool and transaction helper | `backend/src/db.js` |
| Initial schema and seed | `backend/database/` |
| Original source records and import conversion | `backend/data/` and `backend/scripts/source-data.js` |

## Backend organization

`src/index.js` starts the server. `src/app.js` wires middleware and five feature routers. The auth router exposes login, then protects session endpoints; the remaining routers run behind shared authentication. Keep that order when adding routes.

Each feature router contains its handlers and parameter-bound SQL together. This keeps related changes in one place without adding controller, service and repository layers to a small application. Input rules stay in `validation.js`; shared error handling and request security stay in `middleware/`.

Use `transaction()` for operations that must succeed together. Rating writes must keep their row lock and history insert in the same transaction. Never concatenate request values into SQL or bypass API validation.

## Frontend organization

`App.vue` contains the application shell and screen selection. Each view contains only its screen template and the workspace values/actions it uses. Shared forms are in `WorkspaceDialogs.vue`.

`App.vue` calls `provideWorkspace()` once. Views and dialogs call `useWorkspace()` to access that same set of Vue refs and actions. This preserves state when switching screens and avoids duplicating login/refresh requests. Add a new shared value to the composable's returned object, then destructure it only in the view that needs it. Display helpers and navigation constants are in small separate modules.

`api.js` chooses the real API or the explicitly enabled demo adapter. `http.js` handles normal requests, credentials and errors. The production build removes the optional demo code. Do not import backend files into frontend source.

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

The automated API tests use a database double. After database/schema or deployment changes, additionally test login, CRUD, assignments, ratings and history against real MySQL. Browser visual verification and real MySQL execution have not been completed in this development environment.
