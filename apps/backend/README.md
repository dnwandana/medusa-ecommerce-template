# Backend

The Medusa v2 backend of the store (`@store/backend`). It serves the Store API, the Admin API, and
the admin dashboard on port 9000.

For the first setup, see [docs/development.md](../../docs/development.md). Run the commands in
this document from the repository root.

## Commands

| Command                                                  | Function                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm --filter @store/backend dev`                       | Starts the backend in development mode (`medusa develop`).       |
| `pnpm --filter @store/backend build`                     | Builds the server and the admin into `.medusa/server`.           |
| `pnpm --filter @store/backend start`                     | Starts the built server.                                         |
| `pnpm --filter @store/backend exec medusa db:migrate`    | Runs the database migrations. Run it again after you pull new migrations. |
| `pnpm --filter @store/backend seed`                      | Creates the store data. The last output line is `PUBLISHABLE_KEY=pk_...`. |
| `pnpm --filter @store/backend exec medusa user -e <email> -p <password>` | Creates an admin user.                          |
| `pnpm --filter @store/backend mayar:check`               | Creates and closes one Mayar sandbox invoice to verify the key.  |
| `pnpm --filter @store/backend test:unit`                 | Runs the unit tests.                                             |
| `pnpm --filter @store/backend test:integration:http`     | Runs the HTTP integration tests. They need PostgreSQL.           |

## Addresses

| Address                                       | Use                         |
| --------------------------------------------- | --------------------------- |
| http://localhost:9000/app                     | Admin dashboard             |
| http://localhost:9000/health                  | Health check                |
| http://localhost:9000/store/...               | Store API. Send the header `x-publishable-api-key`. |
| http://localhost:9000/admin/...               | Admin API                   |
| http://localhost:9000/hooks/payment/mayar_mayar | Mayar webhook             |

## Environment keys

The file is `apps/backend/.env`. Copy it from `.env.example`.

| Key                                        | Default                                                    | Function                                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | `postgres://postgres:postgres@localhost:5432/medusa-store` | PostgreSQL connection                                                                                                       |
| `DATABASE_SSL`                             | empty                                                      | Set `false` only when PostgreSQL has no TLS. The production Compose file sets it.                                           |
| `REDIS_URL`                                | `redis://localhost:6379`                                   | Redis connection. If it is empty, Medusa uses its in-memory modules.                                                        |
| `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`    | local addresses                                            | Origins that can call the API                                                                                               |
| `JWT_SECRET`, `COOKIE_SECRET`              | `supersecret`                                              | Secrets. Set new values in production.                                                                                      |
| `STOREFRONT_URL`                           | `http://localhost:3000`                                    | Base URL for the email links and for the Mayar return URL                                                                   |
| `MEDUSA_BACKEND_URL`                       | `http://localhost:9000`                                    | Public URL of the backend. The admin dashboard reads it at build time.                                                      |
| `MEDUSA_WORKER_MODE`                       | `shared`                                                   | `shared`, `server`, or `worker`                                                                                             |
| `DISABLE_MEDUSA_ADMIN`                     | `false`                                                    | `true` on a worker instance                                                                                                 |
| `SHIPPING_RATE_PER_KG`                     | `10000`                                                    | Shipping price in IDR for each kilogram. Must be a positive whole number.                                                   |
| `BREVO_API_KEY`                            | empty                                                      | Brevo API key. If it is empty, the backend writes each email to the log.                                                    |
| `BREVO_SENDER_EMAIL`                       | empty                                                      | Sender address. Required when `BREVO_API_KEY` has a value.                                                                  |
| `BREVO_SENDER_NAME`                        | `My Store`                                                 | Sender name                                                                                                                 |
| `MAYAR_API_URL`                            | `https://api.mayar.io/hl/v2`                               | The Mayar API. The default is the sandbox. Production uses `https://api.mayar.id/hl/v2`.                                    |
| `MAYAR_API_KEY`                            | empty                                                      | The Mayar API key. With an empty key, checkout shows an error.                                                              |
| `STORE_OWNER_EMAIL`                        | empty                                                      | The address that gets the `paid-cart-alert` email. If it is empty, the backend writes the alert to the log.                 |
| `S3_BUCKET`                                | `store-assets`                                             | Garage bucket for the product images. If it is empty, Medusa keeps the images in `static/`. Only `.env.test` sets it empty. |
| `S3_FILE_URL`                              | `http://assets.localhost:3902`                             | Public address of the product images                                                                                        |
| `S3_REGION`                                | `garage`                                                   | S3 region of Garage                                                                                                         |
| `S3_ENDPOINT`                              | `http://localhost:3900`                                    | S3 API of Garage                                                                                                            |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | empty                                                      | The Garage key from [step 3 of `docs/development.md`](../../docs/development.md). Required when `S3_BUCKET` has a value.    |

The backend does not start in these conditions:

