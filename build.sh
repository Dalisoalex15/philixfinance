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

# Generate PNG icons from SVG using sharp (installed as dev dep) or skip gracefully
node -e "
const fs = require('fs');
const path = require('path');
const svgSrc = path.join('frontend/public/logo-icon.svg');
const svg = fs.readFileSync(svgSrc, 'utf8');

try {
  const sharp = require('sharp');
  const svgBuf = Buffer.from(svg);
  Promise.all([
    sharp(svgBuf).resize(192, 192).png().toFile('frontend/public/icon-192.png'),
    sharp(svgBuf).resize(512, 512).png().toFile('frontend/public/icon-512.png'),
    sharp(svgBuf).resize(180, 180).png().toFile('frontend/public/apple-touch-icon.png'),
    sharp(svgBuf).resize(1200, 630).flatten({ background: '#0B1F3A' }).png().toFile('frontend/public/og-image.png'),
  ]).then(() => console.log('✓ PNG icons generated'))
    .catch(e => console.warn('Icon generation failed:', e.message));
} catch {
  console.log('sharp not available — skipping PNG icon generation (SVG fallback in use)');
}
" || true

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
    { "src": "^/sitemap\\.xml$", "dest": "/sitemap.xml" },
    { "src": "^/robots\\.txt$", "dest": "/robots.txt" },
    { "src": "^/api/(.*)$", "dest": "/api/index" },
    { "handle": "filesystem" },
    { "src": "^/(.*)$", "dest": "/index.html" }
  ]
}
ROUTEEOF
