FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS development
WORKDIR /app/backend
EXPOSE 4000
CMD ["pnpm", "dev"]

FROM dependencies AS builder
COPY backend ./backend
WORKDIR /app/backend
RUN pnpm build

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 trackly
COPY --from=builder --chown=trackly:nodejs /app/backend/dist ./dist
COPY --from=dependencies --chown=trackly:nodejs /app/backend/node_modules ./node_modules
COPY --from=builder --chown=trackly:nodejs /app/backend/package.json ./package.json
USER trackly
EXPOSE 4000
CMD ["node", "dist/server.js"]
