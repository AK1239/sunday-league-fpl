# Deployment plan — fpl.akilkhatri.com

Docker + GitHub Actions CI/CD to an existing shared VPS (Ubuntu 24.04, 3 vCPU, 7.8 GB RAM, 117 GB free disk).
The app runs in Docker bound to localhost; the VPS's existing **nginx** terminates HTTPS and proxies to it.

## What we learned about the VPS

- **nginx already owns ports 80 and 443** (it fronts your other apps), so we do **not** run Caddy. nginx gets one new server block for `fpl.akilkhatri.com`.
- **Other tenants:** agil-pos, aziz-asset (PM2), an auction service and Grafana/Loki (Docker), a host PostgreSQL 16 on `:5432`, Redis, Tailscale, fail2ban.
- **Ports already taken:** 22, 80, 443, 3000 (Grafana), 4000, 5000, 8088, 5432, 6379. The FPL app will use **`127.0.0.1:3110`**.
- **Our database does not conflict:** the FPL Postgres 17 runs in its own Docker network with no published port, separate from the host's PostgreSQL 16.
- **Resources:** about 5.9 GB RAM available, shared with the above. Building images on the server would hurt neighbours, so **we build in GitHub Actions** and the VPS only pulls.
- **Public IP:** `185.190.140.137`.
- **Hardening gaps noticed (separate from this deploy):** `ufw` is inactive, and root SSH login with a password is enabled. Do not enable `ufw` blindly: it could cut off other apps and Tailscale. See "Optional hardening" at the end.

## What's already in the repo and what's missing

| Existing                           | Problem for production                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml` `app` service | It only receives `DATABASE_URL`. `SESSION_SECRET` is required in production, so the app would crash on boot. `CRON_SECRET` is also missing. |
| Avatar uploads                     | Written to `public/avatars` inside the container, so every redeploy would delete them.                                                      |
| Compose `build:`                   | Builds on the VPS: slow and memory-hungry. Switch to images built in CI.                                                                    |
| `.github/workflows/ci.yml`         | CI only, no deploy step.                                                                                                                    |
| `scripts/db-backup.sh`             | Runs `pg_dump` against a host URL, but our Postgres isn't exposed. Needs a Docker version.                                                  |
| Server Actions body limit          | Next's default is 1 MB, but avatars may be up to 2 MB. Large uploads would fail. Set `experimental.serverActions.bodySizeLimit` to `3mb`.   |

Already good: standalone Next build, the `migrate` service pattern, `/api/health`, and the cron endpoint `/api/cron/ensure-matchday`.

## Phase 0: inputs still needed from you

1. **DNS provider** for akilkhatri.com (Cloudflare, Namecheap, etc.).
2. **Is the GitHub repo `AK1239/sunday-league-fpl` private or public?** This decides how the VPS pulls images.
3. **Data:** start the production database fresh (the seed creates the squad and Season 1), or copy over your current dev database?
4. **Production admin email and password** (12+ characters). Type these into the VPS yourself; never in GitHub or chat.
5. **How does nginx get HTTPS certificates on this box?** Run these read-only commands and send me the output:
   ```bash
   ls /etc/nginx/sites-enabled /etc/nginx/conf.d
   which certbot; certbot certificates 2>/dev/null | head -20
   cat /etc/nginx/sites-enabled/$(ls /etc/nginx/sites-enabled | head -1)   # one existing vhost, as a style reference
   ```
6. **Off-server backups:** optional but recommended (e.g. an S3 bucket or another machine).

**Never share private keys or passwords in chat.** Put them straight into the VPS and GitHub as described below.

## Phase 1: DNS

At your DNS provider, add an **A record**: `fpl` → `185.190.140.137`. If you use Cloudflare, set it to "DNS only" (grey cloud) until the certificate is issued. Check with `dig +short fpl.akilkhatri.com`.

## Phase 2: first-time VPS setup (one time)

Docker and Docker Compose are already installed, so nothing to install there.

```bash
# as root
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/fpl/avatars && chown -R deploy:deploy /opt/fpl
```

**Deploy key:** on your laptop run `ssh-keygen -t ed25519 -f ~/.ssh/fpl_deploy -N ""`. Add the `.pub` file to `/home/deploy/.ssh/authorized_keys` on the VPS (`chmod 700 .ssh`, `chmod 600 authorized_keys`, owned by `deploy`). The private key goes into GitHub only (Phase 4).

**Production `.env`:** create `/opt/fpl/.env` on the VPS, `chmod 600`:

```
POSTGRES_PASSWORD=<openssl rand -hex 24>
SESSION_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 24>
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

Secrets live only on the VPS. GitHub needs none of them.

**Avatars folder permissions:** the container runs as a non-root user. After the first image is built, find its uid with `docker run --rm <image> id app`, then `chown` `/opt/fpl/avatars` to that uid so uploads can be written.

## Phase 3: repo changes