- `SHIPPING_RATE_PER_KG` is not a positive whole number.
- `BREVO_API_KEY` has a value and `BREVO_SENDER_EMAIL` is empty.
- `S3_BUCKET` has a value and one of the other `S3_` keys is empty.

## Source layout

| Path                   | Content                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `medusa-config.ts`     | Project configuration. Module list comes from `src/config/modules.ts`.    |
| `src/config/`          | Pure functions that build the module list and the database options from the environment. |
| `src/api/`             | Custom HTTP routes. `middlewares.ts` adds validation and authentication.  |
| `src/modules/mayar/`   | Mayar payment provider                                                    |
| `src/modules/weight-shipping/` | Fulfillment provider that calculates the price from the weight    |
| `src/modules/brevo/`   | Brevo email provider and the email templates                              |
| `src/modules/product-review/` | Review data module                                                 |
| `src/modules/wishlist/` | Wishlist data module                                                     |
| `src/links/`           | Read-only links from reviews and wishlists to products, variants, and customers |
| `src/workflows/`       | Workflows for reviews and the wishlist                                    |
| `src/subscribers/`     | Email for `order.placed` and `auth.password_reset`                        |
| `src/jobs/`, `src/recovery/` | The `check-paid-carts` job and its logic                            |
| `src/seed/`, `src/scripts/seed.ts` | The seed steps and the seed command                           |
| `src/admin/`           | Admin dashboard extension: the **Reviews** page                           |
| `integration-tests/http/` | HTTP integration tests and their helpers                               |

## Seed data

`pnpm --filter @store/backend seed` creates the data below. You can run it again. It finds the
existing records and does not make copies.

- Sales channel "Default Sales Channel".
- Store currency IDR.
- Region "Indonesia" with country `id`, currency `idr`, and the payment provider `pp_mayar_mayar`.
- Stock location "Jakarta Warehouse" with a shipping service zone for Indonesia.
- Shipping option "Standard Shipping". Its price comes from the weight-shipping provider.
- Categories "Apparel" and "Kitchen".
- Three products: `plain-t-shirt`, `canvas-tote-bag`, and `cast-iron-pan`. Each variant has
  100 units in stock.
- Publishable API key "Storefront", linked to the sales channel.

Put the printed key in `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` of the storefront.

## Shipping price

The price is `SHIPPING_RATE_PER_KG` for each kilogram. The default is IDR 10,000. The backend adds
the variant weights (grams times quantity), rounds up to the next full kilogram, and uses a minimum
of 1 kg. A variant with no weight counts as 1 kg for each unit. Set the weight of each variant in
the admin dashboard.

The provider id is `weight-shipping_weight-shipping`.

## Email

The backend sends three emails:

| Template          | Event                                                       |
| ----------------- | ----------------------------------------------------------- |
| `order-placed`    | A customer places an order.                                 |
| `password-reset`  | A customer or an admin user asks for a password reset.      |
| `paid-cart-alert` | The recovery job cannot complete a paid cart.               |

In development, `BREVO_API_KEY` is empty, and the backend writes each email to its log. To send
real email, set the three `BREVO_` keys and start the backend again. A failed email does not stop
the order.

## Mayar payments

The store uses Mayar invoices. The customer pays on a page that Mayar hosts. The payment provider
id is `pp_mayar_mayar`. Mayar accepts IDR only.

### Sandbox key

1. Create an account at <https://web.mayar.io>.
2. Open <https://web.mayar.io/api-keys>.
3. Create a key with the scope "Read & Write".
4. Set `MAYAR_API_KEY` in `apps/backend/.env`.
5. Start the backend again.

Do not use a production key in development. A production key is from <https://web.mayar.id/api-keys>,
and it goes with `MAYAR_API_URL=https://api.mayar.id/hl/v2`.

Run `pnpm --filter @store/backend mayar:check` to verify the key. The command creates one sandbox
invoice and closes it. It does not run against the production host. Write the results in
[docs/mayar-sandbox-check.md](../../docs/mayar-sandbox-check.md).

### How a payment becomes an order

1. Checkout creates a Mayar invoice for the cart total. The invoice expires after 24 hours.
2. The customer pays on the Mayar page.
3. Mayar sends the customer to `/checkout/return` on the storefront. That page completes the cart.
4. The backend asks the Mayar API for the invoice. It creates the order only if Mayar reports
   the invoice as paid with the amount of the cart.

The backend does not trust the webhook body or the return URL. Each path asks the Mayar API.

Checkout needs the name, the email, and the mobile number of the customer.

### Webhook

The webhook completes the cart when the customer closes the browser after the payment.

1. Make the backend reachable from the internet. In development, use a tunnel, for example
   `cloudflared tunnel --url http://localhost:9000`.
2. Register the URL `https://<backend-host>/hooks/payment/mayar_mayar` in the Mayar dashboard
   (Integration, Webhook).

You can also register the URL with the API:

