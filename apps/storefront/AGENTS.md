# AGENTS.md

This file gives guidance to AI coding agents that work with code in `apps/storefront`.

The storefront is Nuxt 4 with Vue 3, Tailwind CSS 4, shadcn-vue (reka-ui), and `@nuxtjs/i18n`
(`@store/storefront`). See the root `AGENTS.md` for the workspace and the cross-app flow.

## Commands

Run the commands from the repository root.

```bash
pnpm --filter @store/storefront dev                        # nuxt dev --port 3000
pnpm --filter @store/storefront build
pnpm --filter @store/storefront test                       # both Vitest projects
pnpm --filter @store/storefront test:unit                  # project "unit"
pnpm --filter @store/storefront test:nuxt                  # project "nuxt"
pnpm --filter @store/storefront exec vitest run <path>     # one file
pnpm --filter @store/storefront lint                       # ESLint, eslint.config.mjs
```

- `postinstall` runs `nuxt prepare`, which generates the types in `.nuxt`. `tsconfig.json` only references the `.nuxt/tsconfig.*.json` files.
- `eslint.config.mjs` imports `.nuxt/eslint.config.mjs`, which the `@nuxt/eslint` module generates
  in `nuxt prepare`. If ESLint cannot find this file, run `pnpm install` again.
- The backend CORS defaults and the return URL of a payment gateway use port 3000.

## Configuration (`nuxt.config.ts`)

- The modules are `shadcn-nuxt`, `@nuxtjs/i18n`, and `@nuxt/eslint`. Tailwind loads through
  `@tailwindcss/vite`. There is no Tailwind config file.
- `runtimeConfig`:
  - `medusaBackendUrl` (`NUXT_MEDUSA_BACKEND_URL`): server side.
  - `public.medusaBackendUrl` (`NUXT_PUBLIC_MEDUSA_BACKEND_URL`): browser side.
  - `public.medusaPublishableKey` (`NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`).
  - `public.siteUrl` (`NUXT_PUBLIC_SITE_URL`): the public origin of the storefront, with no
    trailing slash. The default is `http://localhost:3000`. `docker-compose.yml` sets it to
    `https://${DOMAIN}`. All absolute URLs in the head, the JSON-LD, the sitemap, and `robots.txt`
    come from it. No code reads the `Host` header for a URL.
- i18n:
  - Locales `en` (default, `language: "en-US"`) and `id` (`language: "id-ID"`), with the strategy
    `prefix_except_default`. The files are in `i18n/locales/`.
  - The `language` tags give the `lang` attribute and the hreflang links.
  - The i18n `baseUrl` is not set. `usePageSeo` makes the relative links absolute with
    `public.siteUrl`.
  - The locale cookie is `i18n_redirected`.
- `routeRules` come from `storefrontRouteRules()` in `app/utils/routeRules.ts`. The file imports
  nothing from Nuxt, because `nuxt.config.ts` loads it.
  - Each path of `PRIVATE_PATHS` (`/cart`, `/checkout`, `/orders`, `/account`, `/search`) sends
    `X-Robots-Tag: noindex`. The rule also covers the subpaths and the `/id` copies.
  - The account paths also have `ssr: false`.
- `app/app.config.ts` has the store name (`brand.name`, "Everyday"). The name is not a locale text.
- `components.json` (shadcn-vue) uses the style `reka-nova` and the base color `neutral`. It puts
  the components in `app/components/ui/`, with no prefix.

## Architecture

- `useMedusa()` (`app/composables/useMedusa.ts`) makes a new SDK client for each call.
  - On the server it uses the private backend URL. In the browser it uses the public URL.
  - The client uses `auth: { type: "session" }` and the header `x-medusa-locale` (from
    `app/utils/medusaClient.ts`).
  - A client keeps the locale of the time it was made. Thus a composable that stays mounted after
    a language change makes a new client for each request.
- The composables in `app/composables/` contain the Medusa calls. Pages and components call the
  composables, not the SDK.
- Shared state uses `useState` with the keys `cart`, `region`, `customer`, `customer-loaded`,
  `wishlist`, `addresses`, and `storefront-settings`. `logout` sets `wishlist` and `addresses` to
  `null`.
- Shared `useAsyncData` keys:
  - `nav-categories` (`useNavCategories`): the top-level categories. The header, the mobile menu,
    `/products`, and `error.vue` share the request.
  - `home-categories` (`useHomeCategories`): the categories that staff select for the home page.
    The home page and the footer share the request.
  - `storefront-settings`: `ProductGrid`, `RelatedProducts`, and the product page load the
    settings with `useStorefront().ensureSettings()`. The product cards read them.