1. **`docker-compose.prod.yml`** (new)
   - `name: fpl`, so containers and volumes don't clash with your other Docker projects.
   - `app`: `image: ghcr.io/ak1239/sunday-league-fpl:${IMAGE_TAG}`, `env_file: .env`, `ports: ["127.0.0.1:3110:3000"]`, `volumes: ["./avatars:/app/public/avatars"]`, a memory limit (about 768 MB) so it can't starve neighbours.
   - `db`: `postgres:17-alpine` with a `pgdata` volume, no published port, and a memory limit.
   - `migrate`: the migrator image, behind the `tools` profile.
   - **No Caddy service.** The existing `docker-compose.yml` is left alone for local use.
2. **nginx server block** (`deploy/nginx/fpl.akilkhatri.com.conf`, installed by you once):
   - `location /avatars/ { alias /opt/fpl/avatars/; expires 7d; }`
   - `location / { proxy_pass http://127.0.0.1:3110; }` with `Host`, `X-Forwarded-For` and `X-Forwarded-Proto` headers.
   - `client_max_body_size 5m;` for avatar uploads.
   - HTTPS via certbot (`certbot --nginx -d fpl.akilkhatri.com`), following whatever approach your other sites use.
3. **`next.config.ts`:** add `experimental.serverActions.bodySizeLimit: "3mb"`.
4. **`.github/workflows/deploy.yml`** (new): the deploy job, described in Phase 5.
5. **`scripts/deploy.sh`** on the VPS: log in to GHCR, back up the database, pull images, run migrations, restart, health-check.
6. **`scripts/db-backup.sh`:** a Docker version (`docker compose exec db pg_dump`) plus a nightly cron entry and rotation.

## Phase 4: GitHub setup

Repo → Settings → Secrets and variables → Actions:

| Secret        | Value                                             |
| ------------- | ------------------------------------------------- |
| `VPS_HOST`    | `185.190.140.137`                                 |
| `VPS_USER`    | `deploy`                                          |
| `VPS_PORT`    | `22`                                              |
| `VPS_SSH_KEY` | contents of `~/.ssh/fpl_deploy` (the private key) |

Also enable Settings → Actions → General → Workflow permissions → "Read and write" so the workflow can push images to GHCR. The deploy uses the built-in `GITHUB_TOKEN` to let the VPS pull, so no personal access token is needed. Optionally create a GitHub "production" Environment for a manual-approval gate.

## Phase 5: how a deploy works

On a push to `main`:

1. The existing checks run: lint, typecheck, format, unit and integration tests, and e2e.
2. If they pass, the workflow builds and pushes two images to GHCR, tagged with the commit SHA: the app (`runner` target) and the migrator (`migrator` target).
3. It copies the compose file to `/opt/fpl`, then SSHes in and runs `deploy.sh`, which:
   - takes a `pg_dump` backup first
   - pulls the new images
   - runs `docker compose run --rm migrate`
   - runs `docker compose up -d`
   - polls `/api/health` until it returns 200
   - prunes old images
4. A concurrency group stops two deploys overlapping. If the health check fails, the job fails and tells you.

**Rollback:** re-run the workflow manually with an older SHA, or on the VPS run `IMAGE_TAG=<old-sha> docker compose -f docker-compose.prod.yml up -d app`. Migrations only move forward, so if a bad migration shipped, restore the pre-deploy backup.

**Downtime:** the app restarts for a few seconds on each deploy, which is fine for a Sunday league app. nginx and your other apps are never touched by a deploy.

## Phase 6: first deploy runbook

1. Confirm DNS resolves to `185.190.140.137`.
2. Install the nginx server block and get the certificate (`nginx -t && systemctl reload nginx`, then certbot). Until the first deploy, nginx will return 502 for the site. That is expected.
3. Push the repo changes. The first pipeline run builds the images and starts the stack.
4. Set the avatars folder ownership (see Phase 2), then seed the database (once): `docker compose -f docker-compose.prod.yml run --rm migrate pnpm db:seed`. This creates the rule set, Season 1, the squad and the admin user. Skip it if you are importing your dev data instead.
5. Check `https://fpl.akilkhatri.com/api/health`, then log in at `/login` with the admin account.
6. Test an avatar upload (including a file over 1 MB), then redeploy and confirm the avatar survived.
7. In Admin, create invites for your managers.

## Phase 7: ongoing

- **Gameweek cron** (root or deploy crontab, hourly):
  `0 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://fpl.akilkhatri.com/api/cron/ensure-matchday`
- **Backups:** nightly `pg_dump` kept for 14 days, plus a copy of `/opt/fpl/avatars`. Copy them off the server if you have a target. Run a restore drill once.
- **Monitoring:** a free uptime check (e.g. UptimeRobot) on `/api/health`. Your existing Grafana/Loki stack can also pick up the container logs.
- **Updates:** `unattended-upgrades` is already running for OS patches. Bump the base images occasionally.

## Risks to watch

