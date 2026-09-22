FROM node:22.22.2-bookworm AS builder

ARG NODE_ENV=production
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /misskey

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global corepack@0.36.0
RUN corepack enable
RUN corepack install --global pnpm@12.5.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/backend/package.json packages/backend/.npmrc ./packages/backend/
COPY packages/client/package.json packages/client/.npmrc ./packages/client/
COPY packages/sw/package.json packages/sw/.npmrc ./packages/sw/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . ./
RUN pnpm build

FROM node:22.22.2-bookworm-slim AS runner

WORKDIR /misskey

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg tini \
    && rm -rf /var/lib/apt/lists/*

COPY . ./
COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY --from=builder /misskey/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=builder /misskey/packages/backend/built ./packages/backend/built
COPY --from=builder /misskey/packages/client/node_modules ./packages/client/node_modules

ENV NODE_ENV=production
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=6 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/robots.txt').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
CMD ["sh", "/misskey/scripts/docker-entrypoint.sh"]
