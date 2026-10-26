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
  `src/config/modules.ts`. The files in `src/config/` contain pure functions with unit tests in
  `src/config/__tests__/`:
  - `session.ts`: `buildSessionOptions(env)` gives the `sessionOptions` of `medusa-config.ts`, a
    rolling session with a lifetime of `SESSION_TTL_HOURS` (default 168). Admin users share it.
  - `payment.ts`: the bank transfer switch `bankTransferEnabled(env)` (`BANK_TRANSFER_ENABLED`,
    default `true`), the deadline `bankTransferDeadlineHours(env)` and `bankTransferDeadlineMs(env)`
    (`BANK_TRANSFER_DEADLINE_HOURS`, default 24), and the gateway list `GATEWAY_PROVIDERS` (empty
    in the template). `regionPaymentProviderIds(env)` gives the region providers for the seed.
    `checkPaymentProviders(env)` is the startup check.
  - `s3.ts`: `s3ClientOptions(env)` gives the S3 client options that the File Module and the
    receipt storage share: `forcePathStyle` (`S3_FORCE_PATH_STYLE`, default `true`) and the two
    checksum options `WHEN_REQUIRED`.
  - `database.ts`: the database driver options.
- `featureFlags.translation: true` is required for the Translation Module.
- The admin path is the Medusa default `/app`.
- Conditional modules:
  - `REDIS_URL` set: the Redis event bus, workflow engine, caching, and locking modules load.
    Otherwise Medusa uses its in-memory modules. The in-memory modules are for development and
    the tests only. `NODE_ENV=production` requires `REDIS_URL`.
  - `SMTP_HOST` set: the `smtp` provider has the email channel. Otherwise the `email-log` provider
    has it. `notification-local` keeps the `feed` channel in both cases. `.env.test` sets
    `SMTP_HOST=` empty, so the HTTP integration tests render each email through `email-log`.
  - `S3_BUCKET` set: the S3 file provider loads, with the S3 client options (`s3ClientOptions` in
    `src/config/s3.ts`) and `acl: false`. `S3_ENDPOINT` is optional. With no endpoint, the AWS SDK
    uses the AWS endpoint of `S3_REGION`.
    Development sets it to the Garage of `docker-compose.local.yml`. The key comes from step 3
    of `docs/development.md`. `.env.test` sets `S3_BUCKET=` empty, so the tests store the files
    in `static/`. Local file storage is for development and the tests only.
    `NODE_ENV=production` requires `S3_BUCKET`.
  - `S3_BUCKET` set: the `paymentReceipt` module keeps the receipts in the private bucket
    `S3_RECEIPTS_BUCKET`, with the endpoint, the region, the key, and the S3 client options of the
    File Module.
    Production sets `S3_RECEIPTS_BUCKET` in `.env`. `S3_BUCKET` empty: the module keeps the
    receipts in `RECEIPTS_DIR` (default `uploads/receipts`, relative to the backend directory).
    `RECEIPTS_DIR` is for development and the tests only. `.gitignore` ignores `/uploads`.
- The bank transfer payment provider is always registered, also with `BANK_TRANSFER_ENABLED=false`.
  The old bank transfer orders need it for the capture, the cancel, and the cancel job. The switch
  only removes bank transfer from the seed region and from the checkout (`enabled` of
  `/store/bank-transfer`).
- A gateway in `GATEWAY_PROVIDERS` loads only when its `isConfigured(env)` returns `true`.
  `paymentModule(env)` adds it after bank transfer. `docs/payments/README.md` gives the procedure.
