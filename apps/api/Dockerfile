# Production Dockerfile for GYMCARE CRM API (Fastify / Node.js)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and package files
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/

# Install all dependencies
RUN npm install

# Copy source code
COPY packages/shared/src ./packages/shared/src
COPY apps/api/src ./apps/api/src

# Build packages
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=@gymcare/api

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV API_HOST=0.0.0.0

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
