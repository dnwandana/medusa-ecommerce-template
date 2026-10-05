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
```

- `postinstall` runs `nuxt prepare`, which generates the types in `.nuxt`. `tsconfig.json` only references the `.nuxt/tsconfig.*.json` files.
- The backend CORS defaults and the Mayar return URL use port 3000.

## Configuration (`nuxt.config.ts`)

- The modules are `shadcn-nuxt` and `@nuxtjs/i18n`. Tailwind loads through `@tailwindcss/vite`.
  There is no Tailwind config file.
- `runtimeConfig`:
  - `medusaBackendUrl` (`NUXT_MEDUSA_BACKEND_URL`): server side.
  - `public.medusaBackendUrl` (`NUXT_PUBLIC_MEDUSA_BACKEND_URL`): browser side.
  - `public.medusaPublishableKey` (`NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`).
- i18n:
  - Locales `en` (default) and `id`, with the strategy `prefix_except_default`. The files are in
    `i18n/locales/`.
  - The locale cookie is `i18n_redirected`.
- `routeRules` set `ssr: false` for `/account/**` and `/id/account/**`.
- `components.json` (shadcn-vue) uses the style `reka-nova` and the base color `neutral`. It puts
  the components in `app/components/ui/`, with no prefix.

## Architecture

- `useMedusa()` (`app/composables/useMedusa.ts`) makes a new SDK client for each call.
  - On the server it uses the private backend URL. In the browser it uses the public URL.
  - The client uses `auth: { type: "session" }` and the header `x-medusa-locale` (from
    `app/utils/medusaClient.ts`).
- The composables in `app/composables/` contain the Medusa calls. Pages and components call the
  composables, not the SDK.
- Shared state uses `useState` with the keys `cart`, `region`, `customer`, `customer-loaded`, and
  `wishlist`.
- The cart id is in the cookie `cart_id` (`useCartId.ts`): 30 days, `sameSite: "lax"`. The `lax`
  value keeps the cookie on the top-level return from Mayar.
- `useRegion().ensureRegion()` uses the first region from the backend. There is no region or
  currency selector.
- Custom backend routes (reviews and wishlist) use `sdk.client.fetch` in `useReviews.ts` and
  `useWishlist.ts`.
- `app/middleware/auth.ts` is a named middleware. It does nothing on the server. On the client it
  sends a guest to `/account/login?redirect=<path>`.
- Data loading:
  - Public catalog data uses `useAsyncData` with keys that contain the locale, for example
    `products:${locale}:${page}`.
  - Data that needs the session or the cart cookie loads in `onMounted`. This covers the cart, the
    customer, the wishlist, and the account pages.
- `app/utils/` has pure functions with unit tests in `test/unit/`:
  - Price format: `formatPrice` gives `Rp 150.000`, and `-` for no value.
  - Checkout form validation, with Indonesian mobile numbers and 5-digit postal codes.
  - `completeCartWithRetry`: 5 tries, 2000 ms apart.
  - `safeRedirectPath`.
  - The variant selection rules.
- `/checkout/return` gets the locale from the `i18n_redirected` cookie, because the Mayar redirect
  URL has no locale prefix.
- The checkout country is fixed to `id`. Prices are always IDR.

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
  - Tailwind utility classes and the shadcn tokens (`text-muted-foreground`, `text-destructive`).
  - `cn()` from `app/lib/utils.ts` appears only in `app/components/ui/`.
- Quotes:
  - App code uses double quotes with no semicolons.
  - The generated shadcn files in `app/components/ui/` use single quotes.

## Tests

- `vitest.config.ts` has two projects:
  - `unit`: `test/unit/**/*.test.ts`, environment `node`.
  - `nuxt`: `test/nuxt/**/*.test.ts`, environment `nuxt` with happy-dom.
- The nuxt tests:
  - Mock the SDK with `mockNuxtImport("useMedusa", () => () => sdk)` and a `vi.hoisted` object of
    `vi.fn()`.
  - Mock `useCartId` the same way.
  - Call `clearNuxtState()` in `beforeEach`.
  - Mount components and pages with `mountSuspended`.
- Tests make a fake SDK error with `Object.assign(new Error(), { status })`.
- No test calls a real backend.

## Docker

- `Dockerfile` copies the storefront source before `pnpm install`, because `postinstall` runs
  `nuxt prepare`.
- The image runs `node .output/server/index.mjs` on port 3000.
- The `NUXT_*` keys are read at runtime, not at build time.
