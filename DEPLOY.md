# Deploying TianguisWatt

CD lives in `.github/workflows/deploy.yml`. On every push to `main` it builds the three
images and pushes them to **GHCR**, then — once enabled — deploys to a Hetzner VM over
SSH. Production runs `compose.yml` + `compose.prod.yml` (Traefik TLS, no exposed DB
ports); ingestion + dbt run automatically via the Dagster daemon every 15 minutes.

## One-time setup

**1. VM + DNS**
Ubuntu VM with Docker, a `deploy` user in the `docker` group, firewall allowing
`22/80/443`, and DNS `A` records `tianguiswatt.com` (+ `www`) → the VM's IPv4.

**2. GitHub Actions secrets** (Settings → Secrets and variables → Actions → Secrets)
- `DEPLOY_HOST` — the VM's IPv4
- `DEPLOY_USER` — `deploy`
- `DEPLOY_SSH_KEY` — the deploy **private** key

**3. GitHub Actions variable** (same page → Variables)
- `DEPLOY_ENABLED` = `true` — until set, images still build/push but the deploy step is
  skipped (so merges don't fail before the VM is ready).

**4. `.env` on the VM** at `/opt/tianguiswatt/.env`, owned by `deploy`, `chmod 600`:
```dotenv
DOMAIN=tianguiswatt.com
ACME_EMAIL=you@example.com
POSTGRES_USER=tianguiswatt
POSTGRES_PASSWORD=<openssl rand -base64 24>
POSTGRES_DB=tianguiswatt
CLICKHOUSE_USER=tianguiswatt
CLICKHOUSE_PASSWORD=<openssl rand -base64 24>
CLICKHOUSE_DB=tianguiswatt
```
```bash
sudo mkdir -p /opt/tianguiswatt && sudo chown deploy:deploy /opt/tianguiswatt
```

## Deploying
Push/merge to `main`. The workflow builds → pushes to GHCR → SSHes to the VM → pulls →
runs migrations → `up -d`. Traefik requests a Let's Encrypt cert for `tianguiswatt.com`
automatically (needs DNS pointing at the VM + port 80 open). First cert issuance takes a
few seconds.

## Operating
- **Images:** `ghcr.io/sebastianarce/tianguiswatt-{backend,frontend,orchestrator}`.
- **Dagster UI** (internal, no auth): `ssh -L 3000:localhost:3000 deploy@tianguiswatt.com`,
  then open <http://localhost:3000>.
- **Logs:** `docker compose -f compose.yml -f compose.prod.yml logs -f <service>` on the VM.
