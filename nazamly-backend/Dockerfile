# ──────────────────────────────────────────────────────────────────
#  Nazamly Backend — Production Docker Image
# ──────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# ── Stage 2: Production image ────────────────────────────────────
FROM node:22-alpine

LABEL maintainer="Nazamly Team"
LABEL description="Nazamly Backend API Server"

RUN addgroup -S nazamly && adduser -S nazamly -G nazamly

WORKDIR /app

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package.json server.js ./
COPY src/ ./src/

# Copy utility & seed scripts
COPY check-env.js check-models.js checkModels.js check-schedule.js ./
COPY seed-courses.js seed.js undo-seed.js scratch.js ./
COPY get-drive-token.js getToken.js ./
COPY scripts/ ./scripts/

# Create uploads directory & set ownership
RUN mkdir -p uploads && chown -R nazamly:nazamly /app

ENV PORT=5000
EXPOSE 5000

USER nazamly

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api || exit 1

CMD ["node", "server.js"]
