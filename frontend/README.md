# Touchline frontend — Vue 3

Standalone Vue/Vite project. It builds to a static website; the frontend host needs no Node process. Node.js **22.12+** is required for development/building only.

## Code maintenance

Screen templates are separate files in `src/views/`. Shared forms live in `src/components/WorkspaceDialogs.vue`; the app shell remains in `src/App.vue`. `src/composables/useWorkspace.js` owns the shared refs and actions, provided once by the app and consumed by views/dialogs. Navigation and position options are in `src/config/workspace.js`; display helpers are in `src/utils/player-format.js`.

Change HTTP handling in `src/http.js` and styling in `src/style.css`. Use `npm run format` or `npm run format:check` for consistent formatting. No imports reference backend files.

## Local development

Run commands from this directory:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Run your backend independently on port 3000 with `APP_ORIGIN=http://127.0.0.1:5173`. Vite proxies `/api` to it.

For the explicitly marked browser-only preview, use `npm run demo`. Changes stay in local storage; clear `touchline-demo-v1` to reset them. Neither development nor demo requires backend files for compilation.

## Deploy to static shared hosting

```sh
npm ci
npm run build
```

1. Create the frontend domain/subdomain, e.g. `app.example.com`, and enable HTTPS.
2. Upload the **contents** of `dist/` into its document root (`public_html` or that subdomain's root). Include `index.html`, `config.js`, `assets/`, root `.htaccess` and `assets/.htaccess`.
3. Edit the **uploaded** `config.js`:

```js
globalThis.TOUCHLINE_CONFIG = { apiUrl: 'https://api.example.com/api' };
```

4. Set the independent backend's `APP_ORIGIN=https://app.example.com`, then restart it. The API URL above must include `/api`.
5. Open the frontend and sign in. Verify player editing, assignments and rating history using the real database.

Edit the uploaded `config.js` to change the API URL **without rebuilding**. It is public: never include credentials/session tokens/secrets. The Apache settings prevent caching `index.html`/`config.js`, cache fingerprinted assets, compress responses when supported, and supply security headers. Hash navigation requires no SPA rewrite. Relative assets support static subfolder deployment; backend `APP_ORIGIN` is still the origin without the subfolder path.

On non-Apache hosting, configure equivalent no-cache headers for `index.html` and `config.js` in provider settings. Never upload backend `.env`, database exports or Node source into the frontend document root.

## Optional build-time API URL

Copy `.env.example` to `.env` and set the API URL before building:

```dotenv
VITE_API_URL=https://api.example.com/api
```

A nonempty runtime `config.js` URL overrides the build setting; otherwise the build setting is used, then `/api` as the development default. `VITE_*` settings are public output and must never contain secrets. [Vite environment settings](https://vite.dev/guide/env-and-mode).

## Validation

```sh
npm test
npm run build
```

4 tests cover runtime API configuration, credentialed cross-origin requests, authentication errors and deployment URL errors. Production builds exclude demo data. Browser visual verification was unavailable in the development environment.
