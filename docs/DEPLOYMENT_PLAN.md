# Deployment — fpl.akilkhatri.com

Docker + GitHub Actions CI/CD to an existing shared VPS. The app runs in Docker bound to localhost; the VPS's existing **nginx** terminates HTTPS and proxies to it.

**Status: the repo work and the CI cleanup are done locally but not yet pushed to GitHub. The VPS, DNS and GitHub setup are still to do. Nothing has been deployed.**

## Decisions

| Topic         | Decision                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------- |
| Domain        | `fpl.akilkhatri.com` (DNS at Namecheap)                                                       |
| Repo          | `AK1239/sunday-league-fpl`, public                                                            |
| Production DB | Fresh. The seed creates the rule set, Season 1, the squad and the admin user.                 |
| Front door    | Existing host **nginx** + certbot (not Caddy, since nginx already owns ports 80 and 443)      |
| Images        | Built in GitHub Actions, pushed to GHCR, pulled by the VPS (no building on the shared server) |
| App port      | `127.0.0.1:3110` (localhost only)                                                             |
| Database      | Postgres 17 container in its own Docker network, no published port (separate from host PG 16) |
| Avatars       | Host folder `/opt/fpl/avatars`, bind-mounted into the app; nginx serves `/avatars/` directly  |

## The VPS (`185.190.140.137`)

Ubuntu 24.04, 3 vCPU, 7.8 GB RAM (about 5.9 GB free), 117 GB disk free. Docker 29 and Compose v5 are installed. It already hosts other apps (agil-pos, aziz-asset, an auction service, Grafana/Loki, host PostgreSQL 16, Redis, Tailscale, fail2ban), so we only add files and never edit existing nginx sites. Ports already in use: 22, 80, 443, 3000, 4000, 5000, 8088, 5432, 6379.

## What's done (in the repo)

| File                                        | Purpose                                                                                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.prod.yml`                   | Production stack: `app`, `db`, and a `migrate` job. Memory limits (app 768 MB, db 512 MB), secrets from `.env`, project name `fpl`.                                    |
| `deploy/nginx/fpl.akilkhatri.com.conf`      | New nginx server block in the style of your other sites. Proxies to 3110, serves avatars, 5 MB upload cap, forwards the public host (needed for Server Action checks). |
| `deploy/.env.production.example`            | Template for the VPS `.env`.                                                                                                                                           |
| `.github/workflows/deploy.yml`              | After CI passes on `main` (or via manual run): build and push two images, SSH to the VPS, run `deploy.sh`. A manual run with a `tag` input rolls back.                 |
| `scripts/deploy.sh`                         | Runs on the VPS: pull, pre-deploy `pg_dump`, migrate, restart, wait for `/api/health`, check that `sharp` loads, prune.                                                |
| `scripts/db-backup-docker.sh`               | Nightly DB and avatars backup, 14-day retention.                                                                                                                       |
| `Dockerfile`                                | Container user now has a fixed uid and gid of 1001, so the avatars folder can be given the right owner.                                                                |
| `next.config.ts`                            | Server Action body limit raised to 3 MB (the default 1 MB would reject 2 MB avatars).                                                                                  |
| `src/app/api/cron/ensure-matchday/route.ts` | Removed `export const dynamic = "force-dynamic"`. Next rejects it when `cacheComponents` is on, so **the production build was failing before this**.                   |

Verified locally: `pnpm build` succeeds, `docker-compose.prod.yml` validates, and both shell scripts pass syntax checks. **Not verified:** the Docker image build itself (no local Docker daemon), `sharp` on Alpine Linux, and the nginx config on the server.

## Next steps, in order

### 0. CI cleanup (done, uncommitted)

CI was failing on existing code, which would have blocked automatic deploys. Now fixed locally:

- **Lint:** 14 errors and 8 warnings are gone. Three were real fixes (a ref written during render, `Date.now()` during render, `let` instead of `const`) plus unused imports. The rest are intentional "sync state from server props or localStorage" effects, suppressed one by one with a stated reason rather than rewritten, to avoid changing behaviour in the pick flow.
- **Format:** `pnpm format` was run over the repo (about 100 files, formatting only).
- **Tests:** the integration tests picked players without checking `active`, so Jeff (inactive by default since the squad migration) broke them. They now select active players only.
- **Seed on a fresh database:** migration `0014` already inserts Dulli, Nasir and Soldier, so `db:seed` failed on the unique-name index when run after `db:migrate` on an empty database. That is exactly the production first-deploy path (and the CI e2e path). The seed now skips players that already exist. Verified on a brand-new database: 17 players, Jeff inactive, no duplicates.
- **Local check:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check` and `pnpm test` (174 tests) pass.

If your local integration-test database errors with "type goal_kind already exists", it has an older record of migration `0012`. Drop and recreate `fantasy_test`; a fresh production database is not affected.

### 1. Commit the CI cleanup, then push to GitHub

`git push` sends commit `3250dd3` plus the cleanup (the branch is ahead of `origin/main`). The manual **Run workflow** button only appears once `deploy.yml` is on the default branch.

### 2. Namecheap DNS (you)

Namecheap → Domain List → akilkhatri.com → **Manage** → **Advanced DNS** → **Add New Record**:

