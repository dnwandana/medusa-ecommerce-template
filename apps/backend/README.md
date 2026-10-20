# Backend

The Medusa v2 backend of the store (`@store/backend`). It serves the Store API, the Admin API, and
the admin dashboard on port 9000.

For the first setup, see [docs/development.md](../../docs/development.md). Run the commands in
this document from the repository root.

## Commands

| Command                                                                  | Function                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `pnpm --filter @store/backend dev`                                       | Starts the backend in development mode (`medusa develop`).                |
| `pnpm --filter @store/backend build`                                     | Builds the server and the admin into `.medusa/server`.                    |
| `pnpm --filter @store/backend start`                                     | Starts the built server.                                                  |
| `pnpm --filter @store/backend exec medusa db:migrate`                    | Runs the database migrations. Run it again after you pull new migrations. |
| `pnpm --filter @store/backend seed`                                      | Creates the store data. The last output line is `PUBLISHABLE_KEY=pk_...`. |
| `pnpm --filter @store/backend exec medusa user -e <email> -p <password>` | Creates an admin user.                                                    |
| `pnpm --filter @store/backend test:unit`                                 | Runs the unit tests.                                                      |
| `pnpm --filter @store/backend test:integration:http`                     | Runs the HTTP integration tests. They need PostgreSQL.                    |

## Addresses

| Address                         | Use                                                 |
| ------------------------------- | --------------------------------------------------- |
| http://localhost:9000/app       | Admin dashboard                                     |
| http://localhost:9000/health    | Health check                                        |
| http://localhost:9000/store/... | Store API. Send the header `x-publishable-api-key`. |
| http://localhost:9000/admin/... | Admin API                                           |

## Environment keys

The file is `apps/backend/.env`. Copy it from `.env.example`.

| Key                                        | Default                                                    | Function                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | `postgres://postgres:postgres@localhost:5432/medusa-store` | PostgreSQL connection                                                                                                                                                 |
| `DATABASE_SSL`                             | empty                                                      | Set `false` only when PostgreSQL has no TLS. The production Compose file sets it.                                                                                     |
| `REDIS_URL`                                | `redis://localhost:6379`                                   | Redis connection. If it is empty, Medusa uses its in-memory modules.                                                                                                  |
| `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`    | local addresses                                            | Origins that can call the API                                                                                                                                         |
| `JWT_SECRET`, `COOKIE_SECRET`              | `supersecret`                                              | Secrets. Set new values in production.                                                                                                                                |
| `STOREFRONT_URL`                           | `http://localhost:3000`                                    | Base URL for the email links and for the return URL of a payment gateway                                                                                              |
| `MEDUSA_BACKEND_URL`                       | `http://localhost:9000`                                    | Public URL of the backend. The admin dashboard reads it at build time.                                                                                                |
| `MEDUSA_WORKER_MODE`                       | `shared`                                                   | `shared`, `server`, or `worker`                                                                                                                                       |
| `DISABLE_MEDUSA_ADMIN`                     | `false`                                                    | `true` on a worker instance                                                                                                                                           |
| `SHIPPING_RATE_PER_KG`                     | `10000`                                                    | Shipping price in IDR for each kilogram. Must be a positive whole number.                                                                                             |
| `BREVO_API_KEY`                            | empty                                                      | Brevo API key. If it is empty, the backend writes each email to the log.                                                                                              |
| `BREVO_SENDER_EMAIL`                       | empty                                                      | Sender address. Required when `BREVO_API_KEY` has a value.                                                                                                            |
| `BREVO_SENDER_NAME`                        | `Everyday`                                                 | Sender name                                                                                                                                                           |
| `STORE_OWNER_EMAIL`                        | empty                                                      | The fallback address for the `paid-cart-alert` and `receipt-uploaded` emails when the store contact email is empty. If both are empty, the backend writes a log line. |
| `S3_BUCKET`                                | `store-assets`                                             | Garage bucket for the product images. If it is empty, Medusa keeps the images in `static/`. Only `.env.test` sets it empty.                                           |
| `S3_FILE_URL`                              | `http://assets.localhost:3902`                             | Public address of the product images                                                                                                                                  |
| `S3_REGION`                                | `garage`                                                   | S3 region of Garage                                                                                                                                                   |
| `S3_ENDPOINT`                              | `http://localhost:3900`                                    | S3 API of Garage                                                                                                                                                      |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | empty                                                      | The Garage key from [step 3 of `docs/development.md`](../../docs/development.md). Required when `S3_BUCKET` has a value.                                              |
| `S3_RECEIPTS_BUCKET`                       | `store-receipts`                                           | Private Garage bucket for the payment receipts. Required when `S3_BUCKET` has a value. It must not be `S3_BUCKET`.                                                    |
| `RECEIPTS_DIR`                             | `uploads/receipts`                                         | Private directory for the payment receipts when `S3_BUCKET` is empty. The path is relative to the backend directory.                                                  |

