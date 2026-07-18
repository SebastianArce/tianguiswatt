# Deploying TianguisWatt

CD lives in `.github/workflows/deploy.yml`, triggered by **version tags** (`v*`). It builds
the three images, pushes them to **GHCR**, then — once enabled — deploys to a Hetzner VM over
SSH. (Pull-request CI validates the image builds; merges to `main` don't deploy.) Production
runs `compose.yml` with the `prod` profile
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
- `RELEASE_PLEASE_TOKEN` — a fine-grained PAT (Contents + Pull requests + Issues: write) so
  release-please can open the release PR **and** its tag triggers this deploy (see *Releasing*)

**3. GitHub Actions → Variables** (same page → Variables)
- `DOMAIN` = `tianguiswatt.com`
- `DEPLOY_ENABLED` = `true` — until set, a tag still builds/pushes images but the deploy
  step is skipped (so it doesn't try to deploy before the VM is ready).

> The DB passwords must stay **stable** after the first deploy — changing them won't match
> the existing Postgres/ClickHouse volumes.

## Releasing
Releases are automated with **release-please** (`.github/workflows/release-please.yml`). It
watches `main` and keeps a *release PR* up to date — a CHANGELOG + version bump derived from
the Conventional Commit messages since the last release. **Merging that release PR** cuts a
GitHub Release and a `v*` tag.

That tag triggers `deploy.yml`: build `:vX.Y.Z` + `:latest` → SSH to the VM → write `.env` →
pull → migrate → `up -d`. Traefik requests a Let's Encrypt cert for `tianguiswatt.com`
automatically (needs DNS + port 80 open); first issuance takes a few seconds.
**Rollback** = redeploy an earlier tag (Actions → Deploy → *Run workflow*, or re-push the tag).

> The release tag only fires the deploy because release-please uses the `RELEASE_PLEASE_TOKEN`
> PAT — GitHub suppresses workflow-triggered-by-workflow events when the default token creates
> the tag. You can always cut a release by hand instead: `git tag v0.1.0 && git push origin v0.1.0`.

## Operating
- **Images:** `ghcr.io/sebastianarce/tianguiswatt-{backend,frontend,orchestrator}`.
- **Dagster UI** (internal, no auth): `ssh -L 3000:localhost:3000 deploy@tianguiswatt.com`,
  then open <http://localhost:3000>.
- **Logs:** `docker compose -f compose.yml --profile prod logs -f <service>` on the VM.
- **Backfills** (one-off, idempotent — rerunning is safe): the scheduled assets only ingest
  the current day, so history must be loaded once per environment. On the VM, after the
  migrate step has run:

  ```bash
  cd /opt/tianguiswatt
  docker compose -f compose.yml --profile prod run --rm dagster-daemon python scripts/backfill_tariff_rates.py
  docker compose -f compose.yml --profile prod run --rm dagster-daemon python scripts/backfill_carbon.py
  ```

  (`dagster-daemon` is the prod service running the orchestrator image; `run --rm` matches
  how the deploy workflow executes one-offs.)
