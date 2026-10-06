FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @dos/admin build

ENV NODE_ENV=production

CMD ["corepack", "pnpm", "--filter", "@dos/admin", "start"]
