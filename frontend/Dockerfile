# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm matching packageManager version
RUN npm install -g pnpm@9.0.0

# Copy package config files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application source code
COPY . .

# Build-time arguments for Next.js static bundling
ARG NEXT_PUBLIC_AUTH_PROVIDER=nextauth
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

ENV NEXT_PUBLIC_AUTH_PROVIDER=$NEXT_PUBLIC_AUTH_PROVIDER
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client if schema exists
RUN npx prisma generate || true

# Build Next.js
RUN pnpm build

# Stage 2: Run the application
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install pnpm globally for execution scripts
RUN npm install -g pnpm@9.0.0

# Copy production assets and compiled builds
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Start Next.js in production mode
CMD ["pnpm", "start"]
