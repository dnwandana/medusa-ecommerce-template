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
  - `S3_BUCKET` set: the `paymentReceipt` module keeps the receipts in the private bucket
    `S3_RECEIPTS_BUCKET`, with the endpoint, the region, and the key of the File Module.
    `docker-compose.yml` sets `S3_RECEIPTS_BUCKET=store-receipts` in production. `S3_BUCKET`
    empty: the module keeps the receipts in `RECEIPTS_DIR` (default `uploads/receipts`, relative
    to the backend directory). `.gitignore` ignores `/uploads`.
- The bank transfer payment provider is always registered. It needs no env key.
- These conditions stop startup with an error:
  - `SHIPPING_RATE_PER_KG` is not a positive integer.
  - `BREVO_API_KEY` has a value and `BREVO_SENDER_EMAIL` is empty.
  - `S3_BUCKET` has a value and an `S3_` key is missing.
  - `S3_BUCKET` has a value and `S3_RECEIPTS_BUCKET` is empty or is the same as `S3_BUCKET`.

## Source layout

- `src/api/`: file-based routes. Each `route.ts` exports `GET`, `POST`, or `DELETE` and its zod
  schema.
- `src/api/middlewares.ts`: applies `authenticate`, `validateAndTransformBody`, and
  `validateAndTransformQuery` to the custom routes. A newer route group has its own
  `middlewares.ts` that exports a `MiddlewareRoute[]`, for example
  `api/admin/storefront/middlewares.ts`. `src/api/middlewares.ts` spreads each array.
- The catalog routes and the home categories route (`src/api/store/storefront/`) return the
  display text in the request locale.
  - `catalog/products`, `home-categories`, and `catalog/filters` pass `{ locale: req.locale }` as
    the second argument of `query.graph`, as the Medusa Store product route does.
  - Only the calls that read display text have the locale. The `catalog/products` call that
    selects the product ids has no locale. Thus the `q` title search matches only the original
    title.
  - `catalog/filters` gets the filter keys and the option match from a call with no locale. The
    keys stay the lower-case original values in all locales, so `?colour=white` works on `/id/`.
    When the request has a locale, a second call gives only the labels, through
    `translatedLabels` in `src/lib/catalog-filters.ts`.
  - The label of a filter value is the translated value, else the original value. A translated
    fabric tag gives a label only when it keeps the `Fabric:` prefix.