```bash
curl -X POST "$MAYAR_API_URL/webhooks/update" \
  -H "Authorization: Bearer $MAYAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"urlHook":"https://<backend-host>/hooks/payment/mayar_mayar"}'
```

Mayar does not sign its webhooks. The backend uses only the event `payment.received`, and it reads
only the invoice id (`data.productId`) from the body.

### Recovery job

The job `check-paid-carts` runs each 15 minutes. It looks at each pending payment session that is
at most 48 hours old. For a paid invoice, it completes the cart. The job checks 40 sessions
maximum in one run, because the Mayar API permits 50 requests for each minute. The job does
nothing while `MAYAR_API_KEY` is empty.

If the completion fails, the job sends one `paid-cart-alert` email to `STORE_OWNER_EMAIL`. If
`STORE_OWNER_EMAIL` is empty, the job writes the alert to the log. Then find the payment in the
Mayar dashboard. Create the order in the Medusa Admin, or return the money to the customer.

### Refunds

Mayar has no refund API. A refund in the Medusa Admin only records the refund. Return the money
in the Mayar dashboard.

## Product translations

The Translation Module is on (feature flag `translation`). The Store API returns the product text
in the locale of the header `x-medusa-locale`, for example `id-ID`.

To add Indonesian text:

1. Open the admin at `http://localhost:9000/app`.
2. Open **Settings**, then **Translations**.
3. Select the product, and enter the title and the description for the locale `id-ID`.

A product with no Indonesian text shows its English text.

## Product reviews

A customer can review a product only after the store ships the purchased item. One review is
possible for each purchased item. A review shows on the storefront only after you approve it.

To approve or reject reviews:

1. Open the admin dashboard and select **Reviews** in the sidebar.
2. Use the status filter to show the pending reviews.
3. Select one or more rows.
4. Use the command **Approve** or **Reject**.

A customer cannot edit or delete a review.

| Route                                      | Access   | Function                                                    |
| ------------------------------------------ | -------- | ----------------------------------------------------------- |
| `POST /store/reviews`                      | Customer | Submits a review for a shipped order item.                  |
| `GET /store/products/:id/reviews`          | Public   | Lists the approved reviews and the average rating.          |
| `GET /store/customers/me/reviewable-items` | Customer | Lists the shipped order items with no review.               |
| `GET /admin/reviews`                       | Admin    | Lists the reviews. The parameter `status` filters the list. |
| `POST /admin/reviews/status`               | Admin    | Sets the status of reviews to `approved` or `rejected`.     |

Errors of `POST /store/reviews`:

| Status | `type`            | Cause                                                                 |
| ------ | ----------------- | --------------------------------------------------------------------- |
| 400    | `invalid_data`    | The body is not valid. The rating must be a whole number from 1 to 5. |
| 400    | `not_allowed`     | The store did not ship the item.                                      |
| 401    | `unauthorized`    | The request has no customer session or token.                        |
| 404    | `not_found`       | The item is not in an order of the customer.                          |
| 422    | `duplicate_error` | The item already has a review.                                        |

## Wishlist

Each logged-in customer has one wishlist of product variants. The backend creates the wishlist when
the customer adds the first variant. There is no sharing feature.

| Route                                           | Access   | Function                                                                        |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `GET /store/customers/me/wishlist`              | Customer | Returns the wishlist with the variant, the product, and the price of each item. |
| `POST /store/customers/me/wishlist/items`       | Customer | Adds a variant. A second add of the same variant returns the existing item.     |
| `DELETE /store/customers/me/wishlist/items/:id` | Customer | Removes an item.                                                                |

A customer with no wishlist gets `{ "wishlist": { "id": null, "items": [] } }`.

## Tests

| Command                                              | Files                                    | Needs      |
| ---------------------------------------------------- | ---------------------------------------- | ---------- |
| `pnpm --filter @store/backend test:unit`             | `src/**/__tests__/**/*.unit.spec.ts`     | Nothing    |
| `pnpm --filter @store/backend test:integration:http` | `integration-tests/http/*.spec.ts`       | PostgreSQL |

- The tests read `.env.test`. The values in `.env.test` win over the values in `.env`.
- `.env.test` sets an empty `REDIS_URL`. Thus the tests do not need Redis.
- The integration tests replace `fetch` for the host `mayar.test`. They do not call the real
  Mayar API.
- Set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, or `DB_PASSWORD` to use a different PostgreSQL server.
- To run one file, give its path:
  `pnpm --filter @store/backend test:unit src/modules/mayar/__tests__/client.unit.spec.ts`.

## Docker image

`Dockerfile` builds the production image. The build context is the repository root.

- The build argument `MEDUSA_BACKEND_URL` sets the API address of the admin dashboard.
- The image runs from `/server`, because `/app` is the admin path.
- The image listens on port 9000 and starts with `npm run start`.

Production runs the same image as `medusa-server` and as `medusa-worker`. See
[docs/deployment.md](../../docs/deployment.md).
