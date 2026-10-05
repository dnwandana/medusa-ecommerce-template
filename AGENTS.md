# AGENTS.md

This file gives guidance to AI coding agents that work with code in this repository.

## Repository

- pnpm workspace with two packages: `@store/backend` (`apps/backend`, Medusa 2.21.2) and
  `@store/storefront` (`apps/storefront`, Nuxt 4).
- Node `>=24.21.0` and `pnpm@10.11.1` (root `package.json`). `.nvmrc` and the two Dockerfiles
  (`node:24-alpine`) name Node 24. Change all of them together.
- Each app has its own `AGENTS.md` and `README.md`.
- `docs/development.md` is the local setup procedure. `docs/deployment.md` is the production
  procedure.
- `docs/superpowers/` (design spec, implementation plans, `FOLLOW-UPS.md`) is gitignored. Parts of
  it do not match the current code, for example `pnpm bootstrap` does not exist.
- There is no ESLint, Prettier, or type-check script in the repository.

## Commands

Run the commands from the repository root.

```bash
docker compose -f docker-compose.local.yml up -d --wait   # PostgreSQL 5432, Redis 6379, Garage 3900 and 3902
# The Garage bucket and key need the one-time step 3 of docs/development.md.
pnpm install                                # also runs `nuxt prepare` in the storefront
pnpm --filter @store/backend exec medusa db:migrate
pnpm --filter @store/backend seed           # last line: PUBLISHABLE_KEY=pk_...
pnpm dev                                    # backend on 9000, storefront on 3000

pnpm test                                   # backend unit, backend integration:http, storefront
pnpm --filter @store/backend test:unit [path]
pnpm --filter @store/backend test:integration:http [path]
pnpm --filter @store/storefront test
pnpm --filter @store/storefront exec vitest run <path>
```

- `pnpm test` stops at the first failed step.
- `pnpm test` does not run `test:integration:modules`.
- The backend HTTP integration tests need PostgreSQL. The values come from `apps/backend/.env.test`
  (`localhost:5432`, user `postgres`). They do not need Redis or Garage, because
  `apps/backend/.env.test` sets `REDIS_URL=` and `S3_BUCKET=` empty.
- The repository has no deploy, env-check, or backup scripts. `docs/deployment.md` gives each
  production step as a command. Do not add scripts for these steps.
- When you add a key to `.env.example`, add the key to the table in `docs/deployment.md`.

## How the two apps connect

- The storefront calls the backend only through `@medusajs/js-sdk`
  (`apps/storefront/app/utils/medusaClient.ts`). It sends the publishable key and the header
  `x-medusa-locale` (`en-US` or `id-ID`) with each request.
- Customer auth uses the SDK `session` mode (an httpOnly cookie). Thus the storefront account pages
  are client-only, and the storefront and the API must be on the same site.
- Custom Store API routes that the storefront uses: `/store/reviews`,
  `/store/products/:id/reviews`, `/store/customers/me/reviewable-items`,
  `/store/customers/me/wishlist`, `/store/customers/me/wishlist/items[/:id]`.
- The store has one region (Indonesia), one currency (`idr`), and amounts in whole rupiah. No code
  divides an amount by 100.
- Provider ids that both apps depend on:
  - Payment: `pp_mayar_mayar` (`MAYAR_PROVIDER_ID` in `apps/storefront/app/composables/useCheckout.ts`).
  - Fulfillment: `weight-shipping_weight-shipping`.

### Checkout and payment flow

1. The storefront `/checkout` page updates the cart, lists the shipping options, and adds a
   shipping method.
2. The storefront calls `initiatePaymentSession` with `pp_mayar_mayar`. The backend Mayar provider
   creates a Mayar invoice and returns `payment_url`.
3. The browser goes to the Mayar page. Mayar redirects to `${STOREFRONT_URL}/checkout/return`.
   This URL has no locale prefix.
4. The return page calls `cart.complete` with retries. The provider `authorizePayment` asks the
   Mayar API and succeeds only for a paid invoice with the same amount.
5. Two other paths complete a paid cart:
   - The webhook: `POST /hooks/payment/mayar_mayar`. This is the Medusa built-in route.
   - The job `check-paid-carts`, which runs every 15 minutes.

## Production

- `docker-compose.yml` has the services `caddy`, `storefront`, `medusa-server`,
  `medusa-worker`, `postgres`, `redis`, and `garage`. Only `caddy` publishes ports.
- The server env file is `.env`, from `.env.example`. Compose reads `docker-compose.yml` and
  `.env` automatically. Development uses `docker-compose.local.yml` and never a root `.env`.
- `medusa-server` and `medusa-worker` use one image (`store-backend`). Only `medusa-server` builds it.
- The Caddy hosts are `<domain>` (storefront), `api.<domain>` (backend), and `assets.<domain>`
  (Garage web endpoint for the product images).
- A deploy has these steps. `docs/deployment.md` gives the commands.
  1. Pull the code.
  2. Check `.env` against the rules in `docs/deployment.md`.
  3. Build the two images, one at a time.
  4. Run `medusa db:migrate --execute-safe-links`.
  5. Start the services.
- The admin dashboard gets `MEDUSA_BACKEND_URL` at image build time.
- Both Dockerfiles use the repository root as the build context.

## Conventions

- The prose in the docs and in the code comments uses ASD-STE100 Simplified Technical English:
  short sentences, active voice, one term for one thing.
- Code comments state the reason for the code.
