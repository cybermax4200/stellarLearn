FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY apps/storage/ apps/storage/
RUN npm ci
RUN npm run build --workspace=@stellarlearn/storage

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/storage/dist ./apps/storage/dist
COPY --from=builder /app/apps/storage/package.json ./apps/storage/package.json

EXPOSE 3004
CMD ["node", "apps/storage/dist/index.js"]
