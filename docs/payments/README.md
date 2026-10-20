# Payment gateways

This document gives the contract that each payment gateway provider obeys in this template. It also
gives the procedure to add one gateway to a client project. The template itself has no gateway. Its
only payment provider is bank transfer.

Each gateway has its own document with the facts of the gateway API. See
[Gateway docs](#gateway-docs). This document does not describe a gateway.

The terms in this document:

- `<slug>`: the name of the provider in lowercase, for example `midtrans`. The provider uses it as
  its `static identifier` and as its `id` in `paymentModule()`.
- `<provider_id>`: the id that Medusa stores, `pp_<slug>_<slug>`, for example
  `pp_midtrans_midtrans`.
- `<Name>` and `<name>`: the slug in PascalCase and in camelCase, for example `Midtrans` and
  `midtrans`, or `StripeCheckout` and `stripeCheckout` for the slug `stripe-checkout`.
- `<GATEWAY>`: the prefix of the env vars and of the constants, in upper case. The gateway doc gives
  it, for example `MIDTRANS` or `STRIPE`.
- Hosted payment: the payment page of the gateway. The customer pays there, not on the storefront.

Where a gateway doc gives a rule that is different from this document, the gateway doc applies. The
gateway doc gives the reason for each difference. A gateway doc cannot change these rules:

- The return URL is `${STOREFRONT_URL}/checkout/return`, with no locale prefix.
- `authorizePayment` asks the gateway API. It returns only `captured`, and else it throws
  `PAYMENT_AUTHORIZATION_ERROR`.
- The session data and the payment data have no secret.
- The storefront gets no change other than the two locale keys of [Checkout label](#checkout-label).
- No code divides a Medusa amount by 100.

The line numbers in this document are the line numbers on the day of the check. Search for the
function name if a line moved.

## What a gateway adds

A gateway adds a redirect flow. Bank transfer has no redirect: the cart becomes an order at once.

1. On `/checkout`, the customer selects the gateway. `startPayment` in
   `apps/storefront/app/composables/useCheckout.ts` (lines 84-120) calls `initiatePaymentSession`
   with the provider id and `data: { customer }`.
2. Medusa calls `initiatePayment` of the provider. The provider creates a hosted payment and returns
   `payment_url` in the session data.
3. `startPayment` reads `session.data.payment_url` (lines 102-110). It refuses a value that does not
   start with `https://`. `apps/storefront/app/pages/checkout/index.vue` (line 299) then sends the
   browser to the URL.
4. The customer pays on the hosted page. The gateway sends the browser to
   `${STOREFRONT_URL}/checkout/return`. This URL has no locale prefix.
5. `apps/storefront/app/pages/checkout/return.vue` completes the cart with retries. Medusa calls
   `authorizePayment` of the provider for each attempt. See [authorizePayment](#authorizepayment).
6. When the cart becomes an order, the return page opens `/orders/:id`. When the retries end first,
   the page shows the "pending" state and keeps the cart. The webhook or the recovery job then
   completes the cart.

The return page in detail (`apps/storefront/app/utils/completeCart.ts`):

- `RETURN_RETRIES = 5` and `RETURN_DELAY_MS = 2000`. The page calls `cart.complete` one time, then
  five more times with 2 seconds between the calls.
- A response with `type: "cart"` makes the page try again. Medusa gives this response with HTTP 200
  when `authorizePayment` throws `PAYMENT_AUTHORIZATION_ERROR`.
- HTTP 409 or an error with no HTTP status (a network failure) makes the page try again.
- Each other HTTP error stops the retries. The page shows the "failed" state.
- The page reads the cart id from the cart cookie, and the locale from the cookie
  `i18n_redirected`. It ignores the query parameters that the gateway adds to the URL.

The customer can come back from the hosted page before the gateway confirms the payment. The retries
give the gateway about 10 seconds. After that, two paths complete the cart:

- The webhook. See [Webhook](#webhook).
- The `check-paid-carts` job, every 15 minutes. See [Recovery adapter](#recovery-adapter).

## The provider contract

### Module and registration

- Put the provider in `apps/backend/src/modules/<slug>/`:
  - `index.ts`: `export default ModuleProvider(Modules.PAYMENT, { services: [<Name>ProviderService] })`.
  - `service.ts`: the class `<Name>ProviderService`. It extends `AbstractPaymentProvider` and has
    `static identifier = "<slug>"`. Export it as the default export.
  - `constants.ts`: `export const <GATEWAY>_PROVIDER_ID = "pp_<slug>_<slug>"`.
  - `client.ts`: the class that makes the HTTP calls to the gateway API. Its constructor takes the
    base URL and the keys as one object. The service and the recovery adapter both create it.
- Import `AbstractPaymentProvider`, `MathBN`, `MedusaError`, `ModuleProvider`, `Modules` and
  `PaymentActions` from `@medusajs/framework/utils`. Import the input and output types, for example
  `AuthorizePaymentInput`, from `@medusajs/framework/types`. `bank-transfer/service.ts` shows the
  list of types.
- The reference provider is `apps/backend/src/modules/bank-transfer/` (`service.ts` lines 29-83).
  It has the ten methods that `AbstractPaymentProvider` requires.
- Register the provider in `paymentModule()` in `apps/backend/src/config/modules.ts` (lines
  134-143). Today the function has no parameter. Change it to `paymentModule(env: Env)`, and change
  the call in `buildModules` (line 255) to `paymentModule(env)`. `Env` is
  `Record<string, string | undefined>` (line 2 of the same file). It has no schema, so a new key
  needs no type change.
- `paymentModule(env)` is the only place that reads the env keys of the service.
- Keep bank transfer first in the `providers` list. Add the gateway after it:

```ts
providers: [
  { resolve: "./src/modules/bank-transfer", id: "bank-transfer" },
  {
    resolve: "./src/modules/<slug>",
    id: "<slug>",
    options: { storefrontUrl: env.STOREFRONT_URL, ...<name>ClientOptions(env) },
  },
],
```

- `<name>ClientOptions(env)` is an exported function in `client.ts`. It returns the options of the
  client from an env object, with the keys that the gateway doc names. The recovery adapter calls
  the same function. An example:

```ts
export function <name>ClientOptions(env: Record<string, string | undefined>) {
  return {
    apiUrl: env.<GATEWAY>_API_URL || "<sandbox base URL from the gateway doc>",
    serverKey: env.<GATEWAY>_SERVER_KEY || "",
  }
}
```

- A gateway doc can add a service option next to `storefrontUrl`, for example a webhook token that
  only the service uses. Read it from `env` in `paymentModule(env)`. Put a key in
  `<name>ClientOptions(env)` only when the client or the recovery adapter needs it.
- Medusa gives the `options` object to the constructor of the service as the second argument. The
  service reads its keys only from `options`, not from `process.env`.
- Read the base URL of the gateway API from one env key. Use the sandbox URL as the default. The
  gateway doc gives the key and the URLs in its sections 4 and 5.
- A gateway with more than one API host has one base URL key for each host. The gateway doc names
  the keys.
- For most gateways, the base URL selects the sandbox or the production. For some gateways, the API
  key selects the environment, and the base URL is the same. Then the base URL key exists only so
  that the tests can use a test host. The gateway doc says which rule applies.
- Add a static `validateOptions(options)`. Make it throw a `MedusaError` of the type `INVALID_DATA`
  when `storefrontUrl` or a base URL is empty. Do not check the secrets there. A secret can be
  empty, so that the backend starts in development before you have a key. Each call to the gateway
  then fails.
- Add `<provider_id>` to `PAYMENT_PROVIDERS` in `apps/backend/src/seed/region.ts` (line 21). The
  storefront lists only the providers of the region (`listPaymentProviders`, `useCheckout.ts` lines
  73-82). Medusa refuses a payment session for a provider that is not in the region.
- Call the gateway API with the global `fetch`. If you use an SDK of the gateway, configure it to use
  `fetch`. The tests replace `global.fetch`, so a call that does not use `fetch` reaches the real
  API.
- Give each call to the gateway a timeout, for example with `AbortSignal.timeout(10_000)`.

### Inputs from Medusa

Medusa 2.21.2 calls the provider with these inputs (`@medusajs/payment`,
`dist/services/payment-module.js`):

| Method             | Input                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------- |
| `initiatePayment`  | `amount`, `currency_code`, `data: { customer, session_id }`, `context`                  |
| `authorizePayment` | `data` (the stored session data), `context: { idempotency_key }`. It has no `amount`.   |
| `capturePayment`   | `data` (the payment data), `context: { idempotency_key }`                               |
| `refundPayment`    | `data` (the payment data), `amount` (the refund amount), `context: { idempotency_key }` |
| `cancelPayment`    | `data` (the session data or the payment data), `context`                                |
| `deletePayment`    | `data` (the stored session data)                                                        |
| `updatePayment`    | `data`, `amount`, `currency_code`, `context`                                            |
| `getPaymentStatus` | `data`, `context`                                                                       |
| `retrievePayment`  | `data`, `context`                                                                       |

Each method returns an object. The output types in `@medusajs/framework/types` give the exact
shape:

- `initiatePayment`: `{ id, data }`.
- `authorizePayment` and `getPaymentStatus`: `{ status, data }`.
- All other methods: `{ data }`.

- `data.customer` is the `PaymentCustomer` object of the storefront:
  `{ first_name, last_name, email, phone }`. `phone` is an Indonesian mobile number in E.164, for
  example `+6281234567890` (`apps/storefront/app/utils/checkoutForm.ts` lines 44-79). `last_name`
  can be an empty string.
- `data.session_id` is the id of the Medusa payment session. Medusa adds it to the input of
  `initiatePayment` only. It is not in the data from the storefront.
- `context.idempotency_key` is the session id in `initiatePayment` and in `authorizePayment`.
- Medusa stores `{ ...data from the storefront, ...data that initiatePayment returns }` as the
  session data. Thus the stored data keeps `customer`. It has `session_id` only when
  `initiatePayment` returns it.
- The data that `authorizePayment` returns becomes the payment data. `capturePayment`,
  `refundPayment` and `cancelPayment` get the payment data.

### initiatePayment

- Throw a `MedusaError` of the type `INVALID_DATA` when `currency_code` is not `idr`.
- Throw a `MedusaError` of the type `INVALID_DATA` when the gateway needs a customer field that
  `data.customer` does not have.
- A gateway doc can add more `INVALID_DATA` checks before the call. Examples: an amount that is not
  a whole number, or a value that is too long for the gateway. The gateway doc gives each check.
- Create one hosted payment with the gateway API:
  - The amount is the cart total. See [Amount and currency](#amount-and-currency).
  - The return URL is `${STOREFRONT_URL}/checkout/return`. Remove a trailing slash from
    `storefrontUrl` before you add the path.
  - Send `data.session_id` to the gateway as the reference of the payment, for example as the order
    id or in the metadata. `getWebhookActionAndData` reads this value to find the session.
  - Some gateways limit the length or the characters of the reference. Then the gateway doc gives
    a transformed reference, for example a part of the session id. `getWebhookActionAndData` makes
    the full session id again from it.
  - Use the expiry that the gateway doc recommends.
- Return `{ id: <gateway payment id>, data }`. Do not return a `status`. Medusa then sets the status
  `pending`.
- `data` must have these keys:
  - `payment_url`: the URL of the hosted page. It must start with `https://`.
  - The id of the gateway payment, with the key that the gateway doc gives.
  - `amount`: the amount in whole rupiah, as a number. `authorizePayment` compares with it.
  - `session_id`: the value of `input.data.session_id`.
- If the gateway API fails, throw a `MedusaError` of the type `UNEXPECTED_STATE`. Put the HTTP
  status and the error text of the gateway in the message. Do not put a key in the message. The
  checkout page then shows the message `checkout.errors.payment` and keeps the cart.

### authorizePayment

Medusa calls this method when the cart completes: from the return page, from the webhook, and from
the recovery job.

- Ask the gateway API for the status of the payment. Do not trust the session data or the browser.
- Compare the paid amount with `data.amount`, in the unit of the gateway.
- If the gateway reports the payment as paid, and the amounts are equal, return
  `{ status: "captured", data: input.data }`. Do not add keys. The hosted payment takes the money
  at once, so Medusa records the payment as captured. The owner does not capture it in Medusa Admin.
- In all other cases, throw
  `new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR, "<message>")`. Examples: the
  customer did not pay yet, the customer paid a different amount, the payment expired, or the API
  call failed.
- If the amounts are different, also write an error to the log with the gateway payment id, the
  paid amount and `data.amount`.

Do not return a status other than `captured`. The code of Medusa 2.21.2 gives these results:

| The method                           | The result                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Throws `PAYMENT_AUTHORIZATION_ERROR` | HTTP 200 with `type: "cart"`. The return page tries again.                 |
| Returns `pending`                    | Medusa throws `NOT_ALLOWED`. HTTP 400. The return page shows "failed".     |
| Returns `pending_authorization`      | Medusa makes an order with no payment. The customer did not pay.           |
| Returns `requires_more`              | HTTP 200 with a `PAYMENT_REQUIRES_MORE_ERROR`. The flow has no extra step. |

The sources: `authorizePaymentSession` in `@medusajs/payment`, `authorizePaymentSessionStep` in
`@medusajs/core-flows`, and `dist/api/store/carts/[id]/complete/route.js` in `@medusajs/medusa`.

### getPaymentStatus

- Ask the gateway API for the status. Return `captured` only when the payment is paid with the
  amount of `data.amount`. Return `canceled` for an expired or a canceled payment. Return `pending`
  for all other cases.
- Medusa 2.21.2 does not call this method in the flow of the template. Implement it, because
  `AbstractPaymentProvider` requires it.

### retrievePayment

- Ask the gateway API for the payment. Return `{ data: { ...input.data, gateway_status } }`, with
  the status text of the gateway in `gateway_status`. Medusa 2.21.2 does not call this method in
  the flow of the template.

### capturePayment

- Return `{ data: input.data }` with no external call. `authorizePayment` returns `captured`, so the
  money is already taken. Medusa does not ask the provider to capture a captured payment.

### refundPayment

- The owner starts a refund in Medusa Admin on the order page. Medusa then calls this method.
- Convert the amount with `MathBN.convert(input.amount).toNumber()`. The result is whole rupiah.
  Then convert it to the unit of the gateway. See [Amount and currency](#amount-and-currency).
- Call the refund API of the gateway with the gateway payment id from `data`. Send
  `context.idempotency_key` if the gateway accepts an idempotency key.
- A partial refund is possible in Medusa. The gateway doc says if the gateway accepts it.
- If the gateway refuses the refund, throw a `MedusaError` of the type `UNEXPECTED_STATE`. Put the
  cause from the gateway in the message. Medusa Admin shows the message.
- If the gateway has no refund API, write a warning to the log and return `{ data: input.data }`.
  The owner then returns the money in the dashboard of the gateway.
- Return `{ data: { ...input.data, refund_ids: [...old ids, new id] } }`. `refund_ids` is a list,
  because one payment can have more than one partial refund.

### updatePayment

- Close or expire the old hosted payment if the gateway supports it. Then create a new hosted
  payment for `input.amount`, as `initiatePayment` does.
- Return `{ data: { ...input.data, ...<data of the new hosted payment> } }`. Medusa replaces the
  stored session data with the returned `data`. Thus the merged object keeps `customer` and
  `session_id`.
- Medusa 2.21.2 does not call this method in the store flow. When the cart total changes, Medusa
  deletes the payment sessions. A new call to `initiatePaymentSession` also deletes the old session
  first. In both cases Medusa calls `deletePayment`.

### cancelPayment

- Close or expire the hosted payment if the gateway supports it.
- Do not throw when the gateway refuses, because an open hosted payment expires. Write a warning to
  the log. Return `{ data: input.data }`.
- Medusa calls this method when it cancels a payment. An example: Medusa saves the authorized
  payment, and the save fails.

### deletePayment

- Do the same as `cancelPayment`. Medusa calls this method when it deletes a session, for example
  after the cart total changes.

### getWebhookActionAndData

See [Webhook](#webhook).

## Webhook

### The route

- The webhook URL is `POST /hooks/payment/<provider_id>`. In production it is
  `https://api.<domain>/hooks/payment/<provider_id>`, for example
  `https://api.example.com/hooks/payment/pp_midtrans_midtrans`. Medusa also accepts the id without
  the prefix `pp_`.
- The route is built into Medusa: `dist/api/hooks/payment/[provider]/route.js` in
  `@medusajs/medusa`. The template adds no route.
- The route needs no publishable key and no authentication.
- The middleware `dist/api/hooks/middlewares.js` keeps the raw body (`preserveRawBody: true`).
- The route does not call the provider. It emits the event `payment.webhook_received` with a delay
  of 5000 ms and 3 attempts. Then it returns HTTP 200 at once. It returns HTTP 400 only when the
  event bus fails. Thus the gateway gets HTTP 200 also for a webhook with a bad signature.

### The event

The subscriber `dist/subscribers/payment-webhook.js` in `@medusajs/medusa` processes the event. It
calls `getWebhookActionAndData(payload)` of the provider. `payload` has three keys:

- `data`: the parsed body.
- `rawData`: the raw body as a `Buffer`. Use it for a signature check.
- `headers`: the request headers.

The subscriber ignores the result in these cases:

- The result has no `data.session_id`.
- The action is `NOT_SUPPORTED`, `CANCELED`, `FAILED`, `REQUIRES_MORE`, `PENDING_AUTHORIZATION` or
  `PENDING`.

For the action `SUCCESSFUL`, Medusa runs `processPaymentWorkflow` (`@medusajs/core-flows`). The
workflow calls `authorizePayment` if the session has no payment yet, so the amount check of
`authorizePayment` applies. Then it completes the cart if the cart has no order.

### The verification rule

- If the gateway signs the webhook, verify the signature as the gateway doc specifies. Use the raw
  body and the key from the options. Compare with `crypto.timingSafeEqual`.
- If the gateway has no signature, read only the payment id from the body. Then get the payment
  again from the gateway API. Use only the API response for the status, the amount and the
  reference.
- The gateway doc says which rule applies.

### The result

- A verified event of a paid payment: return
  `{ action: PaymentActions.SUCCESSFUL, data: { session_id, amount } }`. `session_id` is the
  reference that `initiatePayment` sent to the gateway. `amount` is the paid amount, as a number in
  whole rupiah. If the gateway gives the amount in a different unit, the gateway doc gives the
  conversion back to whole rupiah.
- Medusa uses `amount` only as the capture amount. `authorizePayment` already returned `captured`,
  so Medusa does not capture the payment again. `capturePayment_` in `@medusajs/payment` returns
  early for a captured payment.
- Each other case: return `{ action: PaymentActions.NOT_SUPPORTED }`. Examples: a bad signature, an
  event for a payment that is not paid, an event with no reference, or a failed API call.
- Do not throw. Write an error to the log for a bad signature or a failed API call. A thrown error
  makes the event fail, and the event bus tries it again. The return page and the recovery job
  cover a lost event.
- Do not compare the amount in this method. It has no access to the session. `authorizePayment`
  compares the amount.

## Recovery adapter

The job `check-paid-carts` completes a cart that the customer paid, but that has no order. This
happens when the customer closes the browser on the hosted page and the webhook does not arrive.

The job (`apps/backend/src/jobs/check-paid-carts.ts`, `apps/backend/src/recovery/`):

- Runs every 15 minutes (`*/15 * * * *`).
- Does nothing when `RECOVERY_ADAPTERS` is empty. The list is empty in the template.
- For each adapter, reads the payment sessions of `providerId` with the status `pending`.
- Keeps a session only if its cart has no order, the cart has no alert mark, and the session is 48
  hours old or less (`MAX_SESSION_AGE_MS`).
- Takes the oldest sessions first, at most `maxSessionsPerRun` sessions in one run.
- Calls `isSessionPaid(data)` for each session, one at a time. A thrown error skips the session for
  this run.
- When `isSessionPaid` returns `true`, completes the cart with `completeCartWorkflow`. This calls
  `authorizePayment`, so the amount check applies.
- When the completion fails, sends the email `paid-cart-alert` to `STORE_OWNER_EMAIL`. Then it
  writes `paid_cart_alert_sent_at` in the cart metadata, so it sends one alert for each cart.

The type `RecoveryAdapter` in `apps/backend/src/recovery/adapters.ts` (lines 2-13) has four fields:

```ts
export type RecoveryAdapter = {
  providerId: string
  maxSessionsPerRun: number
  isSessionPaid(data: Record<string, unknown>): Promise<boolean>
  paymentReference?(data: Record<string, unknown>): string | undefined
}
```

| Field                    | Rule                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `providerId`             | `<provider_id>`, from `constants.ts` of the provider.                                           |
| `maxSessionsPerRun`      | A number that keeps one run below the rate limit of the gateway API. See the gateway doc.       |
| `isSessionPaid(data)`    | Asks the gateway API. Returns `true` when the gateway reports the payment as paid.              |
| `paymentReference(data)` | Optional. Returns the gateway payment id for the alert email. Else the job uses the session id. |

`data` is the stored session data. Thus `isSessionPaid` reads the gateway payment id from the key
that `initiatePayment` returned.

To add the adapter:

1. Create `apps/backend/src/modules/<slug>/recovery.ts`. Export one `RecoveryAdapter` object with
   the name `<name>RecoveryAdapter`.
2. The adapter is not a Medusa service and gets no options. Make it create the client of
   `client.ts` inside `isSessionPaid`, with values from `process.env`.
3. Use the same keys and the same defaults as `paymentModule(env)`. Put the code that makes the
   client options from an env object in one exported function, for example `<name>ClientOptions(env)`
   in `client.ts`. Call it from `paymentModule(env)` and from the adapter.
4. Add the object to `RECOVERY_ADAPTERS` in `apps/backend/src/recovery/adapters.ts` (line 17):

```ts
import { <name>RecoveryAdapter } from "../modules/<slug>/recovery"

export const RECOVERY_ADAPTERS: RecoveryAdapter[] = [<name>RecoveryAdapter]
```

`apps/backend/jest.config.js` loads `apps/backend/.env.test` for all tests. Thus the unit test of
`isSessionPaid` gets the test keys from `.env.test`. It can also set `process.env` in `beforeEach`.

## Amount and currency

- The store has one region (Indonesia) and one currency (`idr`).
- Medusa stores the amounts in whole rupiah. For example, 95000 is Rp 95.000. No template code
  divides an amount by 100. Do not divide a Medusa amount by 100.
- Convert a Medusa amount with `MathBN.convert(input.amount).toNumber()` (`@medusajs/framework/utils`).
- Some gateways want IDR as a whole number. Others want two decimals or an amount in cents. Each
  gateway doc gives the exact conversion from whole rupiah in its section "Amount and currency".
- Convert from whole rupiah to the unit of the gateway for each request: `initiatePayment`,
  `updatePayment` and `refundPayment`.
- Compare two amounts in the unit of the gateway: convert `data.amount`, not the amount of the
  gateway.
- The webhook result is the only place that converts from the unit of the gateway to whole rupiah.
  See [The result](#the-result).

## Environment variables

- Name each key `<GATEWAY>_<NAME>` in upper case, for example `MIDTRANS_SERVER_KEY`. The gateway doc
  gives the exact names.
- The provider also needs `STOREFRONT_URL` for the return URL. The key already exists in
  `apps/backend/.env.example`, `apps/backend/.env.test` and the Compose anchor.
- Read each key in `paymentModule(env)` and give it to the provider as an option. The recovery
  adapter uses the same function of `client.ts`. See
  [Module and registration](#module-and-registration) and [Recovery adapter](#recovery-adapter).

Add each new key to these five places:

1. `apps/backend/.env.example`: the development value. Keep a secret empty, or write the sandbox
   placeholder that the gateway doc gives. Add a comment that names the dashboard page of the key.
2. `apps/backend/.env.test`: a fake value for the tests. Set the base URL key to a test host, for
   example `https://<slug>.test`. The fetch mock of the integration test matches this host, so no
   test calls the real API.
3. `.env.example` at the repository root: the production value. Write `change-me` for a secret. The
   check of `docs/deployment.md` ("Check the environment file", step 1) then finds a key with no real
   value.
4. The table in the section "Environment file" of `docs/deployment.md`: the key, its purpose and its
   value. The repository rule: when you add a key to `.env.example`, add the key to this table.
5. The `x-medusa-environment` anchor of `docker-compose.yml` (line 11), as `<KEY>: ${<KEY>}`. The
   services `medusa-server` and `medusa-worker` both read the anchor.

## Checkout label

- Add two keys to `apps/storefront/i18n/locales/en.json` and to
  `apps/storefront/i18n/locales/id.json`:
  - `checkout.paymentProviders.<provider_id>`: the name of the payment row, for example "Midtrans".
  - `checkout.paymentHints.<provider_id>`: the hint under the row, in English in `en.json` and in
    Indonesian in `id.json`.
- `apps/storefront/test/unit/locale-messages.test.ts` compares the keys of `en.json` and `id.json`.
  Add each key to both files.
- `paymentRowKeys` in `apps/storefront/app/utils/paymentRows.ts` (lines 13-35) reads the keys. If a
  key is absent, the row shows "Online payment" (`checkout.paymentProviders.default`) and the hint
  `checkout.gatewayHint`. The caption is always `checkout.paymentCaptions.gateway`.
- Make no other storefront change. The checkout gets the providers from the region, and
  `startPayment` works for each provider that obeys this contract.

## The payment confirmed email

The subscriber on `payment.captured` (`apps/backend/src/subscribers/payment-captured.ts`) sends the
email `payment-confirmed`. It sends the email only for a provider in `PAYMENT_CONFIRMED_PROVIDERS`
(`apps/backend/src/lib/payment-confirmed-providers.ts`). The list has one entry,
`BANK_TRANSFER_PROVIDER_ID`.

- Add `<provider_id>` to the list when the gateway captures the payment later than the order
  placement.
- Do not add `<provider_id>` when the gateway captures the payment at the redirect. The
  `order-placed` email already confirms the payment. A provider that obeys
  [authorizePayment](#authorizepayment) captures at the redirect.

The refund emails also depend on the provider:

- In Medusa 2.21.2, `cancelOrderWorkflow` refunds each captured payment of the order. Thus the
  cancellation of a captured order also emits `payment.refunded`.
- The subscriber on `payment.refunded` (`apps/backend/src/subscribers/payment-refunded.ts`) sends
  the email `refund-sent`. A refund of a cancelled gateway order sends it. The `order-cancelled`
  email tells the customer that the refund comes in a separate email.
- A refund of a cancelled bank transfer order sends no `refund-sent` email. The `order-cancelled`
  email already gives the refund amount, and the owner moves the money by hand.

## Session data

- Do not put a secret in the session data or in the payment data. Examples of a secret: an API key,
  a server key, a signature key, a webhook token. The Store API returns the session data to the
  browser in the response of `initiatePaymentSession`.
- Put only these values in the session data: `payment_url`, the gateway payment id, `amount`,
  `session_id`, and the expiry time if the gateway gives one. Medusa also keeps `customer` from the
  storefront.
- The payment data starts as a copy of the session data. Later methods can add only
  `gateway_status` (`retrievePayment`) and `refund_ids` (`refundPayment`).
- The storefront reads the session data only in `startPayment`
  (`apps/storefront/app/composables/useCheckout.ts` lines 102-110). It reads only `payment_url`. Do
  not read the session data in another storefront page.

## Tests

Write the tests before the code. Two kinds of test are necessary.

### Unit tests

- Put them in `apps/backend/src/modules/<slug>/__tests__/<topic>.unit.spec.ts`, for example
  `authorize.unit.spec.ts`. Jest finds the files that match
  `**/src/**/__tests__/**/*.unit.spec.[jt]s` (`apps/backend/jest.config.js`).
- Create the service directly:
  `new <Name>ProviderService({ logger } as any, options)`, as
  `apps/backend/src/modules/bank-transfer/__tests__/service.unit.spec.ts` does.
- Replace `global.fetch` with a `jest.fn()` in `beforeEach`, and give each call a response object.
  `apps/backend/src/modules/brevo/__tests__/service.unit.spec.ts` shows the pattern.
- Use the JSON of the section "Example JSON for test mocks" of the gateway doc.
- Test at least these cases:
  - The identifier is `<slug>`, and the constant is `<provider_id>`.
  - `initiatePayment` sends the converted amount, the return URL and the session id (or the
    transformed reference of the gateway doc). It returns an `https` `payment_url`, the gateway
    payment id, `amount` and `session_id`.
  - `initiatePayment` throws for a currency that is not `idr`.
  - `authorizePayment` returns `captured` for a paid payment with the same amount.
  - `authorizePayment` throws `PAYMENT_AUTHORIZATION_ERROR` for an unpaid payment, for a paid
    payment with a different amount, and for a failed API call.
  - `getWebhookActionAndData` returns `SUCCESSFUL` with `session_id` and `amount` for a verified
    paid event.
  - `getWebhookActionAndData` returns `NOT_SUPPORTED` for an unpaid payment and a foreign event. It
    does not throw.
  - A gateway that signs the webhook: `getWebhookActionAndData` returns `NOT_SUPPORTED` for a bad
    signature.
  - A gateway with no signature: `getWebhookActionAndData` returns `NOT_SUPPORTED` when the body
    says "paid" and the API says "not paid".
  - A gateway with a refund API: `refundPayment` calls the refund API with the amount in the unit of
    the gateway, and adds the refund id to `refund_ids`.
  - A gateway with no refund API: `refundPayment` writes the warning, returns `input.data` with no
    change, and makes no `fetch` call.
  - `cancelPayment` and `deletePayment` do not throw when the gateway refuses.
  - `isSessionPaid` of the recovery adapter returns `true` only for a paid payment.
- Change `apps/backend/src/config/__tests__/modules.unit.spec.ts` (the `describe` "buildModules:
  payment module"). It expects only the bank transfer provider today.

### HTTP integration test

- Put it in `apps/backend/integration-tests/http/<slug>-checkout.spec.ts`. It uses
  `medusaIntegrationTestRunner` and `runSeed`, as the other files in that directory do.
- Make a fetch mock in `apps/backend/integration-tests/helpers/<slug>-mock.ts`. This is the
  general interface:

```ts
// The test base URL of .env.test, for example "https://<slug>.test".
const ORIGIN = "https://<slug>.test"

export type <Name>MockPayment = {
  id: string // the gateway payment id
  amount: number // in the unit of the gateway
  status: string // a status value of the gateway
}

export type <Name>Mock = {
  payments: Map<string, <Name>MockPayment>
  requests?: { method: string; path: string }[]
  setStatus(id: string, status: string): void
  setAmount(id: string, amount: number): void
  setDown?(down: boolean): void
  restore(): void
}

export function install<Name>Mock(): <Name>Mock
```

- The mock works in this way:
  - `install<Name>Mock` keeps the original `fetch`. Then it puts its own function in
    `global.fetch`.
  - The function reads the URL from a string, a `URL` or a `Request`. It gives each URL that does
    not start with `ORIGIN` to the original `fetch`. The calls to the Medusa test server then work.
  - It records the method and the path of each call in `requests`, if the mock has `requests`.
  - It routes the call by the method and the path to the gateway calls that the gateway doc gives.
    Each route returns a `Response` with the JSON of the section "Example JSON for test mocks" of
    the gateway doc.
  - The create route stores a payment with the unpaid status of the gateway. It returns an `https`
    payment URL, for example `https://<slug>.test/pay/<id>`.
  - The status route returns the stored payment. For an unknown id, it returns the "not found"
    answer of the gateway.
  - The cancel route sets the closed status of the gateway on the stored payment.
  - Each other path returns HTTP 404, for example with the text `No mock for <method> <path>`.
  - After `setDown(true)`, each call returns HTTP 503, if the mock has `setDown`.
  - `setStatus` and `setAmount` throw for an unknown id.
  - `restore()` puts the original `fetch` back. Call it in `afterEach`.
- The gateway doc gives the routes, the bodies and the names. It can use the names of the gateway,
  for example `invoices` or `orders` for the `Map`, and `invoiceNumber` for `id`. It can replace
  `setStatus` and `setAmount` with functions that change the payment in the steps of the gateway,
  for example `pay(id, amount)`. It can add fields, functions and an `origin` parameter. `requests`
  and `setDown` are optional.
- The removed Mayar mock is a full example:
  `git show 4aace4f:apps/backend/integration-tests/helpers/mayar-mock.ts`. Its routes and its
  response bodies are Mayar facts. Do not copy them for another gateway.
- `createCartWithPaymentSession` in `apps/backend/integration-tests/helpers/checkout.ts` uses the
  bank transfer provider. Add a third parameter `providerId`, with the default
  `BANK_TRANSFER_PROVIDER_ID`, so that the existing tests do not change.
- The helper already sends `data: { customer }` with a `PaymentCustomer` of the storefront:
  `first_name` "Budi", `last_name` "Santoso", `email` "buyer@example.com" and `phone`
  "+6281234567890". Do not add a parameter for the customer.
- Change `apps/backend/integration-tests/http/seed-region.spec.ts`. It expects only
  `pp_bank-transfer_bank-transfer` in the region today.
- Test at least these cases:
  - The session stores an `https` `payment_url` and the amount of the cart.
  - `POST /store/carts/:id/complete` with an unpaid payment gives HTTP 200, `type: "cart"`, and no
    order.
  - After the mock marks the payment as paid, the same call gives `type: "order"`. The order has
    `payment_status` `captured`.
  - A paid payment with a different amount gives no order.
  - A second completion gives the same order.
  - A change of the cart total deletes the old session, and the mock shows the old hosted payment as
    closed, if the gateway supports it.
  - `runCheckPaidCarts(container, [adapter])` with the real adapter completes a paid cart.
    `apps/backend/integration-tests/http/check-paid-carts.spec.ts` shows how to call the job.

### Commands

Run the commands from the repository root:

```bash
pnpm --filter @store/backend test:unit src/modules/<slug>
pnpm --filter @store/backend test:unit src/config
pnpm --filter @store/backend test:integration:http integration-tests/http/<slug>-checkout.spec.ts
pnpm --filter @store/backend test:integration:http integration-tests/http/seed-region.spec.ts
pnpm --filter @store/backend test:integration:http integration-tests/http/check-paid-carts.spec.ts
pnpm --filter @store/storefront exec vitest run test/unit/paymentRows.test.ts test/unit/locale-messages.test.ts
```

The two storefront tests need no change. Run them to make sure that the new locale keys break
nothing.

The HTTP integration tests need PostgreSQL. See `AGENTS.md`.

## Procedure to add a gateway

Do the steps in this order. Each step is one action.

1. Open the gateway doc in `docs/payments/`. See [Gateway docs](#gateway-docs).
2. Open each page in the section "Sources" of the gateway doc. Compare the facts with the doc. If
   a page and the doc are different, the page is correct. Change the gateway doc, and change its
   `Checked on` date.
3. For each fact with the mark **unverified**, find the answer in the sandbox before you write the
   code that uses it. Write the answer in the gateway doc, and remove the mark. If you have no
   sandbox key yet, write the code with the fallback of the gateway doc, and keep the mark. Then
   find each answer in the sandbox before the production deploy of step 29.
4. Make a sandbox account. Get the sandbox keys. Use the section "Account and dashboard setup" of
   the gateway doc.
5. Create `apps/backend/src/modules/<slug>/constants.ts` with `<GATEWAY>_PROVIDER_ID`.
6. Write the unit tests in `apps/backend/src/modules/<slug>/__tests__/`. Run them and see them fail.
7. Write `client.ts` with the calls that the gateway doc gives.
8. Write `service.ts` with the ten methods of [The provider contract](#the-provider-contract).
9. Write `index.ts`.
10. Write `recovery.ts` with the recovery adapter.
11. Run the unit tests and see them pass.
12. Register the provider in `paymentModule(env)` in `apps/backend/src/config/modules.ts`.
13. Change `apps/backend/src/config/__tests__/modules.unit.spec.ts` for the new provider list.
14. Add `<provider_id>` to `PAYMENT_PROVIDERS` in `apps/backend/src/seed/region.ts`.
15. Change `apps/backend/integration-tests/http/seed-region.spec.ts` for the new provider list.
16. Add the adapter to `RECOVERY_ADAPTERS` in `apps/backend/src/recovery/adapters.ts`.
17. Add each env key to the five places of [Environment variables](#environment-variables).
18. Add the two locale keys of [Checkout label](#checkout-label) to `en.json` and `id.json`.
19. Write the fetch mock and the HTTP integration test of [Tests](#tests).
20. Run the commands of [Tests](#tests).
21. Run `pnpm lint` and `pnpm format:check`.
22. Add the provider id to the list "Provider ids that both apps depend on" in `AGENTS.md`.
23. Put the sandbox keys in `apps/backend/.env`. Start the backend and the storefront with
    `pnpm dev`.
24. Make one order in the sandbox with each payment method that the client uses. Use the section
    "Sandbox tests" of the gateway doc. The customer comes back to the return page, so this test
    needs no webhook. Some gateways refuse an `http://` return URL. If the gateway doc says so, do
    this order on the public HTTPS host of step 25, not on `localhost`.
25. Test the webhook with the sandbox keys on a host with a public HTTPS URL. The gateway cannot
    send a webhook to `localhost`. Use a staging server, or a tunnel to the local backend. The
    template has no staging procedure.
26. In the sandbox dashboard, set the webhook URL `https://<public host>/hooks/payment/<provider_id>`.
    Close the browser on the hosted page after the payment. Make sure that the cart becomes an
    order. If the gateway doc says that the status API of the gateway is late, the recovery job can
    complete the cart in place of the webhook, within 15 minutes.
27. Add the production dashboard steps to the section "Payments" of `docs/deployment.md`. The
    section exists. Add the steps after the bank account steps.
28. On a database that already has the region, add the provider to the region in Medusa Admin:
    **Settings → Regions → Indonesia → Edit → Payment providers**. The seed sets the providers only
    when it runs.
29. Put the production keys in `.env` on the server. Do the deploy of `docs/deployment.md`.
30. In the production dashboard of the gateway, set the webhook URL
    `https://api.<domain>/hooks/payment/<provider_id>`.
31. In the production dashboard of the gateway, set the return URL
    `https://<domain>/checkout/return`, if the gateway does not take it from the API request.
32. Make one real order with a small amount. Refund it in Medusa Admin.

## Final checklist

Do each check before you report success.

- [ ] `apps/backend/src/modules/<slug>/` has `index.ts`, `service.ts`, `client.ts`, `constants.ts`
      and `recovery.ts`.
- [ ] `static identifier` and the `id` in `paymentModule(env)` are both `<slug>`.
- [ ] `initiatePayment` returns an `https` `payment_url`, the gateway payment id, `amount` and
      `session_id`.
- [ ] The return URL is `${STOREFRONT_URL}/checkout/return`, with no locale prefix.
- [ ] `authorizePayment` asks the gateway API. It returns `captured` only for a paid payment with
      the correct amount. Else it throws `PAYMENT_AUTHORIZATION_ERROR`.
- [ ] `getWebhookActionAndData` verifies the webhook as the gateway doc says. It returns
      `SUCCESSFUL` with `session_id` and `amount`, or `NOT_SUPPORTED`. It never throws.
- [ ] The session data and the payment data have no secret.
- [ ] No new code divides a Medusa amount by 100.
- [ ] `<provider_id>` is in `PAYMENT_PROVIDERS` of `apps/backend/src/seed/region.ts`.
- [ ] The adapter is in `RECOVERY_ADAPTERS`.
- [ ] Each env key is in `apps/backend/.env.example`, `apps/backend/.env.test`, `.env.example`, the
      table of `docs/deployment.md` and the `x-medusa-environment` anchor of `docker-compose.yml`.
- [ ] `en.json` and `id.json` have `checkout.paymentProviders.<provider_id>` and
      `checkout.paymentHints.<provider_id>`.
- [ ] In `apps/storefront/`, only `i18n/locales/en.json` and `i18n/locales/id.json` changed.
- [ ] The unit tests and the HTTP integration tests of [Tests](#tests) pass.
- [ ] `pnpm lint` and `pnpm format:check` report no problem.
- [ ] A sandbox order became an order through the return page.
- [ ] A sandbox webhook completed a cart when the browser did not come back. For a gateway with a
      late status API, the recovery job can complete the cart in place of the webhook.

## Gateway docs

Each doc starts with the line `Checked on: <YYYY-MM-DD>`. Then it has these 15 sections, in this
order:

1. Sources
2. Check before you build
3. Account and dashboard setup
4. Environment variables
5. Base URLs and authentication
6. Create a hosted payment
7. Payment status
8. Webhook
9. Refund
10. Expiry, cancellation and update
11. Amount and currency
12. Rate limits
13. Sandbox tests
14. Traps
15. Example JSON for test mocks

A fact that the official documentation does not state clearly has the mark **unverified**.

| Gateway         | Doc                        | `<slug>`          | `<provider_id>`                      |
| --------------- | -------------------------- | ----------------- | ------------------------------------ |
| DOKU            | [doku.md](doku.md)         | `doku`            | `pp_doku_doku`                       |
| Mayar           | [mayar.md](mayar.md)       | `mayar`           | `pp_mayar_mayar`                     |
| Midtrans        | [midtrans.md](midtrans.md) | `midtrans`        | `pp_midtrans_midtrans`               |
| Stripe Checkout | [stripe.md](stripe.md)     | `stripe-checkout` | `pp_stripe-checkout_stripe-checkout` |
| Xendit          | [xendit.md](xendit.md)     | `xendit`          | `pp_xendit_xendit`                   |