- The cart id is in the cookie `cart_id` (`useCartId.ts`): 30 days, `sameSite: "lax"`. The `lax`
  value keeps the cookie on the top-level return from a payment page.
- `useRegion().ensureRegion()` uses the first region from the backend. There is no region or
  currency selector.

### Layouts and errors

- `app/layouts/default.vue` has the announcement bar, the header, and the footer.
- `app/layouts/checkout.vue` has "Back to cart", the wordmark, "Secure checkout", and a short
  footer. The header has no navigation, so the customer stays in the checkout. `/checkout` and
  `/checkout/return` use it with `definePageMeta({ layout: "checkout" })`.
- The two layouts load the cart and the customer in `onMounted`.
- The two layouts call `useLayoutHead()` (`app/composables/useLayoutHead.ts`). It sets the `lang`
  attribute from the locale `language` tag and the title template `<page title> | <store>`. A page
  sets only its own title.
- The 404 rule: a page throws `createError({ statusCode: 404, data: { messageKey }, fatal: true })`.
  `app/error.vue` shows the text of the locale key `messageKey`. The product page, the category
  page, and the order page use this rule.
- `error.vue` renders in the default layout. It never shows the status code or the Nuxt
  `statusMessage`. A 404 also shows the category links. Another status makes no catalog request,
  because the backend can be down.

### Custom backend routes

The composables call the custom routes with `sdk.client.fetch`:

| Route                                                                     | Composable                     |
| ------------------------------------------------------------------------- | ------------------------------ |
| `/store/reviews`, `/store/products/:id/reviews`, `.../reviewable-items`   | `useReviews.ts`                |
| `/store/customers/me/wishlist[/items[/:id]]`                              | `useWishlist.ts`               |
| `/store/bank-transfer`                                                    | `useBankTransfer.ts`           |
| `/store/storefront/settings`, `/store/storefront/home-campaign`           | `useStorefront.ts`             |
| `/store/storefront/home-categories`                                       | `useHomeCategories.ts`         |
| `/store/storefront/catalog/filters`, `/store/storefront/catalog/products` | `useCatalogListing.ts`         |
| `/store/magic-link`, and `/status`, `/verify`, `/confirm`, `/session`     | `useMagicLink.ts`              |
| `/auth/session`, `/store/customers/me/welcome`                            | `useCustomer.ts`               |
| `/store/orders/:id/tracking`                                              | `useOrders.ts` (`getTracking`) |
| `/store/orders/:id/receipts`, `/store/payment-states`                     | `useReceipts.ts`               |

### Catalog

- `useCatalog()` reads the products and the categories.
  - `PRODUCT_FIELDS` has the fields of a product card. `PRODUCT_PAGE_FIELDS` adds
    `*variants.images` and `*categories`.
  - The Store product route drops a field that is not on its allowed list, with no error. Thus
    the product page asks for `variants.images`, not `images.variants`, and not
    `categories.parent_category`.
  - `getProductByHandle` makes one more category request, which returns the parent categories
    for the breadcrumbs. If that request fails, the page shows with no parent.
  - `getCategoryByHandle` makes two requests. One request returns the parent and the children.
    The other request returns the descendants tree, because the Store API drops the parent from
    a descendants tree.
  - `listVariantStock(productIds)` reads the stock for the cart page. The cart route does not
    return `inventory_quantity`.
- `useCatalogListing()` reads the filter values and one page of a listing.
  - The scope is `{ categoryId, descendantIds, q }`. The category page lists the products of the
    category and of all its descendant categories.
  - A price filter or a price sort uses `/store/storefront/catalog/products`, because the Store
    product list cannot filter or sort by the calculated price. Each other list uses
    `sdk.store.product.list`.
- `CatalogListing.vue` keeps the filters, the sort, and the page in the URL query, for example
  `?colour=sage&size=m&sort=price-asc&page=2`. `PAGE_SIZE` is 12. A reload loads at most 10
  pages.
- The product page reads `?variant=<Medusa variant id>` with `variantFromQuery`
  (`app/utils/variantSelection.ts`).
  - A valid id sets the start variant on the server. The page gives it to `ProductPurchase` as
    `startVariantId`.
  - The page ignores an unknown id, an array, and the parameter on a product with one variant.
  - `ProductPurchase` emits `variant-change` when the selection matches one variant. The page then
    calls `router.replace` with the new `?variant=`. It adds no history entry and keeps the other
    query parameters.
  - The canonical URL has no `?variant=`. The description and the share image use the variant.
