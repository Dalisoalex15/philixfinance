#!/bin/bash
set -e

# Install root deps (prisma, esbuild, tsx, etc.)
npm install

# Generate Prisma client for production (Linux binary)
npx prisma generate --schema=backend/prisma/schema.prod.prisma

# Push schema to Neon database
npx prisma db push --schema=backend/prisma/schema.prod.prisma --accept-data-loss

# Seed database (allowed to fail if already seeded)
npx tsx backend/prisma/seed.ts || true

# Build frontend
npm install --prefix frontend
npm run build --prefix frontend

# ── Vercel Build Output API v3 ─────────────────────────────────────────────
mkdir -p .vercel/output/static
mkdir -p .vercel/output/functions/api/index.func

# 1. Static files — copy Vite build
cp -r frontend/dist/. .vercel/output/static/

# 2. Serverless function — bundle everything into one JS file
#    *.node files are native binaries and cannot be bundled
npx esbuild api/index.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --external:*.node \
  --outfile=.vercel/output/functions/api/index.func/index.js

# 3. Copy Prisma native binary alongside bundle (Prisma looks for it in __dirname)
find backend/generated/prisma -name "*.node" -exec cp {} .vercel/output/functions/api/index.func/ \; 2>/dev/null || true

# 4. Function runtime configuration
cat > .vercel/output/functions/api/index.func/.vc-config.json << 'VCEOF'
{
  "runtime": "nodejs18.x",
  "handler": "index.js",
  "launcherType": "Nodejs",
  "shouldAddHelpers": true,
  "maxDuration": 30
}
VCEOF

# 5. Routing configuration (API → function, static files, SPA catch-all)
cat > .vercel/output/config.json << 'ROUTEEOF'
{
  "version": 3,
  "routes": [
    { "src": "^/api/(.*)$", "dest": "/api/index" },
    { "handle": "filesystem" },
    { "src": "^/(.*)$", "dest": "/index.html" }
  ]
}
ROUTEEOF