The backend does not start in these conditions:

- `SHIPPING_RATE_PER_KG` is not a positive whole number.
- `BREVO_API_KEY` has a value and `BREVO_SENDER_EMAIL` is empty.
- `S3_BUCKET` has a value and one of the other `S3_` keys is empty.
- `S3_BUCKET` has a value and `S3_RECEIPTS_BUCKET` is the same bucket.

## Source layout

| Path                                | Content                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medusa-config.ts`                  | Project configuration. Module list comes from `src/config/modules.ts`.                                                                                      |
| `src/config/`                       | Pure functions that build the module list and the database options from the environment.                                                                    |
| `src/api/`                          | Custom HTTP routes. `middlewares.ts` adds validation and authentication.                                                                                    |
| `src/modules/bank-transfer/`        | Bank transfer payment provider                                                                                                                              |
| `src/modules/bank-account/`         | Bank account and store contact data module                                                                                                                  |
| `src/modules/weight-shipping/`      | Fulfillment provider that calculates the price from the weight                                                                                              |
| `src/modules/brevo/`                | Brevo email provider and the email templates                                                                                                                |
| `src/modules/product-review/`       | Review data module                                                                                                                                          |
| `src/modules/wishlist/`             | Wishlist data module                                                                                                                                        |
| `src/modules/storefront/`           | Storefront data module: the settings row, the store colours, and the home campaigns                                                                         |
| `src/modules/magic-link/`           | Magic link data module: the sign-in requests, the token helpers, and the browser text                                                                       |
| `src/modules/payment-receipt/`      | Payment receipt data module: the receipts, the owner notes, the file rules, and the private receipt storage                                                 |
| `src/lib/`                          | The option names, the metadata keys, the payment rules of a bank transfer order, and the pure logic of the catalog routes                                   |
| `src/links/`                        | Read-only links from reviews and wishlists to products, variants, and customers                                                                             |
| `src/workflows/`                    | Workflows for reviews, the wishlist, the publish of a home campaign, the customer account of a magic link, and the receipt upload                           |
| `src/subscribers/`                  | Email for `order.placed`, `shipment.created`, `auth.password_reset` (admin users only), and the two receipt events. The customer name from the first order. |
| `src/jobs/`, `src/recovery/`        | The `check-paid-carts` job and its logic                                                                                                                    |
| `src/jobs/`, `src/payment-timeout/` | The `cancel-unpaid-orders` job and its logic                                                                                                                |
| `src/seed/`, `src/scripts/seed.ts`  | The seed steps and the seed command                                                                                                                         |
| `src/admin/`                        | Admin dashboard extension: the **Reviews** and **Home campaigns** pages, the **Bank transfer** and **Storefront** settings pages, and four widgets          |
| `integration-tests/http/`           | HTTP integration tests and their helpers                                                                                                                    |

## Seed data

`pnpm --filter @store/backend seed` creates the data below. You can run it again. It finds the
existing records and does not make copies.

- Sales channel "Default Sales Channel".
- Store currency IDR.
- Region "Indonesia" with country `id`, currency `idr`, and the payment provider
  `pp_bank-transfer_bank-transfer`.
- Stock location "Jakarta Warehouse" with a shipping service zone for Indonesia.
- Shipping option "Standard Shipping". Its price comes from the weight-shipping provider.
- Categories "Clothing" and "Kitchen". "Apparel" is a child of "Clothing".
- Three products: `plain-t-shirt`, `canvas-tote-bag`, and `cast-iron-pan`. Each variant has
  100 units in stock.
- The T-shirt has the options "Size" (S, M, L) and "Colour" (Black, White). It has six variants
  with the SKUs `TSHIRT-<size>-<colour>`, for example `TSHIRT-M-BLACK`. It has one image for each
  colour, and the seed links each image to the variants of that colour. It has the tag
  "Fabric: Cotton".
- The store colours Black `#1d1b18`, White `#f4f1eb`, and Sage `#9aa68c`.
- The price limits 200000 and 500000. They make three price ranges in the storefront. The seed
  saves them only when the storefront settings have no row. The seed creates no home campaign.