- An empty key gives the default, because Compose passes `""` for an unset key.
- These conditions stop startup with an error:
  - `NODE_ENV=production` and `REDIS_URL` or `S3_BUCKET` is empty.
  - `MEDUSA_WORKER_MODE` is `server` or `worker` and `REDIS_URL` is empty, with any `NODE_ENV`.
  - `SHIPPING_RATE_PER_KG`, `SESSION_TTL_HOURS`, or `BANK_TRANSFER_DEADLINE_HOURS` is not a
    positive integer.
  - `BANK_TRANSFER_ENABLED` or `S3_FORCE_PATH_STYLE` is not `true` or `false`.
  - `BANK_TRANSFER_ENABLED=false` and no gateway is configured.
  - `SMTP_HOST` has a value and `EMAIL_FROM` is empty.
  - `SMTP_PORT` is not an integer from 1 to 65535, or is 465 with `SMTP_SECURE=false`.
  - Only one of `SMTP_USER` and `SMTP_PASSWORD` has a value.
  - `S3_BUCKET` has a value and `S3_FILE_URL`, `S3_REGION`, `S3_ACCESS_KEY_ID`, or
    `S3_SECRET_ACCESS_KEY` is missing.
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
    `pp_bank-transfer_bank-transfer`). The constant `BANK_TRANSFER_PROVIDER_ID` is in
    `constants.ts`. The deadline comes from `bankTransferDeadlineMs(env)` in
    `src/config/payment.ts` (`BANK_TRANSFER_DEADLINE_HOURS`).
  - `bank-account/`: data module `bankAccount` with the models `bank_account` and `store_contact`.
    The service adds `getContact()` and `setContact()`, because the module keeps one contact row.
  - `weight-shipping/`: fulfillment provider. `calculate.ts` has the weight rule: grams, rounded up
    to whole kg, minimum 1 kg, and 1000 g for a variant with no weight.
  - `smtp/`: notification provider (identifier `smtp`).
    - `options.ts` validates the options and builds the Nodemailer transport. The transport has
      10 s timeouts. With a user name, it sets `requireTLS`.
    - `service.ts` gets the message from `renderEmail()` in `src/email/render.ts` and sends it.
    - A failed send logs only the error `code` and `responseCode`. The log line never contains
      the recipient, `SMTP_USER`, or `SMTP_PASSWORD`.
  - `email-log/`: notification provider (identifier `email-log`) on the email channel when
    `SMTP_HOST` is empty. It renders each email with `renderEmail()`, so a bad template fails as
    it fails with SMTP. It sends nothing.
    - It logs the template name and the subject. It never logs the recipient.
    - It logs the text only outside production (`NODE_ENV !== "production"`). The `magic-link`
      and `password-reset` texts hold a sign-in link, and a production log must not hold it.
  - `product-review/`: data module `productReview` with the model `review`.
  - `wishlist/`: data module `wishlist` with the models `wishlist` and `wishlist_item`.
    - `wishlist_item` has three columns for the alerts. `saved_unit_price` (null: not read yet)
      is the price that the price drop job compares. `available` (default `true`) is the last
      known stock state. `alerted_at` is the time of the last back in stock email.
    - The `add-wishlist-item` step saves the price and the availability of the variant at add
      time.
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
      `src/config/modules.ts` sets the storage option. The S3 option has an optional `endpoint`
      and the `clientOptions` from `s3ClientOptions`.
    - `service.ts`: `receiptStates(orderIds)` gives the receipts (oldest first) and the newest note
      of each order in two queries. `countReceipts`, `putFile`, `getFile`, and `removeFile`. A
      summary has no `file_key`.
    - The file key is `<order_id>/<receipt_id>.<jpg|png|webp>`.
  - Each data module has its own `migrations/`.
