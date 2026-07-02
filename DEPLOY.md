# Deploying TianguisWatt

CD lives in `.github/workflows/deploy.yml`. On every push to `main` it builds the three
images and pushes them to **GHCR**, then — once enabled — deploys to a Hetzner VM over
SSH. Production runs `compose.yml` + `compose.prod.yml` (Traefik TLS, no exposed DB
ports); ingestion + dbt run automatically via the Dagster daemon every 15 minutes.

All config lives in **GitHub** (single source of truth); the deploy workflow writes the
VM's `/opt/tianguiswatt/.env` from it on each rollout. Nothing secret is created by hand
on the VM.

**1. VM + DNS**
Ubuntu VM with Docker, a `deploy` user in the `docker` group, firewall allowing
`22/80/443`, DNS `A` records `tianguiswatt.com` (+ `www`) → the VM's IPv4, and the deploy
directory pre-created (only spot needing sudo):
```bash
sudo mkdir -p /opt/tianguiswatt && sudo chown deploy:deploy /opt/tianguiswatt
```

**2. GitHub Actions → Secrets** (Settings → Secrets and variables → Actions → Secrets)
- `DEPLOY_HOST` — the VM's IPv4
- `DEPLOY_USER` — `deploy`
- `DEPLOY_SSH_KEY` — the deploy **private** key
- `POSTGRES_PASSWORD` — `openssl rand -base64 24`
- `CLICKHOUSE_PASSWORD` — `openssl rand -base64 24`

**3. GitHub Actions → Variables** (same page → Variables)
- `DOMAIN` = `tianguiswatt.com`
- `ACME_EMAIL` = `you@example.com`
- `POSTGRES_USER` = `tianguiswatt` · `POSTGRES_DB` = `tianguiswatt`
- `CLICKHOUSE_USER` = `tianguiswatt` · `CLICKHOUSE_DB` = `tianguiswatt`
- `DEPLOY_ENABLED` = `true` — until set, images still build/push but the deploy step is
  skipped (so merges don't fail before the VM is ready).

> The DB passwords must stay **stable** after the first deploy — changing them won't match
> the existing Postgres/ClickHouse volumes.

## Deploying
Merging to `main` **builds** the images (SHA-tagged) — validating the Dockerfiles — but
does **not** deploy. To release, push a version tag:
```bash
git tag v0.1.0 && git push origin v0.1.0
```
The tag triggers: build `:v0.1.0` + `:latest` → SSH to the VM → write `.env` → pull →
migrate → `up -d`. Traefik requests a Let's Encrypt cert for `tianguiswatt.com`
automatically (needs DNS + port 80 open); first issuance takes a few seconds.
**Rollback** = redeploy an earlier tag.

(Later, release-please (#8) will cut these version tags for you from Conventional Commits.)

## Operating
- **Images:** `ghcr.io/sebastianarce/tianguiswatt-{backend,frontend,orchestrator}`.
- **Dagster UI** (internal, no auth): `ssh -L 3000:localhost:3000 deploy@tianguiswatt.com`,
  then open <http://localhost:3000>.
- **Logs:** `docker compose -f compose.yml -f compose.prod.yml logs -f <service>` on the VM.