- `src/modules/`:
  - `bank-transfer/`: payment provider (identifier `bank-transfer`, stored id
    `pp_bank-transfer_bank-transfer`). The constants `BANK_TRANSFER_PROVIDER_ID` and
    `PAYMENT_DEADLINE_MS` are in `constants.ts`.
  - `bank-account/`: data module `bankAccount` with the models `bank_account` and `store_contact`.
    The service adds `getContact()` and `setContact()`, because the module keeps one contact row.
  - `weight-shipping/`: fulfillment provider. `calculate.ts` has the weight rule: grams, rounded up
    to whole kg, minimum 1 kg, and 1000 g for a variant with no weight.
  - `brevo/`: notification provider. The templates are in `templates/`: `magic-link`, `welcome`,
    `order-placed`, `order-shipped`, `paid-cart-alert`, and `password-reset`. `html.ts` has the
    shared parts, for example `layout()`, `emailButton()`, and `greeting()`.
  - `product-review/`: data module `productReview` with the model `review`.
  - `wishlist/`: data module `wishlist` with the models `wishlist` and `wishlist_item`.
  - `storefront/`: data module `storefront` (`STOREFRONT_MODULE`) with the models
    `storefront_setting`, `store_colour`, and `home_campaign`. The module keeps one settings row.
    A unique partial index allows one `live` campaign. `settings-rules.ts` and
    `campaign-rules.ts` have no Medusa import, so the routes, the admin helpers, and the tests
    share them.
  - `magic-link/`: data module `magicLink` (`MAGIC_LINK_MODULE`) with the model
    `magic_link_request`. `tokens.ts` has the token helpers and the lifetimes. `browser.ts`
    makes the browser text, for example "Chrome on Windows". The table keeps only SHA-256 hashes
    of the token and the secret.
  - `payment-receipt/`: data module `paymentReceipt` (`PAYMENT_RECEIPT_MODULE`) with the models
    `payment_receipt` (id prefix `prcpt`) and `payment_note` (id prefix `pnote`). Each model has
    an indexed `order_id` column. This column is the link to the order. There is no module link.
    - `constants.ts`: `MAX_RECEIPTS` (3), `MAX_RECEIPT_BYTES` (5 MB), `MAX_NOTE_LENGTH` (500), the
      three image types, the two event names, and the type and size messages.
    - `file-rules.ts`: `decodeReceipt` (strict base64), `detectReceiptType` (magic numbers of JPG,
      PNG, and WebP), and `cleanFileName` (no path, no control characters, at most 120
      characters).
    - `storage/`: `createReceiptStorage(options)` gives `S3ReceiptStorage` (private bucket, no
      ACL) or `LocalReceiptStorage` (a directory, refuses a key outside it).
      `src/config/modules.ts` sets the storage option.
    - `service.ts`: `receiptStates(orderIds)` gives the receipts (oldest first) and the newest note
      of each order in two queries. `countReceipts`, `putFile`, `getFile`, and `removeFile`. A
      summary has no `file_key`.
    - The file key is `<order_id>/<receipt_id>.<jpg|png|webp>`.
  - Each data module has its own `migrations/`.
- `src/lib/`: pure code with no module.
  - `option-names.ts`: the option names of a colour (`colour`, `color`, `warna`) and of a size
    (`size`, `ukuran`), and the fabric tag prefix `Fabric:`.
  - `storefront-metadata.ts`: the metadata keys `show_on_home`, `tile_image_url`,
    `product_details`, `colour_hex`, and `welcome_sent_at`, and their safe readers. The storefront
    uses the same keys.
  - `catalog-filters.ts`, `catalog-price.ts`, and `home-categories.ts`: the logic of the catalog
    routes and the home categories route.
  - `bank-transfer-order.ts`: the payment rules of an order: `isBankTransferOrder`,
    `isPaymentCaptured`, `capturablePaymentId`, and `receiptBlockReason` with the messages
    `RECEIPT_BLOCK_MESSAGES`. The receipt routes and the job read the order with
    `ORDER_PAYMENT_FIELDS` from `api/store/orders/[id]/receipts/route.ts`.
- `src/links/`: read-only links (`readOnly: true`) from `review`, `wishlist`, and `wishlist_item`
  to product, customer, and productVariant.
- `src/workflows/`: `create-review`, `update-review-status`, `add-wishlist-item`,
  `remove-wishlist-item`, `publish-home-campaign`, `resolve-customer-account`, and
  `upload-payment-receipt`. Shared steps are in `src/workflows/steps/`.
  - `publish-home-campaign` ends the old live campaign first, then makes the new campaign live.
  - `resolve-customer-account` finds or makes the account customer and the `magic-link` auth
    identity for an email. A guest customer with the email becomes the account.
  - `upload-payment-receipt` writes the file (`store-receipt-file`), then the row
    (`create-payment-receipt`), then emits `payment_receipt.uploaded` `{ id, order_id }`. Each
    step removes its write when a later step fails. The result is `{ id, file_name, created_at }`.
    `created_at` is an ISO string, because the workflow engine sends the result through JSON.
  - The upload route checks the bytes, the size, and `receiptBlockReason` before it runs the
    workflow. The count and the workflow run inside the `Modules.LOCKING` key
    `payment-receipt:<order_id>`, so two uploads at the same time cannot make a fourth receipt.