- `src/email/`: the email templates in `src/email/templates/` and the plain text part. The unit
  tests are in `src/email/__tests__/`.
  - `src/email/text.ts`: `htmlToText(html)` makes the plain text part of each email.
  - `src/email/render.ts`: `renderEmail(template, data)` gives `{ subject, html, text, replyTo? }`.
    The `smtp` and `email-log` providers both use it. `replyTo` is `data.store.contact_email` when
    the value is not empty. Else the message has no Reply-To, and the reply goes to the sender
    address. It throws for an unknown template.
  - Customer templates: `magic-link`, `welcome`, `order-placed`, `payment-confirmed`,
    `order-shipped`, `order-delivered`, `review-request`, `order-cancelled`, `refund-sent`,
    `more-payment-needed`, and `wishlist-alert`.
  - Owner templates: `new-order-owner`, `receipt-uploaded`, `paid-cart-alert`, and
    `low-stock-owner`.
  - Admin template: `password-reset`.
  - Each template is a pure function `render(data): { subject, html }` in the map of
    `src/email/templates/index.ts`.
  - `order-cancelled` has three wordings. `metadata.cancel_reason === "payment_timeout"` gives
    the timeout text. Each other value gives the staff text, with the quote of
    `metadata.cancel_note` when the note is not empty.
    - The timeout text names the deadline with `{hours}` from `data.deadline_hours`. The template
      throws when a timeout email has no `deadline_hours`.
  - The refund line of `order-cancelled` comes from the first captured payment. A bank
    transfer payment gives the refund amount and two working days. A gateway payment says that
    a separate email comes. No captured payment gives no line.
  - `wishlist-alert` has two optional groups, `back_in_stock` and `price_drops`. A group with
    no items gets no part. The template throws when both groups are empty.
    - The subject names the first product: "Back in stock: …" when the stock group has items,
      else "Price drop: …". The button "Open your wishlist" goes to `/account/wishlist`.
    - The "Price drop" part strikes through the old price. The new price is not bold, because
      `productRows` escapes the price text.
    - The locale comes from `customer.metadata.locale` (`CUSTOMER_LOCALE`), not from an order.
  - `low-stock-owner` has the subject "Low stock: {product}, {variant} ({n} left)". The button
    "Open the product" goes to the admin product page.
  - `src/email/templates/shell.ts`: `renderShell` renders the shell of every email (dark header
    bar with the store name, footer, preheader, and one media query). It also exports the block
    helpers, for example `heading`, `paragraph`, `keyValues`, `callout`, `quote`, `button`,
    `orderLines`, `productRows`, and `address`. The types `EmailStore`, `EmailLineItem`, and
    `EmailAddress` are here.
    - Use `list(items)` for a bullet list and `paragraphHtml(html)` for a paragraph that holds a
      text link. Do not copy the font stack or the colours into a template.
    - `paragraphHtml` does not escape its HTML. The caller escapes each value in it.
    - `isHttpsUrl` is the one check for a URL that goes into an `href` or an `src`.
  - `src/email/templates/i18n/`: the dictionaries `en.ts` and `id.ts`, and `index.ts` with
    `EmailLocale` (`en-US` or `id-ID`), `toEmailLocale`, `langOf`, and `t(locale, key, values)`.
    A missing key in the Indonesian dictionary falls back to the English text.
  - `src/email/templates/html.ts`: only `escapeHtml`, `formatRupiah`, `formatWibTime`,
    `formatWibDate`, and `RenderedEmail`. The two time functions take a locale. `layout`,
    `emailButton`, and `greeting` do not exist.
  - Every customer template takes `locale` and `store` (an `EmailStore`: `name`,
    `contact_email`, `whatsapp`) in its data. The subscribers and the routes must send both.
    The store name goes into the wordmark and the footer.
  - The owner templates (`new-order-owner`, `paid-cart-alert`, `receipt-uploaded`,
    `low-stock-owner`) and `password-reset` stay in English. They need no `locale`.
  - Every template needs `store`, also the owner templates and `password-reset`. The shell
    reads `store.name`. `src/email/templates/index.ts` types `data` as `any`, so a missing
    `store` gives no compile error. The send then throws a `TypeError`.
