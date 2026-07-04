# TianguisWatt

> Near-real-time analytics for the GB electricity market — live generation, demand, carbon,
> prices, and the balancing mechanism, from source APIs to an interactive dashboard.

**Live → [tianguiswatt.com](https://tianguiswatt.com)**

![The TianguisWatt control-room dashboard](docs/images/dashboard.png)

TianguisWatt ingests live data from the Great Britain power grid every few minutes, transforms
it in a **ClickHouse** warehouse with **dbt**, and serves it through a **FastAPI** backend to an
interactive **React** dashboard — an operations-style "control room" plus explorers for the
balancing-mechanism bid stack and time-range trends.

It's a portfolio piece built as a *complete, production-deployed* data platform — ingestion →
warehouse → API → UI → CI/CD — rather than a notebook or a toy. The full design rationale lives
in **[docs/architecture.md](docs/architecture.md)**.

## What it shows

- **Control room** — the live generation mix over 24h, interconnector flows, system frequency,
  carbon intensity, price, net imbalance, and the balancing actions NESO most recently accepted.
- **Bid-stack explorer** — the balancing-mechanism offer stack (merit order), cheapest-first,
  with the actions the system operator accepted highlighted.
- **Trends** — any core metric over a chosen window and granularity, aggregated server-side in
  ClickHouse from a long-format rollup.
- **Learn** — a short explainer of how the GB marginal-price market sets a price.

Data updates push to the browser live over Server-Sent Events, and a freshness badge shows how
recent the data is (and turns amber if the pipeline stalls).

## Architecture

```mermaid
flowchart LR
  subgraph Sources
    E[Elexon Insights API]
    N[NESO Carbon Intensity]
  end
  subgraph Ingest["Orchestration"]
    D["Dagster assets<br/>schedule ~15 min"]
  end
  subgraph Warehouse["ClickHouse + dbt"]
    R[("raw.*<br/>ReplacingMergeTree")]
    M[("marts<br/>staging views → tables")]
  end
  subgraph Serve
    A["FastAPI<br/>REST + SSE"]
    F["React SPA<br/>ECharts"]
  end
  E --> D
  N --> D
  D --> R
  R -->|dbt: staging → marts| M
  M --> A
  A --> F
```

Data flows one way: external APIs → Dagster ingestion → ClickHouse `raw` tables (deduplicated by
an ingest version) → dbt staging views → dbt mart tables → FastAPI (REST + Server-Sent Events) →
the React SPA (typed against the API's OpenAPI schema). See
**[docs/architecture.md](docs/architecture.md)** for the detail and the design decisions behind it.

## Tech stack

| Layer | Tools |
|---|---|
| **Data & orchestration** | ClickHouse (OLAP), dbt (transform), Dagster (assets + schedule) |
| **Ingestion** | Python 3.12, httpx, pydantic — Elexon Insights + NESO Carbon Intensity |
| **Backend** | FastAPI, pydantic-settings, clickhouse-connect; OpenAPI-typed |
| **Frontend** | React 19, TypeScript, Vite, Tailwind v4, ECharts, React Query, openapi-fetch |
| **Infra & CI/CD** | Docker Compose, Traefik + Let's Encrypt, GitHub Actions, GHCR, Hetzner |
| **Tooling** | uv (workspace monorepo), ruff, ty, oxlint, Playwright, bun |

## Repository layout

| Path | Contents |
|---|---|
| `orchestrator/` | Dagster assets + Elexon/NESO ingestion |
| `packages/shared/` | Shared pydantic models + ClickHouse migrations |
| `transform/` | dbt project — staging views, mart tables, data tests |
| `backend/` | FastAPI app (REST + SSE) |
| `frontend/` | React dashboard |
| `compose.yml` | Full stack (dev via `compose.override.yml`, prod via the `prod` profile) |
| `.github/workflows/` | `ci.yml` (PR checks) · `deploy.yml` (tag-triggered deploy) |

## Run it locally

Requires [Docker](https://docs.docker.com/get-docker/), [uv](https://docs.astral.sh/uv/), and
[bun](https://bun.sh/).

```bash
docker compose up -d      # postgres, clickhouse, redis, backend, frontend (dev)
./scripts/seed.sh         # migrate + ingest a first batch + build the dbt marts
# open the dashboard → http://localhost:5173
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the dev workflow (tests, linting, the typed client).

## Deployment

Pushing a `v*` tag triggers GitHub Actions to build the images (pushed to GHCR) and deploy to a
Hetzner VM behind Traefik with automatic TLS. Pull-request CI builds every image as a required
check. See [DEPLOY.md](DEPLOY.md).

## About the name

**TianguisWatt** blends *tianguis* — the Nahuatl word for an open-air marketplace, still used
across Mexico for the rotating street markets held since pre-Hispanic times — with the *watt*,
the unit of electrical power. Fitting for a project about the electricity **market**, watched in
real time.
