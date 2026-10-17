# AGENTS.md

This file gives guidance to AI coding agents that work with code in `apps/backend`.

The backend is Medusa 2.21.2 (`@store/backend`). All `@medusajs/*` packages are pinned to 2.21.2,
except `@medusajs/ui`. See the root `AGENTS.md` for the workspace and the cross-app flow.

## Commands

Run the commands from the repository root.

```bash
pnpm --filter @store/backend dev                          # medusa develop, port 9000
pnpm --filter @store/backend build                        # output in .medusa/server
pnpm --filter @store/backend exec medusa db:migrate
pnpm --filter @store/backend exec medusa db:generate <module>   # new migration for a custom module
pnpm --filter @store/backend seed
pnpm --filter @store/backend test:unit [path]
pnpm --filter @store/backend test:integration:http [path]
pnpm --filter @store/backend lint                         # ESLint, eslint.config.mjs
```

- Jest selects the files from `TEST_TYPE` (`jest.config.js`):
  - `unit`: `src/**/__tests__/**/*.unit.spec.[jt]s`.
  - `integration:http`: `integration-tests/http/*.spec.[jt]s`.
  - `integration:modules`: `src/modules/*/__tests__/**/*.[jt]s`. No module integration tests exist.
- Run Jest only through these scripts. They set `TEST_TYPE` and `NODE_OPTIONS`.
- `jest.config.js` calls `loadEnv("test")`. Values in `.env.test` win over values in `.env`.
- `.env.test` sets an empty `REDIS_URL` and an empty `S3_BUCKET`. The tests need only PostgreSQL.
- The HTTP integration tests use `medusaIntegrationTestRunner`. Many of them call `runSeed`.
- `integration-tests/helpers/` has helpers for actors (customer and admin JWTs), checkout, and
  shipping. `placeOrder(ctx, items)` in `checkout.ts` places an order with bank transfer.

## Configuration

- `medusa-config.ts` gets the module list from `buildModules(process.env)` in
  `src/config/modules.ts`. That file contains pure functions with unit tests in
  `src/config/__tests__/`.
- `featureFlags.translation: true` is required for the Translation Module.
- The admin path is the Medusa default `/app`.
- Conditional modules:
  - `REDIS_URL` set: the Redis event bus, workflow engine, caching, and locking modules load.
    Otherwise Medusa uses its in-memory modules.
  - `BREVO_API_KEY` set: the `brevo` provider sends email. Otherwise `notification-local` writes the
    email to the log.
  - `S3_BUCKET` set: the S3 file provider loads (Garage options: `forcePathStyle`, `acl: false`).
    Development sets it to the Garage of `docker-compose.local.yml`. The key comes from step 3
    of `docs/development.md`. `.env.test` sets `S3_BUCKET=` empty, so the tests store the files
    in `static/`.
- The bank transfer payment provider is always registered. It needs no env key.
- These conditions stop startup with an error:
  - `SHIPPING_RATE_PER_KG` is not a positive integer.
  - `BREVO_API_KEY` has a value and `BREVO_SENDER_EMAIL` is empty.
  - `S3_BUCKET` has a value and an `S3_` key is missing.

## Source layout

- `src/api/`: file-based routes. Each `route.ts` exports `GET`, `POST`, or `DELETE` and its zod
  schema.
- `src/api/middlewares.ts`: applies `authenticate`, `validateAndTransformBody`, and
  `validateAndTransformQuery` to the custom routes.
- `src/modules/`:
  - `bank-transfer/`: payment provider (identifier `bank-transfer`, stored id
    `pp_bank-transfer_bank-transfer`). The constants `BANK_TRANSFER_PROVIDER_ID` and
    `PAYMENT_DEADLINE_MS` are in `constants.ts`.
  - `bank-account/`: data module `bankAccount` with the models `bank_account` and `store_contact`.
    The service adds `getContact()` and `setContact()`, because the module keeps one contact row.
  - `weight-shipping/`: fulfillment provider. `calculate.ts` has the weight rule: grams, rounded up
    to whole kg, minimum 1 kg, and 1000 g for a variant with no weight.
  - `brevo/`: notification provider. The templates are in `templates/`: `order-placed`,
    `paid-cart-alert`, and `password-reset`.
  - `product-review/`: data module `productReview` with the model `review`.
  - `wishlist/`: data module `wishlist` with the models `wishlist` and `wishlist_item`.
  - Each data module has its own `migrations/`.