- `src/lib/`: pure code with no module.
  - `option-names.ts`: the option names of a colour (`colour`, `color`, `warna`) and of a size
    (`size`, `ukuran`), and the fabric tag prefix `Fabric:`.
  - `storefront-metadata.ts`: the metadata keys `show_on_home`, `tile_image_url`,
    `product_details`, `colour_hex`, `welcome_sent_at`, and `locale` (`CUSTOMER_LOCALE`), and
    their safe readers. The storefront reads `product_details`, `colour_hex`, and
    `welcome_sent_at`. The backend writes `locale` on the customer. The storefront does not read
    it.
    - The order keys `cancel_reason` (`ORDER_CANCEL_REASON`), `cancel_note`
      (`ORDER_CANCEL_NOTE`), and `review_request_sent_at` (`ORDER_REVIEW_REQUEST_SENT_AT`). The
      backend writes and reads them. The storefront does not read them.
    - The inventory item key `low_stock_alerted_at` (`INVENTORY_LOW_STOCK_ALERTED_AT`). Only the
      low stock subscriber writes and reads it. `low-stock/rules.ts` exports the same constant
      again.
    - Medusa merges the order metadata and the inventory item metadata on an update. A key goes
      away only when the update gives it the value `""`.
  - Stock and price helpers:
    - `variant-stock.ts`: `STOCK_EVENTS` (the four stock events), `readVariantStock`,
      `readAvailable`, `isInStock`, and `inventoryItemIdsOfEvent`.
      - `readVariantStock` gives the variant, the product, and the available stock of an
        inventory item. It gives `null` when the item or its variant does not exist.
      - `readAvailable` uses `getVariantAvailability` with the first sales channel of the store,
        as the catalog route does. A store with no sales channel gives 0.
      - `isInStock` is true for `manage_inventory: false`, for `allow_backorder: true`, or for
        stock above 0.
      - `inventoryItemIdsOfEvent` takes a payload of `{ id }` or a list of `{ id }`. It gives
        the inventory item ids with no duplicates.
      - The `reservation-item.*` events also read soft-deleted reservations (`withDeleted`),
        because a cancelled order soft-deletes its reservations.
    - `variant-prices.ts`: `readVariantPrices(scope, variantIds)` gives the calculated price of
      each variant in the first region, in whole rupiah. A variant with no price gives `null`.
  - Email helpers:
    - `storefront-url.ts`: `readStorefrontUrl(scope)` gives the storefront base URL.
      `storefrontLink(base, locale, path)` adds the prefix `/id` for `id-ID` and no prefix for
      `en-US`.
    - `store-for-email.ts`: `readStoreForEmail(scope)` gives the `EmailStore` (store name, store
      contact email, and WhatsApp number). A missing store row gives a default name.
    - `owner-email.ts`: `readOwnerEmail(scope, env)` gives the store contact email, else
      `STORE_OWNER_EMAIL`, else an empty string. The caller skips the email on an empty string.
    - `bank-accounts.ts`: `listActiveBankAccounts(scope)` gives the active bank accounts in
      display order, with only the public fields.
    - `admin-url.ts`: `adminLink(scope, path)` gives `<admin.backendUrl><admin.path><path>`. When
      `backendUrl` is empty or `/`, the link starts with `http://localhost:9000`. This is the one
      copy of the default backend URL. Each admin link in an email uses it, also the reset link of
      `password-reset`.
    - `payment-order.ts`: `readPaymentWithOrder(scope, paymentId)` reads a payment, its refunds,
      and its order through `payment_collection.order`. It gives `null` when the payment has no
      order, for example the payment of a cart that never completed.
    - `payment-confirmed-providers.ts`: `PAYMENT_CONFIRMED_PROVIDERS` (only
      `BANK_TRANSFER_PROVIDER_ID`) and `confirmsPaymentLater(providerId)`. See
      `docs/payments/README.md`.
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
  - `add-wishlist-item` reads the price (`readVariantPrices`) and the stock state (`isInStock`)
    of the variant for a new item. A failed read does not stop the add. The item then gets
    `saved_unit_price: null` and `available: true`, and the next price drop run fills the price.
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
  - Each customer subscriber of an order reads `order.locale` and converts it with
    `toEmailLocale`. It builds
    the storefront link with `storefrontLink`, so an `id-ID` order gets the prefix `/id`. It
    sends `locale` and `store` (from `readStoreForEmail`) to the template.
  - Each customer subscriber sends nothing and logs a warning when `STOREFRONT_URL` is empty.
  - `order.placed`: `order-placed` sends the order email. For an unpaid bank transfer order, the
    email has the amount, the active bank accounts (`listActiveBankAccounts`), and the deadline
    in WIB. The deadline is the order time plus `bankTransferDeadlineMs(process.env)`.
    - The same subscriber sends the `new-order-owner` email to the address from
      `readOwnerEmail`. The owner send has its own `try` and `catch`. Thus it also sends when the
      customer email fails or is skipped (no order email or no `STOREFRONT_URL`).
    - The owner payment label is "Bank transfer, waiting for the receipt" (unpaid bank transfer),
      "Bank transfer" (captured bank transfer), or "Online payment". Only the first label adds
      "waiting for the receipt" to the subject.
    - `customer-name-from-order` copies the name of the delivery address into a customer with no
      name.
  - `shipment.created`: `shipment-created` sends the `order-shipped` email, except when the
    event has `no_notification: true`.
  - `delivery.created` `{ id, no_notification }`: `delivery-created` sends the `order-delivered`
    email. `id` is the fulfillment id. The email has the items of that fulfillment. The
    subscriber sends nothing when `no_notification` is `true`.
  - `payment.captured` `{ id }`: `payment-captured` sends the `payment-confirmed` email. It
    sends only for a provider in `PAYMENT_CONFIRMED_PROVIDERS`. A payment with no order gives a
    warning and no email.
  - `payment.refunded` `{ id }`: `payment-refunded` sends the `refund-sent` email for the newest
    refund of the payment. `id` is the payment id, not the refund id.
    - It sends nothing for a bank transfer refund of a cancelled order. The `order-cancelled`
      email already gives the refund amount.
    - It sends for a refund of a cancelled gateway order.
  - `order.canceled` `{ id }`: `order-cancelled` sends the `order-cancelled` email. It reads
    `metadata.cancel_reason` and `metadata.cancel_note`, so each cancel path writes these keys
    before the cancellation. For a `payment_timeout` cancel, it puts `deadline_hours`
    (`bankTransferDeadlineHours(process.env)`) in the email data.
  - `auth.password_reset`: `password-reset` sends the reset link only to an admin user
    (`actor_type` `user`). The link comes from `adminLink`.
  - `payment_receipt.uploaded`: `payment-receipt-uploaded` sends the `receipt-uploaded` email to
    the address from `readOwnerEmail`. If that address is empty, it sends nothing and logs a
    warning. The email is in English. The link to the order comes from `adminLink`.
  - `payment_receipt.more_requested` `{ order_id, note_id }`: `payment-more-requested` sends the
    `more-payment-needed` email with the note to the order email, in the
    language of `order.locale`. The link is `<STOREFRONT_URL>[/id]/orders/<order_id>`.
  - `wishlist-back-in-stock.ts` and `low-stock.ts` listen to the four `STOCK_EVENTS`:
    `inventory-level.updated`, `reservation-item.created`, `reservation-item.updated`, and
    `reservation-item.deleted`. A bulk event with a list payload gives each inventory item once.
    An inventory item with no variant gives no email and no error. Each subscriber checks one
    inventory item inside a `Modules.LOCKING` lock (`wishlist-back-in-stock:<id>` and
    `low-stock:<id>`). One order gives several stock events at the same time, and without the
    lock two handlers can send the same alert.
  - `wishlist-back-in-stock.ts` sends the `wishlist-alert` email with the `back_in_stock` group.
    The pure rule is `transitionStockItems` in `src/wishlist-alerts/back-in-stock.ts`.
    - An item goes into the alert when the variant is in stock now and `available` is `false`.
      Then `available` becomes `true`. A variant that is not in stock sets `available: false`.
    - The 24-hour cooldown (`ALERT_COOLDOWN_MS`): an item with `alerted_at` less than 24 hours
      ago gets no alert. It keeps `available: false`, so a later event can alert it.
    - The subscriber sends one email per customer per event. A bulk event can thus put several
      variants into one email. The locale comes from `customer.metadata.locale`.
    - A variant with no price, or an empty `STOREFRONT_URL`, sends no alert. The item keeps
      `available: false`, so a later event alerts it.
    - The `available` updates go in before the send, so a failed send does not repeat the alert.
      `alerted_at` goes in only after a send.
    - A customer with no email gets no email and a warning. The `available` updates stay.
  - `low-stock.ts` sends the `low-stock-owner` email to the address from `readOwnerEmail`. The
    pure rule is `lowStockTransition` in `src/low-stock/rules.ts`.
    - The threshold is `low_stock_threshold` from `StorefrontModuleService.getSettings()`. The
      value 0 turns the email off, and the subscriber then reads no stock.
    - One email per crossing: stock at or below the threshold with no `low_stock_alerted_at`
      sends the email, then writes the mark. Stock above the threshold with the mark removes it.
    - The reset writes `low_stock_alerted_at: ""`, because Medusa merges the metadata and only
      an empty string removes a key. An empty metadata object would clear every key.
    - A variant with `manage_inventory: false` never sends. A failed send writes no mark, so the
      next stock event tries again.
