FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/service-courses/ apps/service-courses/
RUN npm ci
RUN npm run build --workspace=@stellarlearn/service-courses

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/service-courses/dist ./apps/service-courses/dist
COPY --from=builder /app/apps/service-courses/package.json ./apps/service-courses/package.json

EXPOSE 3002
CMD ["node", "apps/service-courses/dist/index.js"]
