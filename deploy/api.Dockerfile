FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @dos/shared-types build
RUN corepack pnpm --filter @dos/api build

WORKDIR /app/apps/api

ENV NODE_ENV=production

CMD ["node", "dist/apps/api/src/main.js"]
