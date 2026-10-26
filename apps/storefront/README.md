# Storefront

The Nuxt 4 storefront of the store (`@store/storefront`). It uses Vue 3, Tailwind CSS 4,
shadcn-vue, and `@nuxtjs/i18n`. It calls the Medusa backend through `@medusajs/js-sdk`.

The backend must run first, and it must have the seed data. See
[docs/development.md](../../docs/development.md).

## Commands

Run the commands from the repository root.

| Command                                     | Function                                         |
| ------------------------------------------- | ------------------------------------------------ |
| `pnpm --filter @store/storefront dev`       | Starts the development server on port 3000.      |
| `pnpm --filter @store/storefront build`     | Builds the app into `.output`.                   |
| `pnpm --filter @store/storefront preview`   | Starts the built app.                            |
| `pnpm --filter @store/storefront test`      | Runs all tests.                                  |
| `pnpm --filter @store/storefront test:unit` | Runs the unit tests (`test/unit`).               |
| `pnpm --filter @store/storefront test:nuxt` | Runs the component and page tests (`test/nuxt`). |

`pnpm install` runs `nuxt prepare`, which generates the types in `.nuxt`.

## Environment keys

The keys are in `apps/storefront/.env`. Copy the file from `.env.example`.

| Key                                  | Purpose                                                                                                                | Development value       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `NUXT_PUBLIC_MEDUSA_BACKEND_URL`     | The backend URL that the browser calls.                                                                                | `http://localhost:9000` |
| `NUXT_MEDUSA_BACKEND_URL`            | The backend URL that the Nuxt server calls.                                                                            | `http://localhost:9000` |
| `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | The publishable API key.                                                                                               | The output of the seed  |
| `NUXT_PUBLIC_SITE_URL`               | The public origin of the storefront, with no trailing slash. The canonical URLs, the sitemap, and `robots.txt` use it. | `http://localhost:3000` |

The two URL keys are different only when the Nuxt server reaches the backend on a private network.
Nuxt reads the keys when the server starts. A new value does not need a new build. In production,
`docker-compose.yml` sets `NUXT_PUBLIC_SITE_URL` to `https://<domain>`.

## Pages

| Route                     | Content                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | The home campaign or a text hero, the four newest products, the home categories, and the service row                         |
| `/products`               | All products with filters, a sort, and the category links. 12 products load at a time.                                       |
| `/categories/:handle`     | The products of one category and of its descendant categories, with filters and a sort                                       |
| `/search`                 | The products that match the `q` text. With no match, the four newest products. No search engine indexes it.                  |
| `/products/:handle`       | Gallery, colour and size, add to cart, wishlist, details, reviews, and "You may also like"                                   |
| `/cart`                   | Cart lines, stock limits, move to the wishlist, the summary with "You save", and "You may also like"                         |
| `/checkout`               | Email, delivery address, delivery method, and payment on one page. Uses the checkout layout.                                 |
| `/checkout/return`        | The return page after the payment on a gateway page. Uses the checkout layout.                                               |
| `/orders/:id`             | The order status, tracker, shipments, and summary. A bank transfer order also shows the receipts.                            |
| `/account/sign-in`        | Sign-in form for the email. Then "Check your email", which waits for the link.                                               |
| `/account/sign-in/verify` | The page of the link in the email. It signs in this browser, or confirms the sign-in of another device.                      |
| `/account/welcome`        | The first sign-in only: an optional full name. Needs a sign-in.                                                              |
| `/account`                | Profile: full name and phone. Needs a sign-in.                                                                               |
| `/account/orders`         | Order history with the status of each order, and the items to review. Needs a sign-in.                                       |
| `/account/addresses`      | Saved addresses: add, edit, delete, and set the default. Needs a sign-in.                                                    |
| `/account/wishlist`       | Wishlist. Needs a sign-in.                                                                                                   |
| `/delivery`               | Delivery information                                                                                                         |
| `/returns`                | Returns information                                                                                                          |
| `/about`                  | The story of the store                                                                                                       |
| `/privacy`                | Privacy policy                                                                                                               |
| `/terms`                  | Terms                                                                                                                        |
| `/contact`                | The WhatsApp number, the email, the phone, the address, and the social links of the store, from `/store/storefront/settings` |

Each route also exists with the prefix `/id`. The text of the five static pages (`/delivery`,
`/returns`, `/about`, `/privacy`, `/terms`) is in the locale files, below `pages`.

