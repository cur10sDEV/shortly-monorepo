FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json .
RUN npm ci --silent

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add dumb-init
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
