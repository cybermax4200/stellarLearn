FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/app-learner/ apps/app-learner/
RUN npm ci
RUN npm run build --workspace=@stellarlearn/stellar-sdk-utils
RUN npm run build --workspace=@stellarlearn/ui-kit
RUN npm run build --workspace=app-learner

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/app-learner/.next ./apps/app-learner/.next
COPY --from=builder /app/apps/app-learner/package.json ./apps/app-learner/package.json
COPY --from=builder /app/package*.json ./

EXPOSE 3000
WORKDIR /app/apps/app-learner
CMD ["npm", "start"]