- `src/links/`: read-only links (`readOnly: true`) from `review`, `wishlist`, and `wishlist_item`
  to product, customer, and productVariant.
- `src/workflows/`: `create-review`, `update-review-status`, `add-wishlist-item`, and
  `remove-wishlist-item`. Shared steps are in `src/workflows/steps/`.
- `src/subscribers/`: `order.placed` sends the order email. For an unpaid bank transfer order,
  the email has the amount, the active bank accounts, and the deadline in WIB.
  `auth.password_reset` sends the reset link.
- `src/jobs/check-paid-carts.ts` is the job definition (`*/15 * * * *`).
  - The logic is in `src/recovery/check-paid-carts.ts`.
  - The wiring to Query, Notification, and Cart is in `src/recovery/dependencies.ts`. The
    adapters are in `src/recovery/adapters.ts`.
  - `RECOVERY_ADAPTERS` is empty, so the job returns at once and writes no log line.
- `src/seed/`: idempotent seed steps for the region, the bank account, fulfillment, products, and
  the API key. `bank-account.ts` adds the "Sample Bank" account and the sample contact only when
  the owner has no data. `src/scripts/seed.ts` runs the seed steps and prints the publishable
  key.
- `src/admin/`: the admin **Reviews** page (`routes/reviews/page.tsx`) and the **Settings → Bank
  transfer** page (`routes/settings/bank-transfer/page.tsx`). The pure helpers are in `lib/` and
  have unit tests. The admin code has its own `tsconfig.json`. The root `tsconfig.json` excludes
  `src/admin`.

## Code conventions

- Mutations go through workflows (`createWorkflow`, `createStep`, `StepResponse`). Each step has a
  compensation function.
  The Admin routes for the bank accounts and the store contact call the `bankAccount` service
  directly. Each request changes one record of one module, so there is nothing to compensate.
- Reads use `query.graph` or the module services.
- Routes do not catch errors. They throw `MedusaError` and Medusa's error handler formats the
  response.
- Subscribers and jobs catch all errors and log them.
- Import zod from `@medusajs/framework/zod`. Request body schemas use `.strict()`.
- List queries use `createFindParams` from `@medusajs/medusa/api/utils/validators`.
- Routes take `customer_id` from `auth_context.actor_id`. The review data (`product_id` and the
  names) comes from the database, not from the request.
- Log and error messages do not contain secrets, tokens, or email addresses.
- Files are kebab-case. Data modules export a module constant, for example
  `PRODUCT_REVIEW_MODULE = "productReview"`.
- The code has no semicolons and uses double quotes (`.prettierrc.json`).
- Unit tests sit in `__tests__/` next to the code and use the suffix `.unit.spec.ts`.

## Bank transfer provider facts

- `authorizePayment` returns `authorized` at once. The cart becomes an order at checkout.
- `initiatePayment` returns no `payment_url`, so the storefront does not redirect.
- The session data has no customer data. The order already has the customer contact.
- `getWebhookActionAndData` returns `not_supported`. A bank transfer sends no webhook.
- `capturePayment` does nothing. The owner captures the payment in the Medusa Admin after the
  money arrives.
- `refundPayment` does nothing. The owner returns the money outside of Medusa.
- The deadline is the order time plus `PAYMENT_DEADLINE_MS` (24 hours).
- An unpaid bank transfer order has a payment collection with the status `authorized` and a payment
  session with the provider id `pp_bank-transfer_bank-transfer`.

## Docker

- `Dockerfile` builds with `pnpm --filter @store/backend build` and deletes the compiled
  `__tests__` folders.
- The runtime stage runs from `/server`, because `/app` is the admin path. It runs
  `npm install --omit=dev` there and starts with `npm run start` on port 9000.
- In production, `MEDUSA_WORKER_MODE` is `server` or `worker`. The seed runs as
  `npx medusa exec ./src/scripts/seed.js` (compiled JS).