- Publishable API key "Storefront", linked to the sales channel.
- One bank account "Sample Bank" `1234567890` (holder "Sample Store") and the store contact
  `store@example.com` and `+6281234567890`. The seed does not change the records that the owner
  edited. Replace the sample values in the admin dashboard before the store opens.

Put the printed key in `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` of the storefront.

## Shipping price

The price is `SHIPPING_RATE_PER_KG` for each kilogram. The default is IDR 10,000. The backend adds
the variant weights (grams times quantity), rounds up to the next full kilogram, and uses a minimum
of 1 kg. A variant with no weight counts as 1 kg for each unit. Set the weight of each variant in
the admin dashboard.

The provider id is `weight-shipping_weight-shipping`.

## Email

The backend sends these emails:

| Template              | Event                                                                       | To                |
| --------------------- | --------------------------------------------------------------------------- | ----------------- |
| `magic-link`          | A customer asks for a sign-in link.                                         | The customer      |
| `welcome`             | A customer signs in for the first time. The storefront asks for the email.  | The customer      |
| `order-placed`        | A customer places an order.                                                 | The customer      |
| `order-shipped`       | Staff mark a shipment as shipped.                                           | The customer      |
| `password-reset`      | An admin user asks for a password reset.                                    | The admin user    |
| `paid-cart-alert`     | The recovery job cannot complete a paid cart.                               | The owner address |
| `receipt-uploaded`    | A customer uploads a payment receipt. The email links to the order.         | The owner address |
| `more-payment-needed` | The owner uses **Ask for more**. The email has the note and the order link. | The customer      |

The emails exist in English (`en-US`) and Indonesian (`id-ID`):

- An order email uses the order locale. The storefront sets the locale on the cart.
- The `magic-link` and `welcome` emails use the header `x-medusa-locale` of the request.
- The owner emails (`paid-cart-alert` and `receipt-uploaded`) and `password-reset` stay in English.

The owner emails go to the owner address. The owner address is the store contact email
(Settings → Bank transfer in the admin dashboard). If the store contact email is empty, the owner
address is `STORE_OWNER_EMAIL`. If both are empty, the backend sends no owner email and writes a
log line.

The `receipt-uploaded` email has no image and no file link, because the receipt is private. The
owner opens the receipt in the admin dashboard.

Customers have no password, so the backend sends no password reset email to a customer.

In development, `BREVO_API_KEY` is empty, and the backend writes each email to its log. To send
real email, set the three `BREVO_` keys and start the backend again. A failed email does not stop
the order.

## Bank transfer payments

Bank transfer is the only payment provider of the store. The provider id is
`pp_bank-transfer_bank-transfer`. It needs no env key.

### How an order is paid

1. The customer selects bank transfer at checkout and places the order. There is no redirect.
2. The provider authorizes the payment at once, and the cart becomes an order.
3. The order page of the storefront (`/orders/:id`) and the `order-placed` email show the amount,
   the active bank accounts, and the deadline. The deadline is the order time plus 24 hours, in
   WIB.
