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

| Key                                  | Purpose                                     | Development value       |
| ------------------------------------ | ------------------------------------------- | ----------------------- |
| `NUXT_PUBLIC_MEDUSA_BACKEND_URL`     | The backend URL that the browser calls.     | `http://localhost:9000` |
| `NUXT_MEDUSA_BACKEND_URL`            | The backend URL that the Nuxt server calls. | `http://localhost:9000` |
| `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | The publishable API key.                    | The output of the seed  |

The two URL keys are different only when the Nuxt server reaches the backend on a private network.
Nuxt reads the keys when the server starts. A new value does not need a new build.

## Pages

| Route                      | Content                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `/`                        | The eight newest products                                                |
| `/products`                | All products, 12 on each page, and the categories                        |
| `/products/:handle`        | Product detail, variant selection, add to cart, wishlist, reviews        |
| `/categories/:handle`      | The products of one category                                             |
| `/cart`                    | Cart items and the subtotal                                              |
| `/checkout`                | Contact, address, shipping option, and payment                           |
| `/checkout/return`         | The return page after the Mayar payment                                  |
| `/orders/:id`              | Order confirmation                                                       |
| `/account`                 | Profile. Needs a login.                                                  |
| `/account/login`           | Log in                                                                   |
| `/account/register`        | Register                                                                 |
| `/account/forgot-password` | Ask for a password-reset link                                            |
| `/account/reset-password`  | Set a new password from the link in the email                            |
| `/account/orders`          | Order history and the items that the customer can review. Needs a login. |
| `/account/wishlist`        | Wishlist. Needs a login.                                                 |

Each route also exists with the prefix `/id`.

## Source layout

| Path                          | Content                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `app/pages/`                  | Pages                                                                                   |
| `app/layouts/default.vue`     | The header with the navigation, the cart count, and the language switcher               |
| `app/components/`             | Store components                                                                        |
| `app/components/ui/`          | shadcn-vue components                                                                   |
| `app/composables/`            | Medusa SDK client, cart, region, catalog, checkout, customer, orders, reviews, wishlist |
| `app/utils/`                  | Pure functions: price format, form validation, retry, redirect check                    |
| `app/middleware/auth.ts`      | Sends a guest to the login page                                                         |
| `app/assets/css/tailwind.css` | Tailwind and the theme colors                                                           |
| `i18n/locales/`               | Interface text in `en.json` and `id.json`                                               |
| `test/unit/`                  | Unit tests of `app/utils` and of the locale files                                       |
| `test/nuxt/`                  | Tests of components, pages, composables, and middleware                                 |

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
- A customer who logs in gets the guest cart.

## Accounts

The storefront uses a session cookie for the login. The browser keeps the cookie, so the pages
below `/account` render in the browser only. Thus the storefront and the backend must be on the
same site in production (for example `store.example.com` and `api.example.com`).

The password-reset email links to `/account/reset-password`. The backend makes the link from its
`STOREFRONT_URL` key.

## Checkout

1. The customer enters the contact data and an Indonesian address.
2. The storefront saves the data on the cart and shows the shipping options.
3. The customer selects a shipping option.
4. **Pay** creates a Mayar payment session and opens the Mayar payment page.
5. Mayar sends the customer back to `/checkout/return`.
6. The return page completes the cart. It tries five times, at intervals of 2 seconds, because
   the payment webhook can arrive late.
7. On success, the storefront shows `/orders/:id`. If the payment is not complete yet, the cart
   stays.

The phone number must be an Indonesian mobile number, for example `081234567890`. The postal code
must have 5 digits.

Checkout needs the Mayar sandbox key in the backend. See "Mayar payments" in the
[backend README](../backend/README.md#mayar-payments). The return page works with no tunnel. The
webhook needs the tunnel.

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