- `src/subscribers/`:
  - `order.placed`: `order-placed` sends the order email. For an unpaid bank transfer order, the
    email has the amount, the active bank accounts, and the deadline in WIB.
    `customer-name-from-order` copies the name of the delivery address into a customer with no
    name.
  - `shipment.created`: `shipment-created` sends the `order-shipped` email, except when the
    event has `no_notification: true`.
  - `auth.password_reset`: `password-reset` sends the reset link only to an admin user
    (`actor_type` `user`).
  - `payment_receipt.uploaded`: `payment-receipt-uploaded` sends the `receipt-uploaded` email to
    `STORE_OWNER_EMAIL`. If `STORE_OWNER_EMAIL` is empty, it sends nothing and logs a warning. The
    link is `<admin.backendUrl><admin.path>/orders/<order_id>`. When `backendUrl` is empty or `/`,
    the link starts with `http://localhost:9000`, as in `password-reset`.
  - `payment_receipt.more_requested` `{ order_id, note_id }`: `payment-more-requested` sends the
    `more-payment-needed` email with the note to the order email. The link is
    `<STOREFRONT_URL>/orders/<order_id>`.
- `src/jobs/check-paid-carts.ts` is the job definition (`*/15 * * * *`).
  - Medusa calls a job as `(container, { scheduledFor })`. Thus the default export takes only the
    container. The named export `runCheckPaidCarts(container, adapters)` has the logic, and the
    tests call it with a test adapter.
  - The check is in `src/recovery/check-paid-carts.ts`.
  - The wiring to Query, Notification, and Cart is in `src/recovery/dependencies.ts`. The
    adapters are in `src/recovery/adapters.ts`.
  - `RECOVERY_ADAPTERS` is empty, so the job returns at once and writes no log line.
- `src/jobs/cancel-unpaid-orders.ts` is the job definition (`*/15 * * * *`). The logic is in
  `src/payment-timeout/`.
  - `select-expired.ts` is pure. `selectExpiredOrders` keeps the bank transfer orders that are
    not cancelled, have no captured payment, have no receipt, and were placed at least
    `PAYMENT_DEADLINE_MS` ago. It gives at most `MAX_CANCELS_PER_RUN` (50) ids, oldest first.
  - `run.ts` (`runPaymentTimeout`) reads the orders of the last 7 days that are older than the
    deadline. It cancels each selected order with `cancelOrderWorkflow`, which releases the stock.
    Then it writes `metadata.cancel_reason = "payment_timeout"`. The tracking route returns this
    reason.
  - A failed order does not stop the run. The job catches and logs all errors itself.
- `src/seed/`: idempotent seed steps for the region, the bank account, fulfillment, products, the
  storefront settings, and the API key. `bank-account.ts` adds the "Sample Bank" account and the
  sample contact only when the owner has no data. `storefront.ts` saves the price limits only
  when the module has no settings row. `src/scripts/seed.ts` runs the seed steps and prints the
  publishable key.
- `src/admin/`: the admin dashboard extension.
  - Pages: **Reviews** (`routes/reviews/page.tsx`), **Home campaigns**
    (`routes/home-campaigns/page.tsx` and `routes/home-campaigns/[id]/page.tsx`), **Settings →
    Bank transfer** (`routes/settings/bank-transfer/page.tsx`), and **Settings → Storefront**
    (`routes/settings/storefront/page.tsx`).
  - Widgets: `category-tile` (zone `product_category.details.side`), `product-details` (zone
    `product.details`), `colour-dots` (zone `product.details.side`), and `payment-receipts` (zone
    `order.details`). The `.after` suffix of a zone has no effect in Medusa 2.21.2.
  - `payment-receipts.tsx` shows only for a bank transfer order. It shows the uploaded receipts,
    the newest owner note, and the buttons **Accept payment**, **Ask for more**, and **Cancel
    order**. The buttons go away after the cancellation or the capture. **Ask for more** opens
    `components/ask-for-more-drawer.tsx`. The helpers are in `lib/payment-receipts.ts`. They copy
    the limits and the provider id, because the admin bundle must not import server code.
  - The pure helpers are in `lib/` and have unit tests in `lib/__tests__/`. Shared forms are in
    `components/`.
  - The admin code has its own `tsconfig.json`. The root `tsconfig.json` excludes `src/admin`.
    Run the admin type check with `pnpm --filter @store/backend exec tsc --noEmit -p
src/admin/tsconfig.json`.

