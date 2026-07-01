# Frontend dev image — runs the Vite dev server (HMR) inside compose.
# For production the app is built to static files and served by Traefik (deploy issue).
FROM oven/bun:1.3-slim
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
EXPOSE 5173
CMD ["bun", "run", "dev", "--host"]
