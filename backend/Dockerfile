FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client from production schema (PostgreSQL)
RUN npx prisma generate --schema=./prisma/schema.prod.prisma

# Compile TypeScript
RUN npm run build

# ─── Production runner ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/lib ./src/lib

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prod.prisma --accept-data-loss && npx tsx prisma/seed.ts && node dist/index.js"]