- The product page waits for `useFirstReviewPage(productId)` (`useReviews.ts`). `ReviewList` calls
  the same composable with `{ lazy: true }`. The two callers share the key `reviews:<product id>`,
  the handler, and the options. Thus the stars and the `aggregateRating` are in the server HTML,
  and `ReviewList` sends no second request. A failed request gives no rating.
  - Do not add a second `useAsyncData` call for this key. Different options give a Nuxt warning
    and a second request.
- `useSearchSuggestions(query)` starts at 2 characters, 300 ms after the last key, and returns up
  to 5 products.
- `useRelatedProducts(key, source)` reads 12 products of the first category and returns up to 4,
  with no sold-out product. The product page and the cart page use it.
- `useStorefront()` returns the settings (badge rules, colours, price limits) and the live home
  campaign. A failed settings request gives `STOREFRONT_DEFAULTS`.
- `useMoveToWishlist()` moves a cart line to the wishlist. A guest goes to the sign-in page, and
  the cart does not change.

### SEO

- Every indexable page calls `usePageSeo(input)` (`app/composables/usePageSeo.ts`): the home
  page, `/products`, the category page, the product page, `StaticPage.vue`, and the contact page.
  - It writes the title, the description, the canonical URL, the hreflang links (`en-US`,
    `id-ID`, `x-default`), the Open Graph and Twitter tags, and the JSON-LD scripts.
  - The canonical URL keeps only the query parameter `page`.
  - With no `image`, the share image is `/og-default.jpg` (1200×630). The alt text is the store
    name.
  - While the input is `null`, it writes nothing, for example while the page data loads.
- `useSiteUrl()` (same file) returns `public.siteUrl` with no trailing slash.
- Private pages must not call `usePageSeo`. They have no canonical, hreflang, or Open Graph tags.
  - `storefrontRouteRules` sends `X-Robots-Tag: noindex` for them.
  - The cart page, the order page, and the checkout layout also set the `robots: "noindex"` meta
    tag. The search, sign-in, verify, and welcome pages keep their `noindex` meta tag.
- The pure helpers are in `app/utils/`:
  - `seoText.ts`: the titles, the description cut at 160 characters, the variant label, the
    product description, and `absoluteUrl`.
  - `productStructuredData.ts`: `productJsonLd` gives a `ProductGroup` for a product with more
    than one variant, else a `Product`. It gives `null` when no variant has a price.
  - `structuredData.ts`: the `BreadcrumbList`, `OnlineStore`, and `WebSite` nodes, and
    `jsonLdScript`. `jsonLdScript` replaces each `<` with the six characters `\u003c`. Thus
    a product text cannot close the script tag.
- The Nitro routes are in `server/routes/`. Their helpers are in `server/utils/`. The server code
  has no `~` alias, so it imports `app/utils/` with a relative path.
  - `robots.txt.ts` blocks the filter and sort parameters: `FILTER_NAMES` of
    `app/utils/catalogQuery.ts`, then `price` and `sort`. It names the sitemap. It does not block
    the private pages, because a crawler must fetch a page to see its noindex. There is no
    `public/robots.txt`.
  - `sitemap.xml.ts` reads all products and categories from the Store API with
    `medusaBackendUrl` and the publishable key. Each page gives one URL for each locale, with the
    hreflang alternates. The product URLs have the product images.
  - `defineCachedEventHandler` keeps the sitemap for 1 hour. A backend failure gives the
    status 503. Nitro does not keep a failure in the cache.
- `public/og-default.jpg` and `public/logo.png` are placeholders. Each client replaces them.
- The head tests read the head with `readHead()` from `test/nuxt/helpers/head.ts`.

### Sign-in with a magic link

- The customer has no password. The sign-in page sends the email to `/store/magic-link`, and the
  backend sends a link. `useMagicLink()` has the state and the requests of the flow.
- The browser keeps `{ request_id, secret, email, redirect, sent_at }` in `localStorage` under the
  key `everyday.magicLink` (`app/utils/magicLinkStorage.ts`). The record has no token. Only the
  email link has the token.
- The original tab asks `/store/magic-link/status` every 3 seconds (`MAGIC_LINK_POLL_MS`). A link
  expires after 15 minutes. "Send the link again" is available after 60 seconds. A new link makes
  the older link of the email invalid.
- The link opens `/account/sign-in/verify?id=<request id>&token=<token>`.
  - Same browser: the verify page gets the session. It sends a message on the `BroadcastChannel`
    `everyday-sign-in` (`app/utils/signInChannel.ts`). If the original tab answers, the verify
    tab closes. If not, the verify tab continues as the signed-in tab.
  - Other device: the verify page shows the browser and the time of the request. The customer
    clicks "Yes, sign me in". The original tab then gets the session at its next status request.
    The device with the link gets no session.
