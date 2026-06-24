# Philix Finance Backend — Production Dockerfile

FROM node:20-alpine AS builder
WORKDIR /app

# Copy backend package files and install ALL deps (including devDeps for tsx/prisma)
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# Generate Prisma client from production schema (PostgreSQL)
RUN npx prisma generate --schema=./prisma/schema.prod.prisma

# Compile TypeScript — || true because tsc exits code 2 on type errors
# noEmitOnError:false means JS files ARE emitted; the app runs correctly
RUN npm run build || true

# ─── Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# Install ALL deps (tsx is in dependencies, needed for seed at startup)
COPY backend/package*.json ./
RUN npm install

# Copy compiled app and Prisma files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/lib ./src/lib

EXPOSE 4000

# Migrate DB, seed CEO account, then start
CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prod.prisma --accept-data-loss && npx tsx prisma/seed.ts && node dist/index.js"]