- `src/jobs/check-paid-carts.ts` is the job definition (`*/15 * * * *`).
  - Medusa calls a job as `(container, { scheduledFor })`. Thus the default export takes only the
    container. The named export `runCheckPaidCarts(container, adapters)` has the logic, and the
    tests call it with a test adapter.
  - The check is in `src/recovery/check-paid-carts.ts`.
  - The wiring to Query, Notification, and Cart is in `src/recovery/dependencies.ts`. The
    adapters are in `src/recovery/adapters.ts`.
  - The `paid-cart-alert` email goes to the address from `readOwnerEmail`.
  - `RECOVERY_ADAPTERS` is empty, so the job returns at once and writes no log line.
- `src/jobs/cancel-unpaid-orders.ts` is the job definition (`*/15 * * * *`). The logic is in
  `src/payment-timeout/`.
  - `select-expired.ts` is pure. `selectExpiredOrders` keeps the bank transfer orders that are
    not cancelled, have no captured payment, have no receipt, and were placed at least
    `deadlineMs` ago. It gives at most `MAX_CANCELS_PER_RUN` (50) ids, oldest first.
  - `timeoutWindow(now, deadlineMs)` gives the query window: from now minus the deadline minus
    `TIMEOUT_LOOKBACK_MARGIN_MS` (6 days) to now minus the deadline. The window is thus always
    longer than the deadline. The default deadline of 24 hours gives the last 7 days.
  - `run.ts` (`runPaymentTimeout`) reads `bankTransferDeadlineMs(process.env)` one time for the
    run, so the selection and the check inside the lock use the same deadline. It reads the
    orders of the window. It cancels each selected order with `cancelOrderWorkflow`, which
    releases the stock.
  - The job writes `metadata.cancel_reason = "payment_timeout"` before the cancellation, so the
    `order.canceled` subscriber can read it. When the workflow fails, the job writes
    `cancel_reason: ""` to remove the key. The tracking route returns only this reason.
  - A failed order does not stop the run. The job catches and logs all errors itself.
