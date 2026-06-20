# ---- שלב התקנה ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- שלב בנייה ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# כתובת האתר נדרשת בזמן בנייה ל-metadata/SEO; אפשר לדרוס בזמן ריצה
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build
# מבטיח שתיקיית public קיימת גם אם היא ריקה (לשלב ה-COPY בהמשך)
RUN mkdir -p /app/public

# ---- שלב ריצה ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# פלט standalone של Next
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# תיקיית האחסון המקומי (file store) ומטמון ה-ISR - חייבות להיות ניתנות לכתיבה
RUN mkdir -p /app/.data /app/.next/cache \
  && chown -R nextjs:nodejs /app/.data /app/.next

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