| Type     | Host  | Value             | TTL       |
| -------- | ----- | ----------------- | --------- |
| A Record | `fpl` | `185.190.140.137` | Automatic |

Verify: `dig +short fpl.akilkhatri.com` should print `185.190.140.137`.

### 3. Prepare the VPS (you, as root)

```bash
# deploy user and folders
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/fpl/avatars /opt/fpl/backups
chown -R deploy:deploy /opt/fpl
chown 1001:1001 /opt/fpl/avatars        # the container runs as uid 1001
```

Deploy key. On your laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/fpl_deploy -N ""
cat ~/.ssh/fpl_deploy.pub               # copy this line
```

Then on the VPS as root:

```bash
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "<paste the .pub line>" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
```

Test from your laptop: `ssh -i ~/.ssh/fpl_deploy deploy@185.190.140.137 docker ps`

Production `.env`:

```bash
cat > /opt/fpl/.env <<ENVFILE
POSTGRES_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 24)
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-password-12+
ENVFILE
chown deploy:deploy /opt/fpl/.env && chmod 600 /opt/fpl/.env
```

Edit `ADMIN_EMAIL` and `ADMIN_PASSWORD` yourself (`nano /opt/fpl/.env`). Never paste them into chat or GitHub.

### 4. nginx site and HTTPS certificate (you, as root, after DNS resolves)

Copy `deploy/nginx/fpl.akilkhatri.com.conf` from the repo to the VPS, then:

```bash
cp fpl.akilkhatri.com.conf /etc/nginx/sites-available/fpl.akilkhatri.com
ln -s /etc/nginx/sites-available/fpl.akilkhatri.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d fpl.akilkhatri.com
```

Only a new file is added; no existing vhost is edited. Until the first deploy, the site returns 502, which is expected.

### 5. GitHub settings (you)

- Repo → Settings → Secrets and variables → Actions → add `VPS_HOST` (`185.190.140.137`), `VPS_USER` (`deploy`), `VPS_PORT` (`22`) and `VPS_SSH_KEY` (the full contents of `~/.ssh/fpl_deploy`, the private key).
- Settings → Actions → General → Workflow permissions → **Read and write permissions**.
- Optional: Settings → Environments → **production** → add yourself as a required reviewer for a manual approval step.

### 6. First deploy

1. Push to `main` (CI must pass first), or run the Deploy workflow by hand. It builds both images, copies files to `/opt/fpl`, and runs `deploy.sh`. The migration step creates the schema.
2. In the deploy log, look for **"Healthy after…"** and **"sharp OK"**. If you see a `sharp` warning, avatar uploads won't work and I'll fix the image.
3. Seed once (VPS, as deploy):

```bash
cd /opt/fpl
IMAGE_TAG=<the sha that deployed> docker compose -f docker-compose.prod.yml --profile tools run --rm migrate pnpm db:seed
```

4. Open `https://fpl.akilkhatri.com/api/health` (expect `{"status":"ok"...}`), then log in at `/login` with the admin account.
5. Upload an avatar over 1 MB, then redeploy and confirm it survived.
6. In Admin, create invites for your managers.

### 7. Cron and backups (you, as deploy: `crontab -e`)

```
0 * * * * . /opt/fpl/.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://fpl.akilkhatri.com/api/cron/ensure-matchday >/dev/null
30 2 * * * /opt/fpl/db-backup-docker.sh >> /opt/fpl/backups/backup.log 2>&1
```

Also: copy `/opt/fpl/backups` off the server if you have a target, do one restore drill, and add a free uptime check (e.g. UptimeRobot) on `/api/health`.

## How a deploy works

On a push to `main`: CI runs, and if it passes the workflow builds and pushes the app and migrator images to GHCR (tagged with the commit SHA), then SSHes to the VPS and runs `deploy.sh`. The script pulls, backs up the database, migrates, restarts the app and waits for `/api/health`. A concurrency group stops two deploys overlapping. The app restarts for a few seconds; nginx and your other apps are untouched.

**Rollback:** Actions → Deploy → Run workflow with `tag` set to an older commit SHA, or on the VPS run `IMAGE_TAG=<old-sha> docker compose -f docker-compose.prod.yml up -d app`. Migrations only move forward, so if a bad migration shipped, restore the latest `backups/pre-deploy-*.sql.gz`.

## Risks to watch

- **`sharp` on the Alpine image:** untested until the first real build. `deploy.sh` checks it automatically.
- **Avatar folder owner:** if uploads fail with a permission error, check `ls -ld /opt/fpl/avatars` shows uid 1001.
- **Shared server:** container memory limits protect your other apps. Watch `free -h` after the first deploy.
- **nginx changes affect every site on the box:** always run `nginx -t` before reloading, and only add new files.
- **Cloudflare is not in use here.** If you ever put the domain behind its orange-cloud proxy, issue the certificate first.

## Optional hardening (separate from this deploy)

`ufw` is inactive and root SSH login with a password is enabled on the VPS. Do these deliberately, one at a time:

- Switch SSH to key-only login (`PasswordAuthentication no`, `PermitRootLogin prohibit-password`) after confirming your key works.
- Enable `ufw` only after allowing 22/tcp, 80/tcp, 443/tcp and anything Tailscale needs, and after checking it won't break your other apps.
