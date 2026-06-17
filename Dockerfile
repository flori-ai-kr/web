# syntax=docker/dockerfile:1
# flori web (Next.js 16) — standalone 멀티스테이지. ARM64(arm64) 네이티브 빌드.
# next.config.ts 의 validateEnv() 가 `next build` 시점에 실행되므로
# NEXT_PUBLIC_VAPID_PUBLIC_KEY(클라 번들에 baked) + INTERNAL_API_KEY(검증 통과용)가 build 에 필요하다.
# INTERNAL_API_KEY 실값은 런타임(.env.web)에서 주입 — 이미지엔 placeholder 만 들어간다.

ARG PNPM_VERSION=10.33.2

# --- deps: 의존성 설치 (pnpm) ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- builder: next build → .next/standalone ---
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 타임 env (validateEnv). NEXT_PUBLIC_* 는 클라 번들에 baked → 런타임 .env.web 으로는 못 바꾼다.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
# 웹 애널리틱스(GA4/Clarity). 공개값이라 클라 번들에 baked.
# 미설정 시 빈 값("") → 해당 기능 비활성(env.ts 가 빈 문자열을 undefined 로 정규화).
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=""
ARG NEXT_PUBLIC_CLARITY_PROJECT_ID=""
# STORAGE_PUBLIC_URL(CloudFront 공개 호스트) — next.config 의 images.remotePatterns·CSP 가
# build 시점에 required-server-files.json 으로 굳으므로 build-arg 로 넣어야 한다.
# 런타임 .env.web 에만 있으면 standalone 의 이미지 최적화/CSP 에 반영되지 않는다.
ARG STORAGE_PUBLIC_URL=""
# INTERNAL_API_KEY 는 검증(min 32)만 통과시키는 placeholder. 실값은 런타임에서 주입.
ARG INTERNAL_API_KEY="build-time-placeholder-internal-key-not-used-at-runtime"
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID}
ENV NEXT_PUBLIC_CLARITY_PROJECT_ID=${NEXT_PUBLIC_CLARITY_PROJECT_ID}
ENV STORAGE_PUBLIC_URL=${STORAGE_PUBLIC_URL}
ENV INTERNAL_API_KEY=${INTERNAL_API_KEY}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# --- runner: standalone 실행 ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 비루트 사용자
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
