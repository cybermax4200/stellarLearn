FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ai-triggers/ apps/ai-triggers/
RUN npm ci
RUN npm run build --workspace=@stellarlearn/stellar-sdk-utils
RUN npm run build --workspace=@stellarlearn/ai-triggers

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/stellar-sdk-utils/dist ./packages/stellar-sdk-utils/dist
COPY --from=builder /app/packages/stellar-sdk-utils/package.json ./packages/stellar-sdk-utils/package.json
COPY --from=builder /app/apps/ai-triggers/dist ./apps/ai-triggers/dist
COPY --from=builder /app/apps/ai-triggers/package.json ./apps/ai-triggers/package.json

EXPOSE 3003
CMD ["node", "apps/ai-triggers/dist/index.js"]
