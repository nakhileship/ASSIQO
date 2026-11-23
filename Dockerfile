# ── Stage 1: install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .

EXPOSE 5000
CMD ["node", "src/index.js"]
