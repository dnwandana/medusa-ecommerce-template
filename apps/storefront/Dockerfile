# Build context: the repository root.
FROM node:24-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@10.11.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
# The postinstall script (nuxt prepare) needs the source, so copy it before the install.
COPY apps/storefront apps/storefront
RUN pnpm install --frozen-lockfile --filter @store/storefront...
RUN pnpm --filter @store/storefront build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 NITRO_PORT=3000
COPY --from=build /repo/apps/storefront/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
