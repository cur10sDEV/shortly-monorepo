# ------------------- Dependencies stage ------------------- #
FROM node:22-alpine AS deps

RUN apk update && apk -i add dumb-init

WORKDIR /app

COPY package*.json .

RUN npm ci --silent
# ------------------- Dependencies stage ------------------- #

# ------------------- Builder stage ------------------- #
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=production

RUN npm run build
# ------------------- Builder stage ------------------- #

# ------------------- Runtime stage ------------------- #
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# install dumb-init for proper signal handling
RUN apk add dumb-init

# create non-root user
RUN addgroup -S app && adduser -S -G app app

# copy only what's needed
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# copy public folder
COPY --from=builder /app/public ./public

# copy built output if present
COPY --from=builder /app/dist ./dist

USER app

EXPOSE 8000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "start:docker"]
# ------------------- Runtime stage ------------------- #
