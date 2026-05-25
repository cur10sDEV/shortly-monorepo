FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json .
RUN npm ci --silent

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S -G app app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
USER app
EXPOSE 3000
CMD ["npx", "vite", "preview", "--port", "3000", "--host"]
