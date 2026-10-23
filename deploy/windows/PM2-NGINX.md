# efootball: Windows + PM2 + Nginx

Target: `https://efootball.shadiqur.bd`, source at `D:\app\efootball`, static root at `D:\app\efootball\frontend\dist`, API at `127.0.0.1:3005`. Use this guide instead of the IIS/WinSW guide for this deployment. Only the API needs PM2; Nginx serves the compiled frontend.

## 1. Copy the source and build

Copy this repository, including `ecosystem.config.cjs`, into `D:\app\efootball`. Do not copy local `node_modules`, development `.env` files, or `.git`. Use Node.js 22.12+ (a supported LTS release) and a configured MySQL database. Run each command in PowerShell and stop if one fails:

```powershell
Set-Location D:\app\efootball
node --version
npm.cmd install --global pm2
npm.cmd --prefix backend ci --omit=dev
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
Test-Path .\frontend\dist\index.html
```

The last command must return `True`. Use the full source repository, not the IIS release ZIP: that ZIP has a different frontend layout.

## 2. Configure the private backend settings

Preserve an existing production `.env`. For a new deployment:

```powershell
if (!(Test-Path .\backend\.env)) {
    Copy-Item .\backend\.env.example .\backend\.env
}
notepad .\backend\.env
```

Set these values and supply your actual database credentials:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3005
APP_ORIGIN=https://efootball.shadiqur.bd
SESSION_SAME_SITE=strict
TRUST_PROXY=1
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=efootball
DB_USER=touchline
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_POOL_SIZE=5
```

Create the database and a dedicated user with privileges on this database first. Restore your existing database if transferring players, squads, ratings and users. Back it up before migrations. For an existing restored database:

```powershell
npm.cmd --prefix backend run db:migrate
```

For a completely new empty database, run `npm.cmd --prefix backend run db:setup`, then `npm.cmd --prefix backend run db:import`. Set `ADMIN_EMAIL`, `ADMIN_NAME` and a unique `ADMIN_PASSWORD` of at least 12 characters in the private `.env`, run `npm.cmd --prefix backend run admin:create`, then remove `ADMIN_PASSWORD`. Do not run seed/admin creation after restoring existing data.

Edit `frontend\dist\config.js` so the browser uses the same host:

```javascript
globalThis.TOUCHLINE_CONFIG = { apiUrl: '/api' };
```

A future frontend build replaces this file; reapply this setting after rebuilding. Keep database credentials outside the frontend.

## 3. Start only this app in PM2

Use the same Windows account and PM2_HOME as the existing IPI EMP deployment so both apps appear in the same PM2 list. Check whether port 3005 is already occupied:

```powershell
netstat -ano -p TCP | Select-String ':3005\s+.*LISTENING'
```

If occupied, identify its PID before proceeding. Stop the old efootball process through its existing manager or terminal; do not terminate an unrelated process.

```powershell
Set-Location D:\app\efootball
pm2.cmd start .\ecosystem.config.cjs --only efootball-api
pm2.cmd status
pm2.cmd logs efootball-api --lines 50 --nostream
Invoke-RestMethod http://127.0.0.1:3005/health
pm2.cmd save
```

Expect `efootball-api` to stay `online` and `/health` to return `status: ok`. This is a process liveness endpoint; database connectivity is checked at startup, so also verify login and player listing. The ecosystem file sets production HTTPS origin, port, loopback binding and one trusted proxy; DB credentials are loaded from `backend\.env`. For an existing PM2 entry, use the restart command in step 7 instead of starting a duplicate.

## 4. Verify the certificate before enabling HTTPS

The filename `shadiqur.bd.crt` does not prove coverage. Check the public certificate on the server with Node.js:

```powershell
node -e 'const fs=require("node:fs");const {X509Certificate}=require("node:crypto");const c=new X509Certificate(fs.readFileSync("C:/nginx/ssl/shadiqur.bd.crt"));const host="efootball.shadiqur.bd";console.log({subject:c.subject,SAN:c.subjectAltName,validFrom:c.validFrom,validTo:c.validTo,match:c.checkHost(host,{subject:"never"})});if(!c.checkHost(host,{subject:"never"})||Date.now()<Date.parse(c.validFrom)||Date.now()>Date.parse(c.validTo))process.exit(1);'
if ($LASTEXITCODE -ne 0) { throw 'Certificate hostname or validity check failed.' }
```

The SAN must contain `efootball.shadiqur.bd` or a matching wildcard such as `*.shadiqur.bd`. A certificate for only `shadiqur.bd` does not cover this subdomain. Ensure the `.crt` contains the leaf certificate followed by the required intermediate certificates, and the `.key` is its matching private key. This local check verifies name/dates; the HTTPS request in step 6 checks client trust and the served chain. The certificate is not included in this repository and could not be verified locally.

## 5. Add the Nginx site alongside IPI EMP

Back up the existing configuration:

```powershell
Copy-Item C:\nginx\conf\nginx.conf ("C:\nginx\conf\nginx.conf." + (Get-Date -Format yyyyMMdd-HHmmss) + '.bak')
Copy-Item D:\app\efootball\deploy\windows\efootball.nginx.conf C:\nginx\conf\efootball.conf
notepad C:\nginx\conf\nginx.conf
```

Add this line **inside the existing `http { ... }` block**, alongside the IPI EMP server blocks. Include it once; if you already pasted these server blocks into `nginx.conf`, use those instead of adding another copy.

```nginx
include C:/nginx/conf/efootball.conf;
```

The supplied site file uses your certificate paths and document root. API errors stay JSON rather than falling back to the SPA. It also avoids caching the editable public `config.js`.

Test first, then reload the running Nginx instance:

```powershell
Set-Location C:\nginx
.\nginx.exe -t
if ($LASTEXITCODE -ne 0) { throw 'Nginx configuration failed; do not reload.' }
.\nginx.exe -s reload
```

If the existing Nginx instance uses custom `-p` or `-c` arguments, use those same arguments for both commands. A failed test leaves the currently running configuration in place; correct the reported error before reloading. Do not restart all PM2 apps or stop the shared Nginx server.

## 6. Verify DNS, HTTPS and the API

Point the domain's DNS A record at this server's public IPv4 address. If an AAAA record exists, it must also reach this server. Allow inbound TCP 80/443 through the provider and Windows firewalls; keep 3005/3306 private.

```powershell
Resolve-DnsName efootball.shadiqur.bd
curl.exe -I http://efootball.shadiqur.bd/
curl.exe -I https://efootball.shadiqur.bd/
curl.exe -i https://efootball.shadiqur.bd/health
curl.exe -i https://efootball.shadiqur.bd/api/auth/me
netstat -ano -p TCP | Select-String ':3005\s+.*LISTENING'
```

Expect HTTP to redirect to HTTPS, HTTPS `/` to return 200, `/health` to return 200 JSON and unauthenticated `/api/auth/me` to return 401 JSON. Port 3005 must listen on `127.0.0.1`. Do not bypass certificate validation with `-k`. Sign in through the browser, refresh, and verify existing players/squads. Confirm IPI EMP still works.

## 7. Updates, logs and reboot recovery

After backend source or `.env` changes, reinstall dependencies only if needed, then restart this entry:

```powershell
Set-Location D:\app\efootball
pm2.cmd restart .\ecosystem.config.cjs --only efootball-api --update-env
pm2.cmd logs efootball-api --lines 100 --nostream
Invoke-RestMethod http://127.0.0.1:3005/health
pm2.cmd save
```

`pm2 save` saves the process list; Windows still needs a boot mechanism to run `pm2 resurrect`. Preserve an existing PM2 Windows service/startup task if IPI EMP already uses one. Otherwise create a Task Scheduler task under the **same Windows account** that started PM2: trigger **At startup** with a 30-second delay, select **Run whether user is logged on or not**, and disable the execution time limit and AC-power-only condition. Use `C:\Windows\System32\cmd.exe` as the action, with arguments `/d /c ""C:\Users\YOUR_USER\AppData\Roaming\npm\pm2.cmd" resurrect"` and start-in directory `D:\app\efootball`. Substitute the actual path reported by `(Get-Command pm2.cmd).Source`, and preserve any custom PM2_HOME. The account needs access to the app, Node, PM2 and its saved process list.

Run the task manually and verify PM2 status. Confirm MySQL and the existing Nginx startup mechanism also recover automatically, then reboot during a maintenance window and repeat step 6.

References: [PM2 ecosystem configuration](https://pm2.io/docs/runtime/reference/ecosystem-file/), [PM2 save/resurrect and Windows startup](https://pm2.keymetrics.io/docs/usage/startup/), [Nginx Windows paths and reload](https://nginx.org/en/docs/windows.html), [Nginx configuration testing](https://nginx.org/en/docs/switches.html).
