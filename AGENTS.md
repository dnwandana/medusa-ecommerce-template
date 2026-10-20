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
- ESLint has one flat config in each app (`eslint.config.mjs`). The storefront config uses
  `@nuxt/eslint`. The backend config uses `typescript-eslint`.
- Prettier has one config at the root (`.prettierrc.json`): no semicolons, double quotes, and a
  line width of 100. `.prettierignore` excludes the shadcn-vue files in `components/ui/` and the
  MikroORM migrations.
  - `prettier-plugin-tailwindcss` sorts the Tailwind classes in `apps/storefront` only. It sorts
    the `class` attributes and the arguments of `cn()` and `cva()`. It reads the theme from
    `app/assets/css/tailwind.css`.
  - The plugin does not run on the backend. The admin extensions use the Tailwind preset of
    Medusa UI, not the storefront theme.
- There is no type-check script in the repository.

## Commands

Run the commands from the repository root.

```bash
docker compose -f docker-compose.local.yml up -d --wait   # PostgreSQL 5432, Redis 6379, Garage 3900 and 3902, Mailpit 1025 and 8025
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

pnpm lint                                   # ESLint in both apps
pnpm lint:fix
pnpm format                                 # Prettier writes all files
pnpm format:check
```

- `pnpm test` stops at the first failed step.
- `pnpm test` does not run `test:integration:modules`.
- `pnpm test` does not run the linter or the formatter. Run `pnpm lint` and `pnpm format:check`
  before you commit.
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
- Customers sign in with a magic link. They have no password.
  - The storefront gets a JWT from `POST /store/magic-link/session`. It sends the JWT one time to
    `POST /auth/session`. The session cookie then replaces the JWT.
  - `medusa-config.ts` sets `authMethodsPerActor: { user: ["emailpass"], customer: [] }`. This
    closes the customer `emailpass` routes. Admin users keep `emailpass`.
- Custom Store API routes that the storefront uses:
  - `/store/reviews`, `/store/products/:id/reviews`, `/store/customers/me/reviewable-items`.
  - `/store/customers/me/wishlist`, `/store/customers/me/wishlist/items[/:id]`.
  - `/store/bank-transfer`.
  - `/store/storefront/settings`, `/store/storefront/home-campaign`,
    `/store/storefront/home-categories`.
  - `/store/storefront/catalog/filters`, `/store/storefront/catalog/products`. The catalog routes
    take `category_id` as a list. The category page sends the category and all its descendant
    categories.
  - `/store/magic-link[/verify|/confirm|/status|/session]`, `/store/customers/me/welcome`.
  - `/store/orders/:id/tracking`.
  - `/store/orders/:id/receipts`, `/store/payment-states`. The storefront adds the payment state of
    each order as `order.payment_state`.
- Custom Admin API routes that the order widget uses: `/admin/orders/:id/receipts`,
  `/admin/orders/:id/receipts/accept`, `/admin/orders/:id/receipts/ask-for-more`, and
  `/admin/orders/:id/receipts/cancel`.
- `apps/storefront/AGENTS.md` gives the composable that calls each route. `apps/backend/AGENTS.md`
  gives the modules, the workflows, and the subscribers behind the routes.
- The option names and the metadata keys have one copy in each app. Change the two copies
  together.
  - Option names: `apps/backend/src/lib/option-names.ts` and
    `apps/storefront/app/utils/optionNames.ts`.
  - Metadata keys: `apps/backend/src/lib/storefront-metadata.ts`. The storefront reads
    `product_details`, `colour_hex`, and `welcome_sent_at` in `app/utils/productDetails.ts`,
    `app/utils/colourDots.ts`, and `app/composables/useCustomer.ts`.
    The key `locale` (`CUSTOMER_LOCALE`) is on the customer. The backend writes it. The storefront
    does not read it.
    The keys `cancel_reason`, `cancel_note`, and `review_request_sent_at` are on the order. Only
    the backend reads and writes them.
    The key `low_stock_alerted_at` (`INVENTORY_LOW_STOCK_ALERTED_AT`) is on the inventory item.
    Only the low stock subscriber reads and writes it.
  - The wishlist item columns `saved_unit_price`, `available`, and `alerted_at` hold the state of
    the wishlist alerts. Only the backend reads and writes them.
- The emails exist in English (`en-US`) and Indonesian (`id-ID`).
  - An order email uses the order locale. The storefront sets it on the cart (`locale` on
    `cart.create` and `cart.update`).
  - The sign-in email and the welcome email use the header `x-medusa-locale`. Links in
    Indonesian emails have the prefix `/id`.
  - The `wishlist-alert` email (back in stock and price drop) uses the customer locale
    (`customer.metadata.locale`).
  - The owner emails stay in English. The `low-stock-owner` email goes to the owner when the
    stock of a variant crosses the low stock threshold.
- To change the email provider, read `docs/email/README.md` and the doc of the provider. The
  template sends over SMTP with the `smtp` provider. Development sends to Mailpit.
- The store has one region (Indonesia), one currency (`idr`), and amounts in whole rupiah. No code
  divides an amount by 100.
- Provider ids that both apps depend on:
  - Payment: `pp_bank-transfer_bank-transfer` (`BANK_TRANSFER_PROVIDER_ID` in
    `apps/backend/src/modules/bank-transfer/constants.ts`). In the storefront, only
    `app/utils/bankTransfer.ts` and the locale files name it.
  - Fulfillment: `weight-shipping_weight-shipping`.

### Checkout and payment flow

1. The storefront `/checkout` page updates the cart, lists the shipping options, and adds a
   shipping method.
2. The storefront lists the payment providers of the region. The customer selects one.
3. The storefront calls `initiatePaymentSession` with the selected provider id and the customer
   object (`startPayment` in `apps/storefront/app/composables/useCheckout.ts`).
4. Bank transfer: the session has no `payment_url`. The storefront completes the cart at once and
   opens `/orders/:id`.
   - The order page shows the bank accounts and the receipt upload until the admin captures the
     payment. The bank accounts come from `/store/bank-transfer`.
   - The owner checks the receipts in the order widget. **Accept payment** captures the payment.
     The `payment.captured` subscriber then sends the `payment-confirmed` email.
   - **Cancel order** in the order widget takes an optional note. The note goes into the
     `order-cancelled` email.
   - The job `cancel-unpaid-orders` cancels an unpaid order with no receipt after 24 hours.
5. Redirect gateway: the session has an https `payment_url`. The browser goes to that page. The
   gateway redirects to `${STOREFRONT_URL}/checkout/return`, a URL with no locale prefix. The
   return page calls `cart.complete` with retries.
   - To add a gateway, read `docs/payments/README.md` and the doc of the gateway.
6. Two other paths complete a paid gateway cart:
   - The webhook: `POST /hooks/payment/<provider_id>`. This is the Medusa built-in route.
   - The job `check-paid-carts`, which runs every 15 minutes. It checks the providers in
     `RECOVERY_ADAPTERS` (`apps/backend/src/recovery/adapters.ts`). The list is empty in the
     template.
7. Staff create a shipment in the admin. The `shipment.created` subscriber sends the
   `order-shipped` email with the tracking number. `GET /store/orders/:id/tracking` returns the
   shipments. The order page shows them below the order tracker.
8. Staff mark the fulfillment as delivered. The `delivery.created` subscriber sends the
   `order-delivered` email. Seven days later, the job `review-requests` sends the
   `review-request` email for the products with no review.

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
