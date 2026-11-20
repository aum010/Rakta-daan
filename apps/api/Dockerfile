FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig*.json ./apps/api/

# Install dependencies
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production

WORKDIR /app/apps/api
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Set permissions
RUN chown -R nestjs:nodejs /app/apps/api/dist

USER nestjs

EXPOSE 4000
ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "apps/api/dist/main.js"]
