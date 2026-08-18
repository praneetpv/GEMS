# ---- deps: install once, reused by both later stages via COPY ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- builder: prisma generate + next build ----
FROM node:20-slim AS builder
WORKDIR /app
# node:20-slim ships without the openssl CLI, which Prisma's engine needs to
# detect the right libssl version — without it, `prisma generate` silently
# fetches the wrong engine binary and it crashes at runtime with no clean error.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: production runtime ----
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT=3000

# `npm run start` runs `prisma db push` (schema sync, no migration files)
# before `next start` — see package.json.
CMD ["npm", "run", "start"]
