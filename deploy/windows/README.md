# Windows Server 2022 VPS deployment

This package uses IIS for the compiled Vue frontend and HTTPS, IIS ARR for `/api`, Node.js as a Windows service, and local MySQL. Frontend and backend remain separate folders. The database and Node port are not public. No Vite development server, Python, PM2 or Docker is required on the VPS.

This is a deployment kit. It has not been installed on your VPS. Configuration generation is tested on Windows; IIS/ARR, certificates, service installation and reboot recovery must be verified on the actual server.

## 1. Install prerequisites and extract

Point your domain's DNS A record at the VPS. Use a hostname such as `club.example.com` in place of the examples below. If you use IPv6, its AAAA record must also reach this server.

Install from the official sources:

- [Node.js 24 LTS, Windows x64 installer](https://nodejs.org/en/download). Include npm and the normal `C:\Program Files\nodejs` location. Use a current patched LTS release.
- [MySQL Community Server](https://dev.mysql.com/downloads/mysql/), version 8.0.16 or later. Configure its Windows service for automatic startup and bind it to `127.0.0.1`. Record the service name (often `MySQL80` or `MySQL84`). Do not expose port 3306.
- IIS, then Microsoft's [URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite) and [Application Request Routing](https://www.iis.net/downloads/microsoft/application-request-routing) modules.
- [WinSW v2.12.0](https://github.com/winsw/winsw/releases/tag/v2.12.0): download `WinSW.NET461.exe` from that official release. It uses the .NET Framework available on Server 2022. Rename it to `TouchlineApi.exe`; it will go in the package's `service` directory. Third-party executables are not bundled.

In **Administrator PowerShell**, enable IIS before installing its two modules:

```powershell
Install-WindowsFeature Web-Server, Web-Mgmt-Console, Web-Stat-Compression
```

Extract `touchline-windows-vps.zip` to a dedicated `C:\Apps\Touchline` directory. The expected layout is:

```text
C:\Apps\Touchline\
  frontend\index.html, config.js, assets\  # IIS document root, built Vue files
  backend\src\, scripts\, database\, data\, package.json, package-lock.json
  deploy\windows\                         # this guide and templates
  service\                                # generated service configuration
  logs\                                   # service logs
```

Do not configure IIS to serve `C:\Apps\Touchline` or `backend`; use only `frontend`.

## 2. Generate configuration and configure MySQL

```powershell
Set-Location C:\Apps\Touchline
.\deploy\windows\Prepare-Config.ps1 -Domain club.example.com -WhatIf
.\deploy\windows\Prepare-Config.ps1 -Domain club.example.com
notepad .\backend\.env
```

Set a unique `DB_PASSWORD`, the correct database/user and `APP_ORIGIN=https://club.example.com`. The generated file uses `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=3005`, `SESSION_SAME_SITE=strict` and `TRUST_PROXY=1` for the single local IIS reverse proxy. The generator preserves an existing `.env`. It overwrites only the generated frontend/service configuration; use it before installing the service. If the local execution policy blocks this reviewed script, invoke it with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deploy\windows\Prepare-Config.ps1 -Domain club.example.com`. That setting applies only to this PowerShell process, not the machine policy. Domain-managed execution policies may still require your administrator's signing process.

Use MySQL Workbench or a MySQL administrator connection to create the database and an application user. Replace the example password before executing:

```sql
CREATE DATABASE efootball CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'touchline'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_UNIQUE_PASSWORD';
GRANT ALL PRIVILEGES ON efootball.* TO 'touchline'@'localhost';
```

These grants are limited to this application's database and allow its setup/migration scripts. Keep the MySQL administrator account separate. Configure MySQL automatic startup before proceeding.

```powershell
Set-Location C:\Apps\Touchline\backend
npm.cmd ci --omit=dev
npm.cmd run db:setup
```

Choose **one** data path:

**A. Fresh installation from the original workbook:** run `npm.cmd run db:import` to load all 32,622 original players. Set `ADMIN_EMAIL`, `ADMIN_NAME` and a new `ADMIN_PASSWORD` of at least 12 characters in the private `.env`, run `npm.cmd run admin:create`, then remove `ADMIN_PASSWORD`. The ZIP contains no local administrator password or account.

**B. Transfer your current database, including edited players, squads, styles, ratings, history and administrator accounts:** export it from the existing machine using MySQL's dump utility. Keep this dump private and copy it securely to the VPS. Example (use the actual executable path if it is not on PATH):

```powershell
mysqldump.exe --host=127.0.0.1 --user=efootball --password --single-transaction --no-tablespaces --ignore-table=efootball.SESSIONS --result-file=C:\private-backups\touchline.sql efootball
```

`--password` prompts; do not put the password in the command. Use `--result-file`, because Windows PowerShell 5.1's `>` redirection can change dump encoding. Restore into the fresh VPS database through MySQL Workbench's Data Import or the MySQL interactive client (`SOURCE C:/private-backups/touchline.sql;`). This preserves the existing administrator password hash, so do not run `admin:create` again. Sessions are excluded so users sign in afresh. Then run `npm.cmd run db:migrate` against the restored database. Keep the original database untouched until the transfer is verified. Do not run the original player import after restoring your live data.

## 3. IIS and HTTPS

In IIS Manager:

1. At the **server** node, open **Application Request Routing Cache → Server Proxy Settings** and enable **Proxy**. ARR changes apply at server level; review existing sites if the VPS is shared.
2. At the server node, open **URL Rewrite → View Server Variables** and add `HTTP_X_FORWARDED_PROTO`. The supplied API rule sets this header to `https` after HTTPS redirection.
3. Create an application pool named **Touchline** with **No Managed Code** and its default **ApplicationPoolIdentity**. Create the **Touchline** website using that pool, physical path `C:\Apps\Touchline\frontend`, HTTP port 80 and host name `club.example.com`.
4. Obtain/import a trusted TLS certificate matching the hostname. Add an HTTPS binding on port 443 with that hostname, enable SNI, and select the certificate. Configure certificate renewal with your certificate provider. Keep port 80 available for HTTP-to-HTTPS redirects and HTTP certificate challenges.
5. The generated `frontend\web.config` redirects to the configured HTTPS domain, forwards `/api` to `127.0.0.1:3005`, passes API error JSON through unchanged, avoids caching HTML/config/API responses and caches fingerprinted assets. Hash-based navigation needs no extra SPA rewrite rule.

Keep the VPS directly behind IIS for this configuration. If another proxy/CDN terminates HTTPS, configure its end-to-end HTTPS and review trusted-proxy settings before use.

## 4. Restrict file permissions and install the service

Place the downloaded WinSW executable at `C:\Apps\Touchline\service\TouchlineApi.exe`, next to the generated XML. The service runs as **LocalService**, not Administrator. Set permissions on the dedicated package directory in elevated PowerShell:

```powershell
$appPath = 'C:\Apps\Touchline'
icacls.exe $appPath /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)RX'
icacls.exe $appPath /grant 'IIS AppPool\Touchline:RX'
icacls.exe "$appPath\frontend" /grant 'IIS AppPool\Touchline:(OI)(CI)RX'
icacls.exe "$appPath\logs" /grant '*S-1-5-19:(OI)(CI)M'
```

Use these commands only on the fresh dedicated application folder. Keep the private `.env`, database dumps and `backend` accessible to Administrators/SYSTEM/LocalService; the IIS pool needs access only to the frontend and traversal of the root. Do not grant write access to the application source for the service account.

The SID permissions above mean SYSTEM, Administrators and LocalService, so they also work on non-English Windows installations. Inspect the effective permissions with `icacls.exe` before going live; remove any extra explicit grants retained from another installation. MySQL data files remain managed by MySQL's own service.

```powershell
Set-Location C:\Apps\Touchline\service
.\TouchlineApi.exe install
Start-Service TouchlineApi
Get-Service TouchlineApi
Invoke-RestMethod http://127.0.0.1:3005/
```

Startup is delayed automatic and failures restart after 10 seconds. Logs rotate in `C:\Apps\Touchline\logs`. If MySQL starts late, the retry policy recovers the API after MySQL becomes available.

Allow inbound TCP **80/443** in Windows Firewall and the VPS provider firewall. Keep **3005/3306** closed publicly. Retain your existing restricted RDP rule; this package does not change remote desktop access. Open only the website ports, for example:

```powershell
New-NetFirewallRule -DisplayName 'Touchline website' -Direction Inbound -Protocol TCP -LocalPort 80,443 -Action Allow
```

## 5. Verify before using production data

- `https://club.example.com` loads the login page; HTTP redirects to HTTPS.
- Sign in, refresh, and verify the session survives. In developer tools the session cookie must be Secure, HttpOnly and SameSite=Strict.
- Verify player totals, current squads, playing styles, ratings, history and CSV exports against your original database. New assignment ratings start blank, style selection supports search, and clicking outside a modal leaves it open.
- `/api/auth/me` without a session returns 401 JSON, not IIS HTML; a wrong write Origin returns 403. Passwords and source files must not be served by IIS.
- On the VPS, `Get-NetTCPConnection -State Listen -LocalPort 3005` must show `127.0.0.1`. Node/MySQL ports must not be reachable from another machine.
- Reboot once and verify IIS, MySQL and `TouchlineApi` start automatically and login works.

## Updates and recovery

Back up MySQL and the private `.env` before updates. Keep a copy of the previous backend and frontend. Preserve `frontend\web.config`, public `config.js`, `backend\.env`, `service\`, `logs\` and private backups.

For a backend update, stop `TouchlineApi`, copy the updated backend source/package files, run `npm.cmd ci --omit=dev` and `npm.cmd run db:migrate` from `backend`, then start the service. Do not rerun seed/admin creation during an update. For a frontend-only update, upload the newly compiled frontend files and retain its generated IIS/public configuration; the backend does not need restarting. Retain the previous fingerprinted assets until old browser sessions have refreshed.

```powershell
Restart-Service TouchlineApi
Get-Content C:\Apps\Touchline\logs\TouchlineApi.err.log -Tail 50
```

IIS 500.19 usually indicates a missing URL Rewrite/ARR module or a locked/unavailable config section. A server-variable error means `HTTP_X_FORWARDED_PROTO` was not allowed at server level. IIS 502 means Node is unavailable or its port differs; inspect service logs and the local status URL. A 403 after login usually indicates `APP_ORIGIN` differs from the exact HTTPS hostname. Recheck the private configuration and restart the service.

Schedule protected MySQL backups outside the IIS document root and keep a copy off the VPS. Periodically verify a restore into a separate database. Roll back application files only when compatible with the database; use the pre-update backup if a migration must be reversed.

References: [Microsoft IIS reverse proxy guide](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/reverse-proxy-with-url-rewrite-v2-and-application-request-routing), [WinSW service configuration](https://github.com/winsw/winsw/blob/v2.12.0/doc/xmlConfigFile.md), [Node.js releases](https://nodejs.org/en/about/previous-releases).