4. The customer transfers the money and uploads the receipt on the order page.
5. When the money arrives in the bank account, click **Accept payment** on the order in the admin
   dashboard. See [Payment receipts](#payment-receipts).

The bank details show only while the payment is `authorized`. After the capture, the order page
does not show them.

An order with no receipt and no captured payment is cancelled 24 hours after the order time.

### Bank accounts

Open the admin dashboard, then **Settings**, then **Bank transfer**. On this page you can:

- Add, edit, and delete the bank accounts.
- Set an account to active or inactive.
- Change the order of the accounts with the Up and Down buttons.
- Set the store contact: an email address and a WhatsApp number in the E.164 format, for example
  `+6281234567890`.

The customer sees only the active accounts, in `rank` order. A new account with no `rank` goes
after the other accounts.

| Route                             | Access | Function                                                        |
| --------------------------------- | ------ | --------------------------------------------------------------- |
| `GET /store/bank-transfer`        | Public | Lists the active accounts (public fields only) and the contact. |
| `GET /admin/bank-accounts`        | Admin  | Lists all accounts in `rank` order.                             |
| `POST /admin/bank-accounts`       | Admin  | Creates an account. The account number has 5 to 20 digits.      |
| `POST /admin/bank-accounts/:id`   | Admin  | Changes the fields of an account.                               |
| `DELETE /admin/bank-accounts/:id` | Admin  | Deletes an account.                                             |
| `GET /admin/store-contact`        | Admin  | Returns the store contact.                                      |
| `POST /admin/store-contact`       | Admin  | Saves the store contact. `null` clears a value.                 |

### Payment receipts

The customer sends a proof of payment for a bank transfer order. The owner checks it in the admin
dashboard.

Customer:

- The customer uploads 1 to 3 receipts on the order page. A guest needs only the order link.
- A receipt is a JPG, PNG, or WebP file of at most 5 MB. The backend checks the file bytes, not the
  file name.
- The upload is open while the order is not cancelled and the payment is not captured. After 3
  receipts, the order page shows the store contact.
- The customer cannot delete a receipt.

Owner:

1. The `receipt-uploaded` email arrives at the owner address. Click **Open the order**.
2. The **Payment receipts** section of the order shows the receipts. Click a receipt to open the
   full image.
3. Select one action:
   - **Accept payment**: Medusa captures the full amount. The customer gets no email.
   - **Ask for more**: write a note of at most 500 characters. The order goes back to "Waiting for
     payment". The customer sees the note on the order page and gets the `more-payment-needed`
     email. The customer can then upload one more receipt, if the order has fewer than 3.
   - **Cancel order**: Medusa cancels the order and releases the stock.

The section shows only on a bank transfer order. The actions go away after the capture or the
cancellation.

The receipts are private. With `S3_BUCKET` set, they go to the bucket `S3_RECEIPTS_BUCKET`, which
has no web endpoint. With `S3_BUCKET` empty, they go to `RECEIPTS_DIR`. Only an admin user can read
a receipt file.

The job `cancel-unpaid-orders` runs each 15 minutes. It cancels a bank transfer order that is
not cancelled, has no captured payment, has no receipt, and is older than 24 hours. After the
first receipt, the job never cancels the order. The job reads only the orders of the last 7 days
and cancels at most 50 orders in one run. It sets `metadata.cancel_reason` to `payment_timeout`.

| Route                                          | Access | Function                                                                                                                                     |
| ---------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /store/orders/:id/receipts`              | Public | Saves a receipt. The body is `{ file_name, content }` with the file as base64. Returns 201 and `{ receipt: { id, file_name, created_at } }`. |
| `GET /store/payment-states?order_id=`          | Public | Takes 1 to 50 order ids. Returns the provider, the capture time, the receipts, and the newest note of each order.                            |
| `GET /admin/orders/:id/receipts`               | Admin  | Returns the receipts of the order, oldest first, and the newest note.                                                                        |
| `GET /admin/payment-receipts/:id/file`         | Admin  | Returns the image of a receipt.                                                                                                              |
| `POST /admin/orders/:id/receipts/accept`       | Admin  | Captures the open bank transfer payment of the order.                                                                                        |
| `POST /admin/orders/:id/receipts/ask-for-more` | Admin  | Saves the note `{ note }` and sends the `more-payment-needed` email.                                                                         |

The answers of the Store routes have no file key, no file URL, and no file bytes.

Errors of `POST /store/orders/:id/receipts`:

| Status | `type`         | Cause                                                                                            |
| ------ | -------------- | ------------------------------------------------------------------------------------------------ |
| 400    | `invalid_data` | The file is not a JPG, PNG, or WebP file, or it is larger than 5 MB.                             |
| 400    | `invalid_data` | The order is not a bank transfer order, is cancelled, has a captured payment, or has 3 receipts. |
| 404    | `not_found`    | The order does not exist.                                                                        |

The ask-for-more route refuses an empty note and a note of more than 500 characters with 400
`invalid_data`. Medusa adds `Invalid request: ` before the message, for example
`Invalid request: Write a note for the customer.`

### Recovery job

The job `check-paid-carts` runs each 15 minutes. For each adapter in `RECOVERY_ADAPTERS`
(`src/recovery/adapters.ts`), it looks at each pending payment session of that provider that is at
most 48 hours old. If the gateway reports the session as paid, the job completes the cart. The
job checks `maxSessionsPerRun` sessions of each adapter maximum in one run.

The list is empty now, so the job does nothing. A bank transfer needs no recovery, because its cart
completes at checkout. A project that adds a payment gateway adds one adapter for the gateway. The
type `RecoveryAdapter` in the same file describes the adapter. The adapter rules are in
[`docs/payments/README.md`](../../docs/payments/README.md).

If the completion fails, the job sends one `paid-cart-alert` email to the owner address (see
[Email](#email)). If the owner address is empty, the job writes the alert to the log.

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

| Route                                      | Access   | Function                                                                                                         |
| ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST /store/reviews`                      | Customer | Submits a review for a shipped order item.                                                                       |
| `GET /store/products/:id/reviews`          | Public   | Lists the approved reviews and the average rating. Each review has the size of the purchased variant, or `null`. |
| `GET /store/customers/me/reviewable-items` | Customer | Lists the shipped order items with no review.                                                                    |
| `GET /admin/reviews`                       | Admin    | Lists the reviews. The parameter `status` filters the list.                                                      |
| `POST /admin/reviews/status`               | Admin    | Sets the status of reviews to `approved` or `rejected`.                                                          |

Errors of `POST /store/reviews`:

| Status | `type`            | Cause                                                                 |
| ------ | ----------------- | --------------------------------------------------------------------- |
| 400    | `invalid_data`    | The body is not valid. The rating must be a whole number from 1 to 5. |
| 400    | `not_allowed`     | The store did not ship the item.                                      |
| 401    | `unauthorized`    | The request has no customer session or token.                         |
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

## Storefront settings

The `storefront` module keeps the storefront settings, the store colours, and the home campaigns.

### Settings page

In the admin dashboard, open **Settings → Storefront**. The badge sections and the price ranges
have their own **Save** button. A colour saves in its own form.

1. In **New badge**, set the number of days that a new product shows "New". Use 0 to 365. 0
   turns off the badge. The default is 30.
2. In **Limited stock badge**, set the low stock threshold. Use 0 to 999. 0 turns off the badge.
   The default is 5. A product that does not track stock, or that allows backorders, never shows
   the badge.
3. In **Colours**, add, edit, or delete a store colour. A colour has a name and a hex, for example
   `#9aa68c`. Two colours cannot have the same name.
4. In **Price ranges**, add a range and type its "To" amount in rupiah. The last range has no
   maximum. N limits make N + 1 ranges. With no range, the storefront hides the Price filter.

### Home campaigns page

A home campaign sets the hero of the storefront home page. Only one campaign is live at a time.
Select **Home campaigns** in the sidebar of the admin dashboard.

1. To create a campaign, click **Create**. Type the content in English and in Bahasa Indonesia,
   the link, and the image URLs. The new campaign is a draft.
2. To publish a campaign, open the row menu and select **Publish**. The old live campaign
   changes to "Ended".
3. To remove the hero, select **Unpublish** on the live campaign. The campaign changes to
   "Ended".
4. To copy a campaign, select **Duplicate**. The copy is a draft.
5. To delete a campaign, select **Delete**. You can delete only a draft.

- An image URL must start with `http://` or `https://`.
- The link is a category, all products, or a store path that starts with `/`.
- A publish fails when the link category no longer exists.
- If staff delete the category of a live campaign, the Store route returns the link `/products`.

### Widgets

| Widget            | Page                  | What it stores                                                                                                                     |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `category-tile`   | Category, side column | `metadata.show_on_home` (boolean) and `metadata.tile_image_url`. With no image, the tile uses the thumbnail of the newest product. |
| `product-details` | Product, main column  | `metadata.product_details`: the "Details and fit" and the "Fabric and care" lines, each in English and Bahasa Indonesia.           |
| `colour-dots`     | Product, side column  | `metadata.colour_hex`, for example `{ "Sage": "#9aa68c" }`. A product hex wins over the store colour of the same name.             |

The storefront finds the colour and the size options by their names. An option is a colour when
its name is "Colour", "Color" or "Warna". An option is a size when its name is "Size" or "Ukuran".
The match ignores the case and the outer spaces. A product tag that starts with `Fabric:` names
the fabric, for example "Fabric: Cotton".

### Routes

| Route                                      | Access | Function                                                                                                     |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------ |
| `GET /store/storefront/settings`           | Public | Returns `new_badge_days`, `low_stock_threshold`, the colours (`name`, `hex`), and the sorted `price_limits`. |
| `GET /store/storefront/home-campaign`      | Public | Returns the live campaign in the locale of `x-medusa-locale`, or `null`.                                     |
| `GET /store/storefront/home-categories`    | Public | Returns the categories with `show_on_home`, in rank order, each with its tile image.                         |
| `GET /store/storefront/catalog/filters`    | Public | Returns the size, colour, and fabric values of the published products.                                       |
| `GET /store/storefront/catalog/products`   | Public | Returns one page of the published products with the filters, the price range, and the sort.                  |
| `GET /admin/storefront/settings`           | Admin  | Returns the settings.                                                                                        |
| `POST /admin/storefront/settings`          | Admin  | Replaces the three settings.                                                                                 |
| `GET /admin/storefront/colours`            | Admin  | Lists the store colours by name.                                                                             |
| `POST /admin/storefront/colours`           | Admin  | Creates a store colour.                                                                                      |
| `POST /admin/storefront/colours/:id`       | Admin  | Changes the name or the hex of a store colour.                                                               |
| `DELETE /admin/storefront/colours/:id`     | Admin  | Deletes a store colour.                                                                                      |
| `GET /admin/home-campaigns`                | Admin  | Lists the campaigns. The parameters `status` and `q` filter the list.                                        |
| `POST /admin/home-campaigns`               | Admin  | Creates a draft campaign.                                                                                    |
| `GET /admin/home-campaigns/:id`            | Admin  | Returns a campaign.                                                                                          |
| `POST /admin/home-campaigns/:id`           | Admin  | Replaces the content and the link of a campaign.                                                             |
| `DELETE /admin/home-campaigns/:id`         | Admin  | Deletes a draft campaign.                                                                                    |
| `POST /admin/home-campaigns/:id/publish`   | Admin  | Makes the campaign live and ends the old live campaign (workflow `publish-home-campaign`).                   |
| `POST /admin/home-campaigns/:id/unpublish` | Admin  | Ends the live campaign.                                                                                      |
| `POST /admin/home-campaigns/:id/duplicate` | Admin  | Copies the campaign into a new draft.                                                                        |

The two catalog routes take `category_id` as one id, a list of ids with commas, or an array. A
product in one of the categories matches. The storefront sends a category and the ids of its
descendant categories. `q` matches a part of the product title. The products route also takes
`region_id`, `size`, `colour`, `fabric`, `price_from`, `price_to`, `sort` (`newest`,
`price-asc`, or `price-desc`), `limit`, and `offset`. It sorts the prices in memory, so it gets
slow above about 1,000 products in one list.

## Customer sign-in

Customers sign in only with a magic link. They have no password. `medusa-config.ts` closes the
customer `emailpass` routes.

1. The customer types an email. The storefront sends `POST /store/magic-link`. The backend sends
   the `magic-link` email and returns `request_id` and `secret` to the browser.
2. The customer opens the link. The storefront sends `POST /store/magic-link/verify`. This route
   changes nothing, so a mail scanner that opens the link uses up nothing.
3. In the same browser, the storefront sends `POST /store/magic-link/session` with the id, the
   secret, and the token. On another device, the customer clicks "Yes, sign me in" and the
   storefront sends `POST /store/magic-link/confirm`. The original tab then gets the session.
4. The session route runs the workflow `resolve-customer-account` and returns a token. The
   storefront sends the token one time to `POST /auth/session`, which sets the session cookie.
5. If the customer has no `metadata.welcome_sent_at`, the storefront sends
   `POST /store/customers/me/welcome`. The backend saves the name and sends the `welcome` email
   one time.

- A link works one time and expires after 15 minutes.
- One email gets at most one link in 60 seconds.
- A new request makes the older links of the email invalid.
- After the confirm on another device, the original tab has 5 minutes to get the session.
- The answer of `POST /store/magic-link` is the same for a known and an unknown email.
- The database keeps only hashes of the token and the secret.
- One email gives one customer. A guest customer with the same email becomes the account, so the
  guest orders show in the account.

| Route                              | Access   | Function                                                                                                |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `POST /store/magic-link`           | Public   | Sends the sign-in link. Returns 429 with `type` `rate_limited` in the 60 seconds after a link.          |
| `POST /store/magic-link/verify`    | Public   | Returns the browser and the time of the request for the confirm screen. It has no email.                |
| `POST /store/magic-link/confirm`   | Public   | Marks the link as confirmed from another device.                                                        |
| `POST /store/magic-link/status`    | Public   | Returns `pending`, `confirmed`, `used`, `expired`, or `invalid`. The original tab asks every 3 seconds. |
| `POST /store/magic-link/session`   | Public   | Uses up the link and returns a customer token. The secret is always necessary.                          |
| `POST /store/customers/me/welcome` | Customer | Saves the name and sends the `welcome` email one time. `{}` keeps the name.                             |

## Order tracking

The Store order route of Medusa does not return the order `metadata`, `fulfillments.labels`, or
`fulfillments.items`. Thus the backend has its own tracking route.

| Route                            | Access | Function                                                                                                    |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `GET /store/orders/:id/tracking` | Public | Returns `cancel_reason` and the shipped fulfillments that are not canceled, each with its items and labels. |

The answer has no address, email, price, or customer field.

When staff mark a fulfillment as shipped in the admin, the backend sends the `order-shipped`
email with the tracking numbers. The email links only an https tracking URL. A shipment with
`no_notification: true` sends no email. A delivery sends no email.

## Tests

| Command                                              | Files                                | Needs      |
| ---------------------------------------------------- | ------------------------------------ | ---------- |
| `pnpm --filter @store/backend test:unit`             | `src/**/__tests__/**/*.unit.spec.ts` | Nothing    |
| `pnpm --filter @store/backend test:integration:http` | `integration-tests/http/*.spec.ts`   | PostgreSQL |

- The tests read `.env.test`. The values in `.env.test` win over the values in `.env`.
- `.env.test` sets an empty `REDIS_URL`. Thus the tests do not need Redis.
- Set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, or `DB_PASSWORD` to use a different PostgreSQL server.
- To run one file, give its path:
  `pnpm --filter @store/backend test:unit src/modules/bank-transfer/__tests__/service.unit.spec.ts`.

## Docker image

`Dockerfile` builds the production image. The build context is the repository root.

- The build argument `MEDUSA_BACKEND_URL` sets the API address of the admin dashboard.
- The image runs from `/server`, because `/app` is the admin path.
- The image listens on port 9000 and starts with `npm run start`.

Production runs the same image as `medusa-server` and as `medusa-worker`. See
[docs/deployment.md](../../docs/deployment.md).