The home hero shows the live campaign that staff publish in the admin: a full-width photo, then
a row of two text columns. With no live campaign, the hero shows the text of the locale files.

The footer has a Contact column with the WhatsApp number, the email, the phone, and the social
icons of the store. It shows no address. A field with no value does not show. With no value at
all, the column does not show. The contact comes from `/store/storefront/settings`.

A product URL can name a variant: `/products/:handle?variant=<variant id>`. The page then opens
with that variant selected. A new selection changes the URL, but it adds no browser history entry.

## SEO

- The server HTML of each indexable page has the title, the description, the canonical URL, the
  hreflang links, the Open Graph tags, and the JSON-LD. The indexable pages are the home page,
  `/products`, the category pages, the product pages, the static pages, and `/contact`.
- The private pages (`/cart`, `/checkout`, `/orders`, `/account`, `/search`, and their `/id`
  copies) send the header `X-Robots-Tag: noindex`.
- `/robots.txt` and `/sitemap.xml` are Nitro routes in `server/routes/`. The sitemap reads the
  products and the categories from the backend, and keeps the result for 1 hour.
- `public/og-default.jpg` (1200×630) is the default share image. `public/logo.png` is the logo in
  the JSON-LD. Each client replaces the two files. See
  [docs/deployment.md](../../docs/deployment.md#seo).

## Source layout

| Path                          | Content                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/pages/`                  | Pages                                                                                                                                                              |
| `app/layouts/default.vue`     | The announcement bar, the header (navigation, search, language, account, wishlist, cart), and the footer                                                           |
| `app/layouts/checkout.vue`    | "Back to cart", the wordmark, "Secure checkout", and a short footer. The checkout pages use it.                                                                    |
| `app/error.vue`               | The error page. A 404 shows the text of its `messageKey` and the category links.                                                                                   |
| `app/app.config.ts`           | The store name                                                                                                                                                     |
| `app/components/`             | Store components                                                                                                                                                   |
| `app/components/ui/`          | shadcn-vue components                                                                                                                                              |
| `app/composables/`            | Medusa SDK client, cart, region, catalog, listings, search, settings, checkout, customer, sign-in, addresses, orders, receipts, reviews, wishlist                  |
| `app/utils/`                  | Pure functions: price format, address form, catalog query, price ranges, badges, sign-in, retry, redirects, bank transfer, order status, receipts, social networks |
| `app/types/storefront.ts`     | The types of the storefront settings, the store contact, and the home campaign                                                                                     |
| `app/middleware/auth.ts`      | Sends a guest to the sign-in page                                                                                                                                  |
| `server/routes/`              | The Nitro routes `robots.txt` and `sitemap.xml`. Their helpers are in `server/utils/`.                                                                             |
| `app/assets/css/tailwind.css` | Tailwind, the design tokens, the type utilities, and the `@font-face` rules                                                                                        |
| `public/fonts/`               | The font files: Cormorant Garamond (regular and italic) and Instrument Sans                                                                                        |
| `i18n/locales/`               | Interface text in `en.json` and `id.json`                                                                                                                          |
| `test/unit/`                  | Unit tests of `app/utils` and of the locale files                                                                                                                  |
| `test/nuxt/`                  | Tests of components, pages, composables, layouts, and middleware                                                                                                   |

## Languages

The storefront has two languages. English is the default language, at `/`. Indonesian is at
`/id/`. The interface text is in `i18n/locales/en.json` and `id.json`. Each key must exist in the
two files. A test checks this.

The storefront sends the header `x-medusa-locale` (`en-US` or `id-ID`) with each request. The
backend then returns the product text in that language. See "Product translations" in the
[backend README](../backend/README.md#product-translations).

The language changes the text only. Prices stay in Rupiah.

## Cart and region

- The cart id is in the cookie `cart_id` for 30 days.
- The storefront uses the first region of the backend. The seed creates one region: Indonesia.
- A customer who signs in gets the guest cart.

## Accounts

The customer signs in with a link in an email. There is no password. The same link creates the
account of a new customer.

The storefront uses a session cookie for the sign-in. The browser keeps the cookie, so the pages
below `/account` render in the browser only. Thus the storefront and the backend must be on the
same site in production (for example `store.example.com` and `api.example.com`).

The sign-in on the same device:

1. The customer types the email on `/account/sign-in`. The page shows "Check your email".
2. The customer opens the link in the email. The link opens `/account/sign-in/verify` in a new
   tab.
3. The new tab signs in the browser and tells the first tab. The first tab continues, and the new
   tab closes.

The sign-in on another device, for example a laptop with the email on a phone:

1. The customer types the email on `/account/sign-in` on the laptop.
2. The customer opens the link on the phone. The phone shows the browser and the time of the
   request.
3. The customer clicks "Yes, sign me in" on the phone. The laptop signs in within 3 seconds. The
   phone does not sign in.

A link works one time, for 15 minutes. A new link makes the older links of the email invalid. The
backend sends at most one link for each email in 60 seconds. The backend makes the link from its
`STOREFRONT_URL` key.

The first sign-in opens `/account/welcome`. The customer can type a full name or skip the step.
Then the backend sends the welcome email.

## Checkout

1. The customer enters the email and an Indonesian address. The contact is an email only. The
   address has one "Full name" field and no country field. A signed-in customer can select a
   saved address or save the new address.
2. The storefront saves the data on the cart and shows the shipping options.
3. The customer selects a shipping option.
4. The customer selects a payment method. The storefront lists the payment providers of the region.
5. **Place order** starts a payment session for that provider.
6. Bank transfer: the storefront completes the cart at once. It then shows `/orders/:id` with the
   bank accounts, the amount, the deadline in WIB, and the receipt upload. See "Order page".
7. Payment gateway: the storefront opens the gateway page. The gateway sends the customer back to
   `/checkout/return`.
   - The return page completes the cart. It tries five times, at intervals of 2 seconds, because
     the payment webhook can arrive late.
   - On success, the storefront shows `/orders/:id`. If the payment is not complete yet, the cart
     stays.

If the storefront cannot place the order, the cart stays and the page shows an error.

The phone number must be an Indonesian mobile number, for example `081234567890`. The postal code
must have 5 digits.

Checkout works with no payment key. The seed adds a sample bank account. A gateway webhook needs a
public URL for the backend.

## Order page

`/orders/:id` needs no sign-in. The long random order ID is the key. The page shows the status of
the order, from `customerStatus` in `app/utils/orderStatus.ts`:

| Status                | Meaning                                                    |
| --------------------- | ---------------------------------------------------------- |
| `waiting_for_payment` | A bank transfer order with no receipt, or with a new note. |
| `payment_submitted`   | A bank transfer order with a receipt. The store checks it. |
| `processing`          | A paid order, or a gateway order.                          |
| `shipped`             | A part or all of the order left the store.                 |
| `delivered`           | The order arrived.                                         |
| `cancelled`           | The store or the payment deadline cancelled the order.     |
| `refunded`            | The store refunded the payment.                            |

The account order list shows the same status as a badge.

A bank transfer order that is not paid and not cancelled shows two panels:

- The bank panel. It has three states:
  - No receipt: the amount, the bank accounts, and the deadline in WIB. The order time plus 24
    hours is the deadline. With no receipt by then, the store cancels the order.
  - Receipt uploaded: "We are checking your payment" and the amount. The bank accounts and the
    deadline do not show.
  - "Ask for more": the owner wrote a note in the admin. The panel shows the note, the bank
    accounts, and the text "Transfer the difference, then upload one more receipt." The note
    shows until the customer uploads a newer receipt.
- The receipt panel. It lists the uploaded receipts by name and time. The customer uploads 1 to 3
  receipts, one at a time. A receipt is a JPG, PNG, or WebP file of at most 5 MB. The storefront
  checks the type and the size before the upload, and the backend checks them again. At 3
  receipts, the upload closes and the panel shows the email, the WhatsApp number, and the phone
  of the store.

The customer cannot delete a receipt. The receipt files are private. Only the owner sees them, in
the order widget of the admin.

## Tests

The tests use Vitest with two projects:

| Project | Files                    | Environment         |
| ------- | ------------------------ | ------------------- |
| `unit`  | `test/unit/**/*.test.ts` | Node                |
| `nuxt`  | `test/nuxt/**/*.test.ts` | Nuxt with happy-dom |

The tests mock the Medusa SDK. They do not need the backend.

To run one file:

```bash
pnpm --filter @store/storefront exec vitest run test/unit/formatPrice.test.ts
```

## Docker image

`Dockerfile` builds the production image. The build context is the repository root. The image
listens on port 3000 and starts with `node .output/server/index.mjs`. See
[docs/deployment.md](../../docs/deployment.md).