- `src/jobs/review-requests.ts` is the job definition (`0 20 * * *`, 03:00 WIB). The logic is in
  `src/review-request/`.
  - `select.ts` is pure. `selectDueOrders` keeps the orders that are not cancelled, have no
    `metadata.review_request_sent_at`, and have a fulfillment with `delivered_at` at or before
    now minus 7 days. It gives at most `REVIEW_REQUEST_BATCH` (100) ids, oldest delivery first.
  - `reviewWindow` limits the query to the deliveries between now minus 37 days and now minus 7
    days (`REVIEW_REQUEST_LOOKBACK_MS` is 30 days). An order with a delivery more than 37 days
    before a run never gets a request, for example after a month with no job runs.
  - `run.ts` (`runReviewRequests`) takes the lock `review-request:<order_id>` for each order.
    Inside the lock, it reads the order again. A line item has a review when a review of any
    status has its `order_line_item_id`.
  - The job writes `review_request_sent_at` before the send. It also writes the mark when nothing
    is left to review or the order has no email. Thus no later run selects the order again.
  - When the send fails, the job writes `review_request_sent_at: ""` to remove the mark. The next
    run tries again.
  - The send has no `idempotency_key`. Medusa 2.21.2 sends a key with a failed notification row
    again, but then throws on the update of that row. With a key, the job would thus send the
    email again each day.
  - With no `STOREFRONT_URL`, the job sends nothing, writes no mark, and logs a warning.
- `src/jobs/wishlist-price-drops.ts` is the job definition (`0 21 * * *`, 04:00 WIB). The logic
  is in `src/wishlist-alerts/`.
  - `price-drop.ts` is pure. `selectPriceDrops` gives the drops and the saved price updates. A
    drop is `saved_unit_price !== null` and a current price below it.
  - The saved price moves only on a drop, or from `null` to the current price with no alert. A
    rise followed by a smaller drop thus gives no alert. A variant with no price keeps its
    saved price.
  - `run.ts` (`runPriceDrops`) reads at most `PRICE_DROP_BATCH` (500) items in id order.
    `batchOffset` moves the start of the batch one batch forward each day. Thus a store with more
    than 500 items gets a check of every item over some days.
  - The job sends one `wishlist-alert` email per customer with the `price_drops` group. The
    locale comes from `customer.metadata.locale`.
  - The new saved prices of a customer go in after the send. A failed send keeps the old saved
    prices, so the next run sends the drop again.
  - A customer with no email gets no email and a warning. The saved prices of that customer
    stay. With no `STOREFRONT_URL`, the job sends nothing and keeps the saved prices.