- **Shared server:** memory limits on the FPL containers protect your other apps. Watch `free -h` after the first deploy.
- **`sharp` in the Alpine image:** avatar processing needs a native binary. Verify it in the built image before the first deploy.
- **Avatar folder uid:** a wrong owner means uploads fail with a permission error. This is the first thing to check if uploads break.
- **nginx changes affect every site on the box.** Always run `nginx -t` before reloading, and only add a new file. Don't edit existing vhosts.
- **Cloudflare orange-cloud proxy** can block the first certificate request, which is why DNS-only comes first.

## Optional hardening (separate from this deploy)

These protect the whole VPS, so do them deliberately and one at a time:

- Switch SSH to key-only login (`PasswordAuthentication no`, `PermitRootLogin prohibit-password`) after confirming your key works.
- Enable `ufw` only after allowing 22/tcp, 80/tcp, 443/tcp, and anything Tailscale needs. Check this doesn't break your other apps before enabling.

## Next step

Send me the Phase 0 items (DNS provider, repo visibility, fresh-or-copied data, and the nginx/certbot output), and I'll implement Phase 3.

---

## First-time setup checklist (do in this order)

The repo changes from Phase 3 are in place: `docker-compose.prod.yml`, `deploy/nginx/fpl.akilkhatri.com.conf`, `deploy/.env.production.example`, `scripts/deploy.sh`, `scripts/db-backup-docker.sh`, `.github/workflows/deploy.yml`, a fixed uid in the `Dockerfile`, the 3 MB Server Action limit, and a build fix for the cron route.

### 1. Namecheap DNS (you)

Namecheap → Domain List → akilkhatri.com → **Manage** → **Advanced DNS** → **Add New Record**:

| Type     | Host  | Value             | TTL       |
| -------- | ----- | ----------------- | --------- |
| A Record | `fpl` | `185.190.140.137` | Automatic |

Verify (may take a few minutes): `dig +short fpl.akilkhatri.com` should print `185.190.140.137`.

### 2. Create the deploy user and folders (VPS, as root)

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/fpl/avatars /opt/fpl/backups
chown -R deploy:deploy /opt/fpl
chown 1001:1001 /opt/fpl/avatars        # the container runs as uid 1001
```

### 3. Deploy SSH key (laptop, then VPS)

```bash
# laptop
ssh-keygen -t ed25519 -f ~/.ssh/fpl_deploy -N ""
cat ~/.ssh/fpl_deploy.pub                # copy this line
```

```bash
# VPS, as root
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "<paste the .pub line>" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
```

Test from your laptop: `ssh -i ~/.ssh/fpl_deploy deploy@185.190.140.137 docker ps`

### 4. Production `.env` on the VPS (you type the values)

```bash
# VPS, as root
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

### 5. nginx site and HTTPS certificate (VPS, as root)

Your other sites follow this same pattern: a file in `sites-enabled`, certbot-managed TLS.

```bash
# copy deploy/nginx/fpl.akilkhatri.com.conf from the repo to the VPS first (scp or paste)
cp fpl.akilkhatri.com.conf /etc/nginx/sites-available/fpl.akilkhatri.com
ln -s /etc/nginx/sites-available/fpl.akilkhatri.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d fpl.akilkhatri.com
```

Only a new file is added. No existing vhost is edited. Until the first deploy, the site returns 502, which is expected.

### 6. GitHub (you)

- Repo → Settings → Secrets and variables → Actions → add `VPS_HOST` (`185.190.140.137`), `VPS_USER` (`deploy`), `VPS_PORT` (`22`) and `VPS_SSH_KEY` (the full contents of `~/.ssh/fpl_deploy`, the private key).
- Settings → Actions → General → Workflow permissions → **Read and write permissions**.
- Optional: Settings → Environments → **production** → add yourself as a required reviewer for manual approval.

### 7. First deploy

1. Make sure CI passes on `main` (see the CI note below), then push. Or run it by hand: Actions → Deploy → Run workflow.
2. The Deploy workflow builds the images, copies files to `/opt/fpl`, and runs `deploy.sh`, whose migration step creates the schema.
3. Seed once (VPS, as deploy):

```bash
cd /opt/fpl
IMAGE_TAG=<the sha that deployed> docker compose -f docker-compose.prod.yml --profile tools run --rm migrate pnpm db:seed
```

4. Open `https://fpl.akilkhatri.com/api/health` (should return `{"status":"ok"...}`), then log in at `/login` with the admin account.
5. Upload an avatar over 1 MB. Redeploy and confirm it is still there.

### 8. Cron and backups (VPS, as deploy: `crontab -e`)

```
0 * * * * . /opt/fpl/.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://fpl.akilkhatri.com/api/cron/ensure-matchday >/dev/null
30 2 * * * /opt/fpl/db-backup-docker.sh >> /opt/fpl/backups/backup.log 2>&1
```

## CI note: fix before the first automatic deploy

The Deploy workflow only runs after the **CI** workflow succeeds on `main`. Today CI would fail, because `pnpm format:check` reports style issues in about 100 existing files and `pnpm lint` reports a few existing errors. Neither comes from the deploy changes. Fix them (or relax CI) so deploys can trigger, or start with a manual run of the Deploy workflow (Actions → Deploy → Run workflow).
