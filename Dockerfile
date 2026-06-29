ARG APP_PATH=/opt/outline
FROM node:26.3.0 AS base

ARG APP_PATH
WORKDIR $APP_PATH
COPY ./package.json ./yarn.lock ./.yarnrc.yml ./
COPY ./.yarn/patches ./.yarn/patches
COPY ./patches ./patches

RUN apt-get update && apt-get install -y cmake
ENV NODE_OPTIONS="--max-old-space-size=24000"

RUN npm install -g corepack@0.35.0 && \
  corepack enable && \
  corepack prepare yarn@4.11.0 --activate
RUN yarn install --immutable --network-timeout 1000000 && \
  yarn cache clean

COPY . .
ARG CDN_URL
RUN yarn build

RUN yarn workspaces focus --production && \
  yarn cache clean

ENV PORT=3000

# ---
FROM node:26.3.0-slim AS runner

LABEL org.opencontainers.image.source="https://github.com/outline/outline"

ARG APP_PATH
WORKDIR $APP_PATH
ENV NODE_ENV=production
ENV FILE_STORAGE=local
ENV FILE_STORAGE_LOCAL_ROOT_DIR=/var/lib/outline/data
ENV FILE_STORAGE_UPLOAD_MAX_SIZE=262144000

# Create a non-root user compatible with Debian and BusyBox based images
RUN addgroup --gid 1001 nodejs && \
    adduser --uid 1001 --ingroup nodejs nodejs && \
    mkdir -p /var/lib/outline && \
    chown -R nodejs:nodejs /var/lib/outline && \
    chown -R nodejs:nodejs $APP_PATH

COPY --from=base --chown=nodejs:nodejs $APP_PATH/build ./build
COPY --from=base --chown=nodejs:nodejs $APP_PATH/server ./server
COPY --from=base --chown=nodejs:nodejs $APP_PATH/public ./public
COPY --from=base --chown=nodejs:nodejs $APP_PATH/.sequelizerc ./.sequelizerc
COPY --from=base --chown=nodejs:nodejs $APP_PATH/node_modules ./node_modules
COPY --from=base --chown=nodejs:nodejs $APP_PATH/package.json ./package.json

RUN node -e "require('jsonwebtoken'); console.log('jsonwebtoken dependency check passed')"

# Install wget to healthcheck the server
RUN  apt-get update \
    && apt-get install -y wget \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "$FILE_STORAGE_LOCAL_ROOT_DIR" && \
    chown -R nodejs:nodejs "$FILE_STORAGE_LOCAL_ROOT_DIR" && \
    chmod 1777 "$FILE_STORAGE_LOCAL_ROOT_DIR"

VOLUME /var/lib/outline/data

USER nodejs

HEALTHCHECK --interval=1m CMD wget -qO- "http://localhost:${PORT:-3000}/_health" | grep -q "OK" || exit 1

EXPOSE 3000
CMD ["node", "build/server/index.js"]