- A blocked `localStorage` (a private window) still shows "Check your email". The link then takes
  the other-device path.
- `/store/magic-link/session` returns a token. `signInWithToken` (`useCustomer`) sends it one time
  to `/auth/session` as `Authorization: Bearer <token>`. The backend answers with the httpOnly
  session cookie. The storefront does not keep the token. Then the guest cart goes to the
  customer.
- `needsWelcome` is true when the customer has no `metadata.welcome_sent_at`. After the first
  sign-in, the storefront opens `/account/welcome`. That page sends the optional full name to
  `/store/customers/me/welcome`, and the backend sends the welcome email.
- `app/middleware/auth.ts` is a named middleware. It does nothing on the server. On the client it
  sends a guest to `SIGN_IN_PATH` (`/account/sign-in`, in `app/utils/authPaths.ts`) with the
  `redirect` parameter. All code that opens the sign-in page uses `SIGN_IN_PATH` or
  `signInTarget(redirect)`.

### Data loading

- Public catalog data uses `useAsyncData` with keys that contain the locale, for example
  `category:${locale}:${handle}`.
- Data that needs the session or the cart cookie loads in `onMounted`. This covers the cart, the
  customer, the wishlist, the addresses, and the account pages.
- A section that must not block the page uses `useLazyAsyncData` or `useAsyncData` with no
  `await`, for example "You may also like" and the category menus.

### Orders and payment

- `/checkout/return` gets the locale from the `i18n_redirected` cookie, because the redirect URL
  of a payment gateway has no locale prefix.
- The checkout country is fixed to `id`. Prices are always IDR.
- The storefront code has no payment provider id. Only `app/utils/bankTransfer.ts` and the locale
  files name `pp_bank-transfer_bank-transfer`.
- `useOrders()` adds `order.payment_state` to each order (type `PaymentOrder`). The value is the
  entry of `/store/payment-states` for the order, or `null`. `listOrders` makes one payment state
  request for the page. `useReceipts().getPaymentStates` sends at most 50 order ids in one request.
- `ORDER_FIELDS` has no payment sessions and no payments. The Store API gives the session data,
  with the payment URL and the customer object of a gateway, to each person who knows the order
  id. `payment_state` gives only the provider id, the capture time, the receipt names, and the
  newest store note. It has no file key and no file URL.
- `app/utils/orderStatus.ts`:
  - `customerStatus(order)` returns the status that the customer sees: `waiting_for_payment`,
    `payment_submitted`, `processing`, `shipped`, `delivered`, `cancelled`, or `refunded`. A
    gateway order starts at `processing`. Each status has the locale key `order.status.<status>`.
  - `receiptPhase(state)` returns `none` (no receipt), `submitted`, or `more` (the store note is
    newer than the newest receipt).
  - `orderTracker.ts` and the pages use the `CustomerStatus` type of this file.
- `isAwaitingBankTransfer(order)` reads `order.payment_state`. It is true for a bank transfer order
  that is not canceled and has no captured payment.
- `pages/orders/[id].vue` shows these parts, in this order:
  1. The eyebrow (order number and date), the `h1`, and the body text. The text comes from
     `customerStatus(order)`.
  2. For a bank transfer order that waits for the capture, `BankTransferInstructions` and
     `ReceiptPanel`. The bank panel takes `receiptPhase` and the store note.
  3. `OrderStatusBlock` for a cancelled or refunded order, else `OrderTracker`.
  4. `OrderShipments`, from `/store/orders/:id/tracking`.
  5. `OrderSummary`. The payment method comes from `payment_state.provider_id`.
  6. An aside with "Continue shopping" and the contact link.
  7. `RelatedProducts`, only for `processing`, `shipped`, and `delivered`.
- `/account/orders` shows a status `Badge` for each order, from `customerStatus(order)`.
- `refundedAmount(order)` (`app/utils/orderNotices.ts`) reads `order.summary.refunded_total`,
  because the Store order route does not return the refunds of a payment collection.
- Receipts:
  - `ReceiptPanel` lists the uploaded receipts by name and time. The receipt files are private.
    Below 3 receipts it shows `ReceiptUploadForm`. At 3 receipts it shows the store contact.
  - `ReceiptUploadForm` has a drop zone and a file input. `checkReceiptFile`
    (`app/utils/receiptFile.ts`) refuses a file that is not JPG, PNG, or WebP, or that is larger
    than 5 MB. The backend checks the file bytes again.
  - `useReceipts().uploadReceipt` sends JSON `{ file_name, content }` with the file as base64,
    because the SDK sends JSON. After an upload, the order page loads the order again.
  - `MAX_RECEIPTS` and `MAX_RECEIPT_BYTES` have the same values as the backend limits in
    `apps/backend/src/modules/payment-receipt`. Change the two copies together.

