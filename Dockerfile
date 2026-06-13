FROM node:20-alpine AS base
WORKDIR /app

# ─── API Server ───────────────────────────────────────────────────
FROM base AS server-deps
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM base AS server-build
COPY server/package*.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/src ./src

FROM base AS server
ENV NODE_ENV=production
COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=server-build /app/node_modules/.prisma ./node_modules/.prisma
COPY server/package.json ./
COPY server/prisma ./prisma
COPY server/src ./src
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1
CMD ["sh", "-c", "npx prisma db push && node src/index.js"]

# ─── Client (NGINX) ───────────────────────────────────────────────
FROM base AS client-build
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:1.27-alpine AS client
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=client-build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