- `src/seed/`: idempotent seed steps for the region, the bank account, fulfillment, products, the
  storefront settings, and the API key. `region.ts` sets the region providers from
  `regionPaymentProviderIds(process.env)`: bank transfer only when `BANK_TRANSFER_ENABLED` is on,
  and each configured gateway. `bank-account.ts` adds the "Sample Bank" account and the
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
  - **Cancel order** opens `components/cancel-order-drawer.tsx`. The drawer has an optional note
    (at most 500 characters, `validateOptionalNote`) and the buttons **Cancel the order** and
    **Keep the order**. It calls `POST /admin/orders/:id/receipts/cancel`.
  - The pure helpers are in `lib/` and have unit tests in `lib/__tests__/`. Shared forms are in
    `components/`.
  - `lib/sdk.ts` uses the base URL `/`, because the admin dashboard and the API have the same
    origin. The admin code reads no `VITE_BACKEND_URL`.
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
- The deadline is the order time plus `bankTransferDeadlineMs(env)` in `src/config/payment.ts`
  (`BANK_TRANSFER_DEADLINE_HOURS`, default 24 hours). After the deadline, the job
  `cancel-unpaid-orders` cancels the order if it has no receipt and no captured payment.
- The order stores no deadline. A change of `BANK_TRANSFER_DEADLINE_HOURS` thus also changes the
  deadline of the open orders. Their `order-placed` emails keep the old deadline.
- `GET /store/payment-states` returns `deadline_at` for a bank transfer order and `null` for
  other orders. `GET /store/bank-transfer` returns `enabled` and `deadline_hours`. The storefront
  has no copy of the deadline.
- An unpaid bank transfer order has a payment collection with the status `authorized` and a payment
  session with the provider id `pp_bank-transfer_bank-transfer`.

## Payment receipt facts

- Never serve a receipt from a public path. A receipt goes only to `S3_RECEIPTS_BUCKET` or
  `RECEIPTS_DIR`, never to `S3_BUCKET`, `static/`, or a bucket with a web endpoint.
  `RECEIPTS_DIR` is for development and the tests only. Only `GET /admin/payment-receipts/:id/file`
  sends the bytes, with `Cache-Control: private, no-store`.
- The Store routes `POST /store/orders/:id/receipts` and `GET /store/payment-states` need only
  the publishable key, because a guest uses the order id. Their answers have no `file_key`, no
  URL, and no file bytes.
- The upload body is JSON `{ file_name, content }` with the file as base64. The body limit of the
  route is `7mb`. The backend takes the type from the bytes, not from the name.
- The customer can upload while the order is a bank transfer order, is not cancelled, has no
  captured payment, and has fewer than 3 receipts.
- An order is "payment submitted" when it has a receipt and no note is newer than the newest
  receipt. Else it waits for payment.
- **Accept** captures the open bank transfer payment with `capturePaymentWorkflow`. It does not
  need a receipt. The `payment.captured` subscriber then sends the `payment-confirmed` email.
- **Ask for more** saves a `payment_note` and emits the event. The note is required, and has at
  most 500 characters after `trim()`. The schema uses `refine()`, because the Medusa validator
  replaces the messages of `min()` and `max()`. Medusa adds `Invalid request: ` before each
  message, for example `Invalid request: Write a note for the customer.`
- **Cancel order** in the widget calls `POST /admin/orders/:id/receipts/cancel` with the body
  `{ note?: string }`. The route sits next to `accept` and `ask-for-more`, because it has the same
  guards. `receipts/middlewares.ts` registers its validator.
  - The route gives 400 with the `RECEIPT_BLOCK_MESSAGES` text for a gateway order, a cancelled
    order, or an order with a captured payment. The native Medusa cancel stays for these orders.
  - The route writes `cancel_reason = "staff"` and `cancel_note` before the cancellation. It
    always sends `cancel_note`, with `""` for an empty note, so an old note goes away.
  - Then it runs `cancelOrderWorkflow` with `canceled_by` (the admin user). The workflow
    releases the stock.
  - When the workflow fails, the route writes `""` to the two keys to remove them, and throws.
- In Medusa 2.21.2, `cancelOrderWorkflow` refunds each captured payment of the order. Thus each
  cancel of a captured order also emits `payment.refunded`. The bank transfer refund on a cancel
  sends no `refund-sent` email, because the `order-cancelled` email gives the refund amount.

## Docker

- `Dockerfile` builds with `pnpm --filter @store/backend build` and deletes the compiled
  `__tests__` folders.
- The runtime stage runs from `/server`, because `/app` is the admin path. It runs
  `npm install --omit=dev` there and starts with `npm run start` on port 9000.
- In production, `MEDUSA_WORKER_MODE` is `server` or `worker`. The seed runs as
  `npx medusa exec ./src/scripts/seed.js` (compiled JS).
