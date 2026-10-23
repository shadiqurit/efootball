# Users, passwords and squad ownership

| Capability | User | Administrator | Super administrator |
| --- | --- | --- | --- |
| Browse/search/export shared player database | Yes | Yes | Yes |
| Create/update/delete own squads | Yes | Yes | Yes |
| Add/remove players, rate them and choose styles in own squads | Yes | Yes | Yes |
| View own squad history and analytics | Yes | Yes | Yes |
| Edit shared player profiles and add playing-style references | No | Yes | Yes |
| Manage all users' squads and transfer ownership | No | No | Yes |
| Create/edit users, assign roles, disable accounts, reset passwords | No | No | Yes |
| Update own name/email/password using current password | Yes | Yes | Yes |

Use **Account settings** from the sidebar/bottom navigation or click your avatar. A super administrator sees **Users & permissions** and **Squad ownership** on that screen. New users cannot register themselves; the super administrator creates their account. Disabled users retain their data but cannot sign in or continue an existing session.

Passwords require 12–256 characters and are stored as salted hashes. Changing your own password or resetting another user's password signs that user out on every device. Role changes and disabling an account revoke its sessions too. The last active super administrator cannot be disabled or demoted.

## Upgrade the PM2 server

Back up the production database and `.env` before upgrading. Deploy the updated `backend` source/scripts and frontend source, preserving `backend\.env`. During the short migration window stop only this API:

```powershell
Set-Location D:\app\efootball
pm2.cmd stop efootball-api
npm.cmd --prefix backend ci --omit=dev
npm.cmd --prefix backend run db:migrate
```

Stop here if migration reports an error. It is additive and safe to rerun. MySQL ALTER operations auto-commit, so a backup is still required. It preserves existing users/passwords, players, squads, assignments and rating history. It promotes the oldest legacy administrator (lowest user ID) to `super_admin`, preserves the other legacy administrators as `admin`, and assigns previously shared squads to that initial super administrator. Subsequent runs preserve roles and squad owners. For a fresh database use the normal `db:setup` and `admin:create` steps; `admin:create` now creates a super administrator.

Build and restart after migration succeeds:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
```

Reapply the production public API configuration in `frontend\dist\config.js`:

```javascript
globalThis.TOUCHLINE_CONFIG = { apiUrl: '/api' };
```

```powershell
pm2.cmd restart .\ecosystem.config.cjs --only efootball-api --update-env
Invoke-RestMethod http://127.0.0.1:3005/health
pm2.cmd save
```

Sign out and back in using the existing administrator credentials, then refresh the browser so the new frontend loads. Open **Account settings**, create user accounts and transfer existing squads to their appropriate users. Nginx needs no changes for these API endpoints.

Verify with two different user accounts: each should see only its own squads/history/analytics and be able to create/edit/delete its own squads. A user can assign existing shared players to a squad but cannot modify the shared player database. Confirm administrator catalog editing, super administrator user management, password changes and login after session revocation.

The local development database was backed up before applying this migration. Your separate server database still needs the upgrade commands above.