## Code conventions

- Mutations go through workflows (`createWorkflow`, `createStep`, `StepResponse`). Each step has a
  compensation function.
  A route that changes one record of one module calls the module service directly, for example
  the Admin routes for the bank accounts, the store contact, the storefront settings, the store
  colours, and most home campaign actions. There is nothing to compensate.
- Reads use `query.graph` or the module services.
- Routes do not catch errors. They throw `MedusaError` and Medusa's error handler formats the
  response.
- Subscribers and jobs catch all errors and log them.
- Import zod from `@medusajs/framework/zod`. Request body schemas use `.strict()`.
- List queries use `createFindParams` from `@medusajs/medusa/api/utils/validators`.
- Routes take `customer_id` from `auth_context.actor_id`. The review data (`product_id` and the
  names) comes from the database, not from the request.
- `medusa-config.ts` sets `http.authMethodsPerActor` to `{ user: ["emailpass"], customer: [] }`.
  Customers sign in only with the magic link. Do not add a customer `emailpass` route.
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
  money arrives, with **Accept payment** in the `payment-receipts` widget.
- `refundPayment` does nothing. The owner returns the money outside of Medusa.
- The deadline is the order time plus `PAYMENT_DEADLINE_MS` (24 hours). After the deadline, the
  job `cancel-unpaid-orders` cancels the order if it has no receipt and no captured payment.
- An unpaid bank transfer order has a payment collection with the status `authorized` and a payment
  session with the provider id `pp_bank-transfer_bank-transfer`.

## Payment receipt facts

- Never serve a receipt from a public path. A receipt goes only to `S3_RECEIPTS_BUCKET` or
  `RECEIPTS_DIR`, never to `S3_BUCKET`, `static/`, or a bucket with a web endpoint. Only
  `GET /admin/payment-receipts/:id/file` sends the bytes, with `Cache-Control: private, no-store`.
- The Store routes `POST /store/orders/:id/receipts` and `GET /store/payment-states` need only
  the publishable key, because a guest uses the order id. Their answers have no `file_key`, no
  URL, and no file bytes.
- The upload body is JSON `{ file_name, content }` with the file as base64. The body limit of the
  route is `7mb`. The backend takes the type from the bytes, not from the name.
- The customer can upload while the order is a bank transfer order, is not cancelled, has no
  captured payment, and has fewer than 3 receipts.
- An order is "payment submitted" when it has a receipt and no note is newer than the newest
  receipt. Else it waits for payment.
- **Accept** captures the open bank transfer payment with `capturePaymentWorkflow`. It sends no
  email. It does not need a receipt.
- **Ask for more** saves a `payment_note` and emits the event. The note is required, and has at
  most 500 characters after `trim()`. The schema uses `refine()`, because the Medusa validator
  replaces the messages of `min()` and `max()`. Medusa adds `Invalid request: ` before each
  message, for example `Invalid request: Write a note for the customer.`
- **Cancel order** in the widget calls the Medusa order cancellation, which releases the stock.

## Docker

- `Dockerfile` builds with `pnpm --filter @store/backend build` and deletes the compiled
  `__tests__` folders.
- The runtime stage runs from `/server`, because `/app` is the admin path. It runs
  `npm install --omit=dev` there and starts with `npm run start` on port 9000.
- In production, `MEDUSA_WORKER_MODE` is `server` or `worker`. The seed runs as
  `npx medusa exec ./src/scripts/seed.js` (compiled JS).
