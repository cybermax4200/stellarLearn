FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/service-auth/ apps/service-auth/
RUN npm ci
RUN npm run build --workspace=@stellarlearn/stellar-sdk-utils
RUN npm run build --workspace=@stellarlearn/service-auth

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/stellar-sdk-utils/dist ./packages/stellar-sdk-utils/dist
COPY --from=builder /app/packages/stellar-sdk-utils/package.json ./packages/stellar-sdk-utils/package.json
COPY --from=builder /app/apps/service-auth/dist ./apps/service-auth/dist
COPY --from=builder /app/apps/service-auth/package.json ./apps/service-auth/package.json

EXPOSE 3001
CMD ["node", "apps/service-auth/dist/index.js"]