### Pure functions

`app/utils/` has pure functions with unit tests in `test/unit/`. Some examples:

- Price format: `formatPrice` gives `Rp 150.000`, and `-` for no value. `formatDeliveryPrice`
  gives the free label for 0.
- Address form: `splitFullName` and `joinFullName`, the 38 provinces (`provinces.ts`), Indonesian
  mobile numbers, and 5-digit postal codes.
- `completeCartWithRetry`: 5 tries, 2000 ms apart.
- `safeRedirectPath`.
- The variant selection rules, the product badges, the colour dots, the gallery images, and the
  product details.
- The catalog URL query (`catalogQuery.ts`) and the price ranges (`priceRanges.ts`).
- Bank transfer: `isAwaitingBankTransfer`, `bankTransferDeadline` (the order time plus 24 hours),
  and `formatDeadline` (WIB).
- Order status: `customerStatus`, `receiptPhase`, `trackerSteps`, `cancelNoticeKey`, and
  `refundedAmount`.
- Receipt files: `checkReceiptFile` and `formatFileSize`.
- SEO: the texts in `seoText.ts` and the JSON-LD in `productStructuredData.ts` and
  `structuredData.ts`.

## Code conventions

- SFCs use `<script setup lang="ts">`.
- Props use `defineProps<{...}>()`. Emits use typed tuples, for example
  `defineEmits<{ update: [quantity: number] }>()`.
- Composables:
  - Each file exports `function useXxx(): { ... }` with an explicit return type.
  - Constants use UPPER_SNAKE_CASE, for example `PRODUCT_FIELDS`, `ORDER_FIELDS`, and `PAGE_SIZE`.
  - A composable calls all the composables it needs before the first `await`, because the Nuxt
    context is not available after an `await`.
- Links use `<NuxtLinkLocale>`. Code navigation uses `navigateTo(localePath(...))`.
- Redirect parameters go through `safeRedirectPath`.
- UI text:
  - All UI text comes from `i18n/locales/{en,id}.json` through `$t` or `t`. Keys are camelCase and
    nested by feature.
  - Validation functions return i18n keys, for example `checkout.errors.phone`.
  - `test/unit/locale-messages.test.ts` requires the same keys and placeholders in both files.
- Money values go through `formatPrice`. Amounts from Medusa are in whole rupiah.
- Error and status messages use `role="alert"` or `role="status"`.
- `errorStatus(error)` reads the HTTP status from an SDK error.
- Tests find elements by `data-testid`.
- Styling:
  - The design tokens and the fonts come from `app/assets/css/tailwind.css`. The fonts are the
    `.woff2` files in `public/fonts/`, with `@font-face`. Do not add a font package.
  - Use Tailwind utility classes, the color tokens (`text-muted-foreground`, `bg-backdrop-sand`),
    and the type utilities (`text-display`, `text-h1`, `text-body`, `text-price`).
  - `cn()` from `app/lib/utils.ts` appears only in `app/components/ui/`.
  - When you add a `text-*` type utility to `tailwind.css`, add its name to the tailwind-merge
    list in `app/lib/utils.ts`. Otherwise `cn()` reads it as a color and removes it.
- Icons come from `@lucide/vue` with a stroke width of 1.5.
- Quotes:
  - App code uses double quotes with no semicolons.
  - The generated shadcn files in `app/components/ui/` use single quotes.

## Tests

- `vitest.config.ts` has two projects:
  - `unit`: `test/unit/**/*.test.ts`, environment `node`. The `~` alias points to `app/`.
  - `nuxt`: `test/nuxt/**/*.test.ts`, environment `nuxt` with happy-dom.
- The nuxt tests:
  - Mock the SDK with `mockNuxtImport("useMedusa", () => () => sdk)` and a `vi.hoisted` object of
    `vi.fn()`.
  - Mock `useCartId` the same way.
  - Call `clearNuxtState()` in `beforeEach`.
  - Mount components and pages with `mountSuspended`.
- A test that mounts `ProductCard` or `ProductGrid`, also through a page, must mock
  `useStorefront` and `useCustomer`.
- Tests make a fake SDK error with `Object.assign(new Error(), { status })`.
- No test calls a real backend.

## Docker

- `Dockerfile` copies the storefront source before `pnpm install`, because `postinstall` runs
  `nuxt prepare`.
- The image runs `node .output/server/index.mjs` on port 3000.
- The `NUXT_*` keys are read at runtime, not at build time.
