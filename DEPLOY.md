# Deploying TianguisWatt

CD lives in `.github/workflows/deploy.yml`. On every push to `main` it builds the three
images and pushes them to **GHCR**, then — once enabled — deploys to a Hetzner VM over
SSH. Production runs `compose.yml` with the `prod` profile
(`docker compose -f compose.yml --profile prod up -d` — Traefik TLS + Dagster, no exposed
DB ports); ingestion + dbt run automatically via the Dagster daemon every 15 minutes.

All config lives in **GitHub** (single source of truth); the deploy workflow writes the
VM's `/opt/tianguiswatt/.env` from it on each rollout. Nothing secret is created by hand
on the VM.

**1. VM + DNS**
Ubuntu VM with Docker, a `deploy` user in the `docker` group, firewall allowing
`22/80/443`, DNS `A` records `tianguiswatt.com` (+ `www` **and `api`** — the frontend is
served at the apex, the API at `api.tianguiswatt.com`) → the VM's IPv4, and the deploy
directory pre-created (only spot needing sudo):
```bash
sudo mkdir -p /opt/tianguiswatt && sudo chown deploy:deploy /opt/tianguiswatt
```

**2. GitHub Actions → Secrets** (Settings → Secrets and variables → Actions → Secrets)
- `DEPLOY_HOST` — the VM's IPv4
- `DEPLOY_USER` — `deploy`
- `DEPLOY_SSH_KEY` — the deploy **private** key
- `ACME_EMAIL` — your email (Let's Encrypt)
- `POSTGRES_USER` = `tianguiswatt` · `POSTGRES_DB` = `tianguiswatt`
- `POSTGRES_PASSWORD` — `openssl rand -hex 24`
- `CLICKHOUSE_USER` = `tianguiswatt` · `CLICKHOUSE_DB` = `tianguiswatt`
- `CLICKHOUSE_PASSWORD` — `openssl rand -hex 24`

**3. GitHub Actions → Variables** (same page → Variables)
- `DOMAIN` = `tianguiswatt.com`
- `DEPLOY_ENABLED` = `true` — until set, a tag still builds/pushes images but the deploy
  step is skipped (so it doesn't try to deploy before the VM is ready).

> The DB passwords must stay **stable** after the first deploy — changing them won't match
> the existing Postgres/ClickHouse volumes.

## Deploying
Merges to `main` don't deploy — only version tags do (image builds are validated in PR
CI). To release, push a version tag:
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
- **Logs:** `docker compose -f compose.yml --profile prod logs -f <service>` on the VM.
