# Build context: the repository root.
FROM node:24-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@10.11.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN pnpm install --frozen-lockfile --filter @store/backend...
COPY apps/backend apps/backend
# The admin dashboard reads its API address at build time.
ARG MEDUSA_BACKEND_URL
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
RUN pnpm --filter @store/backend build
# medusa build also compiles the unit tests. Remove them, because the image must not
# contain test code.
RUN find apps/backend/.medusa/server/src -type d -name __tests__ -prune -exec rm -rf {} +

FROM node:24-alpine AS runtime
# /app is the path of the admin dashboard, so the work directory is /server.
WORKDIR /server
ENV NODE_ENV=production
RUN chown node:node /server
USER node
COPY --from=build --chown=node:node /repo/apps/backend/.medusa/server ./
RUN npm install --omit=dev
EXPOSE 9000
CMD ["npm", "run", "start"]
