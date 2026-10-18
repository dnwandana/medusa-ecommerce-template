# Stripe Checkout payment gateway

Checked on: 2026-10-18

This document gives the facts of the Stripe API for a provider that obeys
[the contract in README.md](README.md). Read README.md first.

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| `<slug>`        | `stripe-checkout`                          |
| `<provider_id>` | `pp_stripe-checkout_stripe-checkout`       |
| `<GATEWAY>`     | `STRIPE`                                   |
| `<Name>`        | `StripeCheckout`                           |
| `<name>`        | `stripeCheckout`                           |
| Module path     | `apps/backend/src/modules/stripe-checkout` |
| Hosted payment  | Stripe Checkout, `ui_mode` `hosted_page`   |

The names in the code:

- `constants.ts`: `STRIPE_PROVIDER_ID = "pp_stripe-checkout_stripe-checkout"` and
  `STRIPE_API_VERSION = "2026-09-30.endive"`.
- `service.ts`: the class `StripeCheckoutProviderService`, with
  `static identifier = "stripe-checkout"`.
- `client.ts`: the class `StripeCheckoutClient` and the function `stripeCheckoutClientOptions(env)`.
- `recovery.ts`: the object `stripeCheckoutRecoveryAdapter`.

The provider uses one Stripe object, the Checkout Session. A Checkout Session in `payment` mode is a
hosted payment page. Its `url` is the `payment_url`. The provider never uses the Payment Element,
Stripe.js or a publishable key. The storefront does not change.

## 1. Sources

Each fact in this document comes from one of these pages. A fact with no clear statement on these
pages has the mark **unverified**.

| Topic                                                      | URL                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| API basics (base URL, form-encoded body, sandboxes)        | https://docs.stripe.com/api                                                                                               |
| Authentication (secret and restricted keys, Bearer)        | https://docs.stripe.com/api/authentication                                                                                |
| API versions and the `Stripe-Version` header               | https://docs.stripe.com/api/versioning                                                                                    |
| API changelog                                              | https://docs.stripe.com/changelog                                                                                         |
| Change: `ui_mode` values (2026-03-25.dahlia)               | https://docs.stripe.com/changelog/dahlia/2026-03-25/updates-available-checkout-session-ui-modes                           |
| Change: `payment_method_types` removed (2026-09-30.endive) | https://docs.stripe.com/changelog/endive/2026-09-30/remove-payment-method-types-checkout-sessions                         |
| Idempotent requests                                        | https://docs.stripe.com/api/idempotent_requests                                                                           |
| Errors and HTTP status codes                               | https://docs.stripe.com/api/errors                                                                                        |
| Error codes                                                | https://docs.stripe.com/error-codes                                                                                       |
| Metadata limits                                            | https://docs.stripe.com/api/metadata                                                                                      |
| Create a Checkout Session                                  | https://docs.stripe.com/api/checkout/sessions/create                                                                      |
| The Checkout Session object                                | https://docs.stripe.com/api/checkout/sessions/object                                                                      |
| Retrieve a Checkout Session                                | https://docs.stripe.com/api/checkout/sessions/retrieve                                                                    |
| Expire a Checkout Session                                  | https://docs.stripe.com/api/checkout/sessions/expire                                                                      |
| How Checkout works (hosted page, expiry)                   | https://docs.stripe.com/payments/checkout/how-checkout-works?payment-ui=stripe-hosted                                     |
| Fulfill orders (hosted page, webhook, landing page)        | https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted                                                     |
| Adaptive Pricing (hosted page)                             | https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing?payment-ui=stripe-hosted                     |
| The PaymentIntent object (statuses, minimum amount)        | https://docs.stripe.com/api/payment_intents/object                                                                        |
| Event types                                                | https://docs.stripe.com/api/events/types                                                                                  |
| The Event object                                           | https://docs.stripe.com/api/events/object                                                                                 |
| Webhooks (endpoint setup, retries, manual verification)    | https://docs.stripe.com/webhooks?verify=verify-manually                                                                   |
| Webhook signature errors                                   | https://docs.stripe.com/webhooks/signature                                                                                |
| Create a refund                                            | https://docs.stripe.com/api/refunds/create                                                                                |
| The Refund object                                          | https://docs.stripe.com/api/refunds/object                                                                                |
| Refunds (balance, failed refunds)                          | https://docs.stripe.com/refunds                                                                                           |
| Supported currencies (decimals, minimum, maximum)          | https://docs.stripe.com/currencies                                                                                        |
| Rate limits and read allocations                           | https://docs.stripe.com/rate-limits                                                                                       |
| API keys                                                   | https://docs.stripe.com/keys                                                                                              |
| Restricted API keys                                        | https://docs.stripe.com/keys/restricted-api-keys                                                                          |
| Sandboxes                                                  | https://docs.stripe.com/sandboxes                                                                                         |
| Testing (test cards)                                       | https://docs.stripe.com/testing                                                                                           |
| Global availability (Indonesia: "Preview")                 | https://stripe.com/global                                                                                                 |
| Stripe accounts in Indonesia (methods, currency)           | https://support.stripe.com/questions/supported-payment-methods-currencies-and-businesses-for-stripe-accounts-in-indonesia |
| Integration recommendations for Indonesia                  | https://support.stripe.com/questions/integration-recommendations-for-stripe-accounts-in-indonesia                         |
| Official Node.js SDK, webhook signature                    | https://github.com/stripe/stripe-node/blob/master/src/Webhooks.ts                                                         |
| Official Node.js SDK, HMAC (hex digest)                    | https://github.com/stripe/stripe-node/blob/master/src/crypto/NodeCryptoProvider.ts                                        |
| Official Node.js SDK, request headers and error body       | https://github.com/stripe/stripe-node/blob/master/src/RequestSender.ts                                                    |
| Medusa Stripe provider (reason not to use it)              | https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe                                      |
| Medusa storefront guide for Stripe (embedded card form)    | https://docs.medusajs.com/resources/storefront-development/checkout/payment/stripe                                        |

Each page of `docs.stripe.com` is also available as Markdown. Add `.md` to the path, for example
`https://docs.stripe.com/currencies.md`. The SDK facts come from `stripe` 19.1.0 (the version in
`node_modules/.pnpm` on the day of the check). The Medusa facts also come from
`@medusajs/payment-stripe` 2.21.2 in `node_modules/.pnpm`.

## 2. Check before you build

Check these pages again before you write code. APIs change.

Open each URL of [Sources](#1-sources). Compare the facts with this document. If a page and this
document are different, the page is correct. Change this document and its `Checked on` date.

Stripe releases a new API version each month and a major version with breaking changes two times
each year. On the day of the check, the current version is `2026-09-30.endive`. Open
https://docs.stripe.com/changelog and read each breaking change for Checkout Sessions, Refunds and
Events after that version. If you change `STRIPE_API_VERSION`, change the webhook destination
version too. See [Webhook](#8-webhook).

Do not use the SDK `stripe` in the provider. Call the API with `fetch`, as README.md says. The SDK
has its own HTTP client, and the test mocks of README.md replace only `global.fetch`. The SDK source
is a reference only.

## 3. Account and dashboard setup

### Who can use Stripe in Indonesia

Ask the client this question before you build: "In which country is your Stripe account?"

- The Stripe global availability page lists Indonesia as "Preview". The page links Indonesia to the
  sales contact page, not to the sign-up page.
- The Stripe support article for Indonesian accounts says: "Stripe accounts in Indonesia support
  Indonesia Bank transfer (virtual account) to make payments." It also says: "Any other payment
  methods are not supported at the moment." Thus an Indonesian account cannot accept cards.
- The same article says that an Indonesian account accepts only IDR and does not support
  cross-border payments.
- Stripe recommends the PaymentIntents API for Indonesian accounts. The list of Checkout payment
  method types in the SDK (`stripe` 19.1.0) has no Indonesian bank transfer type. Thus Checkout
  probably cannot take a payment for an Indonesian account (**unverified**).
- This provider fits a client with a Stripe account in a country that Stripe fully supports, for
  example Singapore, that charges in IDR. Stripe then converts each IDR charge to the settlement
  currency of the account.

If the client has only an Indonesian Stripe account, do not build this provider. Use an Indonesian
gateway from [Gateway docs](README.md#gateway-docs).

### Why the template does not use the Medusa Stripe provider

Medusa has a Stripe provider, `@medusajs/payment-stripe` (`pp_stripe_stripe`). The template does not
use it. The reasons:

- The Medusa Stripe provider uses an embedded form. Its `initiatePayment` creates a PaymentIntent and
  returns the PaymentIntent object as the session data. The session data has a `client_secret` and
  no `payment_url`. The Medusa storefront guide puts a Stripe.js card form (`CardElement`) on the
  checkout page and calls `confirmCardPayment` with that `client_secret`.
- The template sends each customer to a hosted page. `startPayment` in
  `apps/storefront/app/composables/useCheckout.ts` redirects only when the session data has
  `payment_url`. Without it, `startPayment` completes the cart at once. The PaymentIntent has the
  status `requires_payment_method`, so the Medusa Stripe provider returns `pending`, and Medusa
  refuses the cart (README.md, [authorizePayment](README.md#authorizepayment)).
- An embedded form needs changes in the storefront checkout code. The template rules forbid
  embedded payment forms and storefront changes for a gateway.
- The Medusa Stripe provider puts the full PaymentIntent in the session data. The rule of
  [Session data](README.md#session-data) allows only a few keys.

Stripe Checkout with `ui_mode` `hosted_page` is a hosted page. This custom provider obeys the
contract of README.md with no storefront change.

### Dashboard steps (sandbox)

1. Create a Stripe account in the country of the client, or get access to the account of the
   client.
2. Open a sandbox: the Dashboard account picker → **Sandboxes**. Use a general sandbox, not the old
   test mode sandbox, for a new integration.
3. Open the API keys page (https://dashboard.stripe.com/apikeys) in the sandbox. Copy the secret key
   (`sk_test_...`) or create a restricted key (`rk_test_...`). See [API key](#api-key).
4. Open the payment methods settings (https://dashboard.stripe.com/settings/payment_methods). Turn on
   the methods that the client wants. Cards are on by default. The provider does not send a list of
   payment methods, so Checkout shows each method that is on and that accepts IDR.
5. Create the webhook destination. See [Webhook](#8-webhook).
6. The return URL comes from the API request (`success_url`). The dashboard has no return URL
   setting.
7. Optional: set the branding (logo, colors) in the Dashboard Checkout settings. The provider does
   not send `branding_settings`.

Do the same steps in live mode for production. Live mode has different keys and a different webhook
signing secret.

### Production steps for `docs/deployment.md`

README.md step 27 adds these steps to the section "Payments" of `docs/deployment.md`:

1. In the Stripe Dashboard, switch from the sandbox to live mode.
2. On the API keys page, create a restricted key with the permissions of [API key](#api-key). Put
   it in `STRIPE_SECRET_KEY` in `.env`.
3. In the payment methods settings of live mode, turn on the methods that the client wants.
4. In Workbench → **Webhooks**, create the destination of [Webhook](#8-webhook) with the URL
   `https://api.<domain>/hooks/payment/pp_stripe-checkout_stripe-checkout`. Put its signing secret
   in `STRIPE_WEBHOOK_SECRET` in `.env`.
5. Keep `STRIPE_API_URL=https://api.stripe.com`.

### Checkout label

The two locale keys of [Checkout label in README.md](README.md#checkout-label). The text is a
choice of the template. Change it for the client.

| Key                                                            | `en.json`                        | `id.json`                            |
| -------------------------------------------------------------- | -------------------------------- | ------------------------------------ |
| `checkout.paymentProviders.pp_stripe-checkout_stripe-checkout` | `Card (Stripe)`                  | `Kartu (Stripe)`                     |
| `checkout.paymentHints.pp_stripe-checkout_stripe-checkout`     | `Pay on the secure Stripe page.` | `Bayar di halaman Stripe yang aman.` |

### API key

- A secret key (`sk_test_...`, `sk_live_...`) can call each API. Stripe recommends a restricted key
  (`rk_test_...`, `rk_live_...`) for new integrations.
- For a restricted key, set these permissions. The exact resource names in the Dashboard are
  **unverified**. Check them with a sandbox call:
  - Checkout Sessions: **Write** (create, retrieve, expire).
  - Refunds: **Write**.
  - All other resources: **None**.
- A write permission includes the read permission.
- In live mode, Stripe shows a new key one time only. Copy it before you close the dialog.

## 4. Environment variables

| Key                     | Purpose                                                           | Development value        | Test value (`.env.test`)       | Production value         |
| ----------------------- | ----------------------------------------------------------------- | ------------------------ | ------------------------------ | ------------------------ |
| `STRIPE_SECRET_KEY`     | The secret or restricted API key. It authenticates each API call. | empty (secret)           | `sk_test_fake`                 | `change-me`              |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the webhook destination (`whsec_...`).      | empty (secret)           | `whsec_test_fake`              | `change-me`              |
| `STRIPE_API_URL`        | The API base URL.                                                 | `https://api.stripe.com` | `https://stripe-checkout.test` | `https://api.stripe.com` |

- Stripe has one base URL for the sandbox and for live mode. The key selects the environment: a
  `_test_` key runs in the sandbox, a `_live_` key runs in live mode, as README.md allows.
  `STRIPE_API_URL` exists only so that the tests can use a fake host.
- `stripeCheckoutClientOptions(env)` in `client.ts` returns
  `{ apiUrl, secretKey, webhookSecret }`. `apiUrl` defaults to `https://api.stripe.com`. The two
  secrets default to an empty string. The client uses `apiUrl` and `secretKey`. The service uses
  `webhookSecret`.
- `validateOptions` throws when `storefrontUrl` or `apiUrl` is empty. It does not check the two
  secrets.
- The API version is not an env key. It is the constant `STRIPE_API_VERSION` in `constants.ts`,
  because a change of the version can need a change of the code.
- Add the three keys to the five places of
  [Environment variables in README.md](README.md#environment-variables). In
  `apps/backend/.env.example`, name the dashboard pages: "Stripe Dashboard → API keys" for
  `STRIPE_SECRET_KEY`, and "Stripe Workbench → Webhooks → the destination → Signing secret" for
  `STRIPE_WEBHOOK_SECRET`.

## 5. Base URLs and authentication

| Environment | Base URL                 | Key prefix               |
| ----------- | ------------------------ | ------------------------ |
| Sandbox     | `https://api.stripe.com` | `sk_test_` or `rk_test_` |
| Live        | `https://api.stripe.com` | `sk_live_` or `rk_live_` |

Send these headers with each request:

| Header            | Value                                      | Requests                            |
| ----------------- | ------------------------------------------ | ----------------------------------- |
| `Authorization`   | `Bearer <STRIPE_SECRET_KEY>`               | all                                 |
| `Stripe-Version`  | `STRIPE_API_VERSION` (`2026-09-30.endive`) | all                                 |
| `Content-Type`    | `application/x-www-form-urlencoded`        | `POST` only                         |
| `Idempotency-Key` | see each request                           | `POST` only, where this doc says so |

- The API docs show HTTP Basic auth with the key as the user name. They also allow Bearer auth.
  Use Bearer.
- The request body is form-encoded, not JSON. Nested keys use brackets, for example
  `line_items[0][price_data][currency]=idr`. Arrays use the index in the brackets. Build the body
  with `URLSearchParams`. The SDK uses the same format (`arrayFormat: "indices"` in `utils.js`).
- The response body is JSON.
- Without `Stripe-Version`, a request uses the default API version of the account. Always send the
  header, so that the account setting cannot change the response.
- Do not send `Idempotency-Key` with a `GET` request. It has no effect.
- An idempotency key is up to 255 characters. Stripe keeps a key for at least 24 hours. A second
  request with the same key and different parameters fails with the error type `idempotency_error`.

### Errors

An error response has an HTTP status of `4xx` or `5xx` and this body (the SDK reads
`response.error`, `RequestSender.js`):

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "resource_missing",
    "message": "No such checkout.session: 'cs_test_missing'",
    "param": "session"
  }
}
```

- `type` is one of `api_error`, `card_error`, `idempotency_error` and `invalid_request_error`.
- `code` is optional. Useful codes: `resource_missing` (unknown id), `amount_too_small`,
  `amount_too_large`, `charge_already_refunded`, `idempotency_key_in_use`.
- The text of `message` in the example is **unverified**. Do not compare `message` in the code.
- HTTP statuses: 400 bad request, 401 no valid key, 402 request failed, 403 the key has no
  permission, 404 not found, 409 conflict, 429 too many requests, 5xx Stripe error.
- Make the `UNEXPECTED_STATE` message of README.md from the HTTP status, `error.code` (or
  `error.type`) and `error.message`, in this format:
  `Stripe API error <status> <code or type>: <message>`. Do not put the key in the message.

### The client

`StripeCheckoutClient` in `client.ts` has four methods. Each method returns the parsed JSON body of
a `2xx` response.

| Method                                  | Request                                  |
| --------------------------------------- | ---------------------------------------- |
| `createSession(params)`                 | `POST /v1/checkout/sessions`             |
| `retrieveSession(id)`                   | `GET /v1/checkout/sessions/{id}`         |
| `expireSession(id)`                     | `POST /v1/checkout/sessions/{id}/expire` |
| `createRefund(params, idempotencyKey?)` | `POST /v1/refunds`                       |

- For a response that is not `2xx`, the client throws a `StripeApiError` (a class in `client.ts`)
  with `status`, `type`, `code` and `message` from the `error` object. If the body is not JSON,
  `message` is the response text.
- For a network error or a timeout, the client throws a `StripeApiError` with `status: 0`.
- The client does not retry. A 429 or a `lock_timeout` is an error like the others. The return page
  and the recovery job try again later.
- The service finds HTTP 404 with `error.status === 404`.

## 6. Create a hosted payment

`initiatePayment` makes one request: `POST {apiUrl}/v1/checkout/sessions`.

### The request

| Parameter                                       | Value                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `mode`                                          | `payment`                                                              |
| `success_url`                                   | `${storefrontUrl}/checkout/return` (trailing `/` removed)              |
| `line_items[0][price_data][currency]`           | `idr`                                                                  |
| `line_items[0][price_data][unit_amount]`        | the Stripe amount. See [Amount and currency](#11-amount-and-currency). |
| `line_items[0][price_data][product_data][name]` | `Order` (a choice of the template; the hosted page shows it)           |
| `line_items[0][quantity]`                       | `1`                                                                    |
| `client_reference_id`                           | `input.data.session_id`                                                |
| `metadata[session_id]`                          | `input.data.session_id`                                                |
| `payment_intent_data[metadata][session_id]`     | `input.data.session_id`                                                |
| `customer_email`                                | `input.data?.customer?.email`, only if it is a non-empty string        |
| `expires_at`                                    | `Math.floor(Date.now() / 1000) + 3600`                                 |

Headers: the headers of [Base URLs and authentication](#5-base-urls-and-authentication). Do not
send `Idempotency-Key` in a create request. `expires_at` changes each second, and Stripe refuses
a second request with the same key and different parameters. A duplicate session after a network
retry does no harm, because the customer uses only the `url` of the returned session, and the other
session expires.

Before the request:

- Compare `input.currency_code` in lower case. Throw `INVALID_DATA` when it is not `idr`.
- Compute the rupiah amount with `MathBN.convert(input.amount).toNumber()`. Throw `INVALID_DATA`
  when it is not a positive integer (`Number.isInteger`). Do not round. The store uses whole
  rupiah, so a fraction is a bug.
- `input.data.customer` can be absent, for example in a test helper. Read the email with optional
  chaining.

Notes on the request:

- The provider gets only the cart total, not the cart lines. Thus it sends one line with
  quantity 1 and the full amount. `price_data` creates the price inline. The provider creates no
  Product or Price object.
- Do not send `ui_mode`. The default is `hosted_page`. The name of this value changed in
  `2026-03-25.dahlia` (it was `hosted`). The default works with each version.
- Do not send `payment_method_types`. Version `2026-09-30.endive` removed it. A request with it
  gets HTTP 400. The Dashboard settings select the payment methods.
- Do not send `cancel_url`. When it is absent, Checkout shows no back button. The customer can use
  the back button of the browser to go back to `/checkout`. When `cancel_url` is the return page,
  the return page shows "Payment is being confirmed" to a customer who did not pay. When it is
  `/checkout`, the URL has no locale prefix, so an Indonesian customer sees the English checkout.
- Do not send `allow_promotion_codes`, `discounts`, `automatic_tax`, `shipping_options`,
  `shipping_address_collection`, `line_items[0][adjustable_quantity]`, `optional_items` or
  `after_expiration`. Each one can change `amount_total`. Then `amount_total` is not equal to the
  cart total, and `authorizePayment` refuses the payment.
- `client_reference_id` is up to 200 characters. A metadata value is up to 500 characters. A
  Medusa session id is shorter.
- `metadata[session_id]` is on the Checkout Session, so the webhook can read it.
  `payment_intent_data[metadata][session_id]` is on the PaymentIntent, so the owner sees the
  session id on the payment in the Dashboard.
- The `locale` parameter is not sent. Then Checkout uses the language of the browser. Checkout
  supports `id` (Indonesian).
- `customer_email` fills in the email on the hosted page. Stripe needs no other customer field.
  Thus `initiatePayment` does not throw for a missing customer field.

### The response

The response is a Checkout Session object. The provider reads these fields:

| Field          | Use                                                                               |
| -------------- | --------------------------------------------------------------------------------- |
| `id`           | The gateway payment id (`cs_test_...` or `cs_live_...`).                          |
| `url`          | The hosted page, for example `https://checkout.stripe.com/c/pay/cs_test_...#...`. |
| `amount_total` | The Stripe amount. It must be equal to the amount that the provider sent.         |
| `expires_at`   | The expiry, in seconds since the Unix epoch.                                      |
| `status`       | `open`.                                                                           |

`url` is present only while the session is active. Read it from the create response only.

### The return value

```ts
return {
  id: session.id,
  data: {
    payment_url: session.url,
    stripe_session_id: session.id,
    amount: rupiah, // whole rupiah, a number
    session_id: input.data.session_id,
    expires_at: session.expires_at,
  },
}
```

- `stripe_session_id` is the key of the gateway payment id. `authorizePayment`, `refundPayment`,
  `cancelPayment` and the recovery adapter read it.
- Throw a `MedusaError` of the type `UNEXPECTED_STATE` if the response has no `url`, if the `url`
  does not start with `https://`, or if `amount_total` is not equal to the Stripe amount that the
  provider sent. In the last case, expire the new session first, as `cancelPayment` does.
- The session has `payment_intent: null` at creation. Do not store a PaymentIntent id. See
  [Refund](#9-refund).

## 7. Payment status

`authorizePayment`, `getPaymentStatus`, `retrievePayment` and the recovery adapter make one request:
`GET {apiUrl}/v1/checkout/sessions/{stripe_session_id}`. It needs no body and no idempotency key.

The provider reads these fields of the response:

- `status`: `open` (payment not started), `complete` (the customer finished the page; the payment
  can still be in progress), or `expired`.
- `payment_status`: `paid` (the funds are available), `unpaid`, or `no_payment_required`.
- `amount_total`: the total in the Stripe unit, after discounts and taxes.
- `currency`: `idr`.

### The paid rule

The payment is paid when all these conditions are true:

1. `status` is `complete`.
2. `payment_status` is `paid`.
3. `currency` is `idr`.
4. `amount_total` is equal to `data.amount * 100`.

Source: the fulfillment guide checks `payment_status` before it fulfills an order. The session
object says that `complete` means "Payment processing may still be in progress". Thus `complete`
alone is not enough.

With Adaptive Pricing, the customer can pay in a different currency. `amount_total` and `currency`
still show the IDR amount, and `presentment_details` shows the currency of the customer (Adaptive
Pricing page). Thus the paid rule works with and without Adaptive Pricing.

### The map to Medusa

| `status`    | `payment_status`      | Meaning (from the docs)                                          | `authorizePayment`                  | `getPaymentStatus`                                  |
| ----------- | --------------------- | ---------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------- |
| `open`      | `unpaid`              | The customer has not paid yet.                                   | throw `PAYMENT_AUTHORIZATION_ERROR` | `pending`                                           |
| `complete`  | `paid`                | Paid. The funds are available.                                   | `captured` if the paid rule is true | `captured` if the paid rule is true, else `pending` |
| `complete`  | `unpaid`              | A delayed payment method (a bank transfer) is still in progress. | throw                               | `pending`                                           |
| `complete`  | `no_payment_required` | Only for `setup` mode or a billing anchor. Not for this flow.    | throw                               | `pending`                                           |
| `expired`   | `unpaid`              | The session expired, or the provider expired it.                 | throw                               | `canceled`                                          |
| any other   | any                   | A new status of Stripe.                                          | throw                               | `pending`                                           |
| HTTP 404    | none                  | `resource_missing`: the id is not in this account or this mode.  | throw                               | `pending`                                           |
| other error | none                  | A network error, a timeout, HTTP 401, 429 or 5xx.                | throw                               | `pending`                                           |
| no id       | none                  | `data.stripe_session_id` is absent. No request.                  | throw                               | `pending`                                           |

Notes on the map:

- A refund does not change `status` or `payment_status` of the session (**unverified**). Thus
  `getPaymentStatus` gives `captured` after a refund.
- After a delayed payment fails (`checkout.session.async_payment_failed`), the final values of
  `status` and `payment_status` are **unverified**. The map gives `pending`, and
  `authorizePayment` throws.
- "throw" in the map means `PAYMENT_AUTHORIZATION_ERROR`, also for an API error.
- `retrievePayment` returns `{ data: { ...input.data, gateway_status } }`. `gateway_status` is
  `session.status`, then `:`, then `session.payment_status`, for example `complete:paid`. For HTTP
  404, `gateway_status` is `not_found`. For each other API error, `retrievePayment` throws a
  `MedusaError` of the type `UNEXPECTED_STATE`.
- When `authorizePayment` throws for a different amount, write the error log of README.md with
  `stripe_session_id`, `amount_total` and `data.amount`.

### The recovery adapter

- `providerId`: `STRIPE_PROVIDER_ID`.
- `maxSessionsPerRun`: `10`. See [Rate limits](#12-rate-limits).
- `isSessionPaid(data)`:
  - Return `false` when `data.stripe_session_id` is absent.
  - Get the session. Return `true` when `status` is `complete` and `payment_status` is `paid`.
    Do not compare the amount here. A paid cart with a different amount then fails in
    `authorizePayment`, and the job sends the alert email to the owner.
  - Return `false` for HTTP 404. Throw for each other API error, so that the job skips the session
    for this run.
- `paymentReference(data)`: return `data.stripe_session_id`.

## 8. Webhook

Stripe signs each webhook. Thus the provider verifies the signature and uses the body. It does not
get the session again from the API.

### The webhook destination

Create one destination in each mode (sandbox and live):

1. Open Workbench → **Webhooks** (https://dashboard.stripe.com/webhooks).
2. Click **Create an event destination**.
3. Select **Your account**.
4. Select the payload format **Snapshot**. Do not select **Thin**. A thin event has no
   `data.object`, and this doc describes the snapshot format only.
5. Select the API version `2026-09-30.endive`, the same as `STRIPE_API_VERSION`.
6. Select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
7. Select **Webhook endpoint** as the destination type.
8. Set the endpoint URL `https://api.<domain>/hooks/payment/pp_stripe-checkout_stripe-checkout`.
   The URL must be public and use HTTPS with TLS 1.2 or 1.3.
9. Click **Reveal secret**. Copy the signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`.

A destination with no API version uses the default version of the account. The webhook docs say
that the version of the account at the time of the event gives the structure of a snapshot event.

### The payload

The body is an Event object (snapshot format). The fields that the provider reads:

| Field                             | Value                                                                      |
| --------------------------------- | -------------------------------------------------------------------------- |
| `type`                            | `checkout.session.completed` or `checkout.session.async_payment_succeeded` |
| `data.object.object`              | `checkout.session`                                                         |
| `data.object.id`                  | the Checkout Session id                                                    |
| `data.object.payment_status`      | `paid`, `unpaid` or `no_payment_required`                                  |
| `data.object.amount_total`        | the Stripe amount                                                          |
| `data.object.currency`            | `idr`                                                                      |
| `data.object.metadata.session_id` | the Medusa session id from `initiatePayment`                               |
| `data.object.client_reference_id` | the same Medusa session id                                                 |

- `checkout.session.completed` comes when the customer completes the page. For a card, the payment
  is then `paid`. For a delayed method, it is `unpaid`, and
  `checkout.session.async_payment_succeeded` comes later.
- An Event of another integration in the same Stripe account has no `metadata.session_id`. Ignore
  it.

### The verification

The header is `Stripe-Signature`. Node gives header names in lower case, so read
`payload.headers["stripe-signature"]`. The Medusa Stripe provider reads the same key. The value
is one line, for example:

```text
t=1760781600,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd,v0=6ffbb59b2300aae63f272406069a9788598b792a944a07aba816edb039989a39
```

Do these steps (the manual verification of the webhook docs, and `Webhooks.js` of the SDK):

1. If `STRIPE_WEBHOOK_SECRET` is empty, write a warning to the log and return `NOT_SUPPORTED`. If
   the header is absent, empty or not a string (Node can give a `string[]`), write an error to the
   log and return `NOT_SUPPORTED`.
2. Split the header on `,`. Split each item on the first `=`. Keep the value of `t` as the
   timestamp (an integer, seconds). Keep each value of `v1` as a signature. Ignore all other
   schemes, also `v0`.
3. If there is no `t` or no `v1`, return `NOT_SUPPORTED`.
4. Make the signed payload: the timestamp as a string, then `.`, then the raw body.
   Use `payload.rawData.toString("utf8")`. Do not use `JSON.stringify(payload.data)`. A changed
   body fails the check.
5. Compute HMAC-SHA256 of the signed payload with the full signing secret as the key, including
   the prefix `whsec_`. Encode the result as lowercase hex:
   `crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex")`.
6. Compare the result with each `v1` signature with `crypto.timingSafeEqual`. Compare only two
   buffers of the same length. One match is enough. While a secret is rolled, the header has one
   `v1` for each active secret.
7. If `Math.floor(Date.now() / 1000) - t` is more than 300, return `NOT_SUPPORTED`. The SDK uses a
   tolerance of 300 seconds. Do not use a tolerance of 0, because 0 turns off the check.

The Medusa route keeps the raw body (README.md, [The route](README.md#the-route)). The subscriber
calls the provider about 5 seconds after the request, so the 300 seconds are enough.

### The result

After the signature check, parse the raw body with `JSON.parse`. Then:

- If `type` is `checkout.session.completed` or `checkout.session.async_payment_succeeded`, and
  `data.object.payment_status` is `paid`, and `data.object.metadata.session_id` is a string, return:

  ```ts
  {
    action: PaymentActions.SUCCESSFUL,
    data: {
      session_id: object.metadata.session_id,
      amount: object.amount_total / 100,
    },
  }
  ```

- In each other case, return `{ action: PaymentActions.NOT_SUPPORTED }`.
- `amount_total / 100` converts the Stripe amount back to whole rupiah. It is the only division in
  the provider. It divides a Stripe amount, not a Medusa amount. See
  [Amount and currency](#11-amount-and-currency).
- Do not compare the amount here. `authorizePayment` compares it (README.md).
- The result does not check `data.object.object` or `data.object.currency`. The signature proves
  that the body comes from Stripe, and `authorizePayment` checks the currency and the amount.
- Do not throw. Write an error to the log for each failed check of steps 3 to 7 (no `t` or `v1`,
  no matching signature, an old `t`) and for a body that is not JSON. Do not write a log for a
  verified event that gives `NOT_SUPPORTED`, for example an unpaid session or a foreign event.

### Delivery

- Medusa returns HTTP 200 at once, also for a bad signature (README.md). Thus Stripe does not retry
  a webhook that the provider refuses.
- When the endpoint does not answer with `2xx`, Stripe retries for up to three days in live mode. In
  a sandbox, Stripe retries three times over a few hours.
- Stripe can send one event more than once, and the order of events is not fixed. A second
  `SUCCESSFUL` result for a cart that has an order changes nothing (README.md, The event).
- Checkout waits up to 10 seconds for the webhook response before it sends the customer to
  `success_url`. Medusa answers at once, so the customer does not wait.
- Stripe sends webhooks from a fixed list of IP addresses (https://docs.stripe.com/ips). The
  template does not filter by IP. The signature check is enough.

## 9. Refund

`refundPayment` makes two requests.

1. `GET {apiUrl}/v1/checkout/sessions/{stripe_session_id}`. Read `payment_intent` (a string, the
   PaymentIntent id `pi_...`). The session has `payment_intent: null` at creation, so the
   provider gets the id at refund time. If `payment_intent` is empty, throw a `MedusaError` of the
   type `UNEXPECTED_STATE`.
2. `POST {apiUrl}/v1/refunds` with this body:

| Parameter              | Value                                           |
| ---------------------- | ----------------------------------------------- |
| `payment_intent`       | the `payment_intent` from step 1                |
| `amount`               | `MathBN.convert(input.amount).toNumber() * 100` |
| `metadata[session_id]` | `data.session_id`                               |

Headers: `Idempotency-Key: <input.context.idempotency_key>` when it is present. Medusa 2.21.2 sets
this key to the id of the Medusa refund (`refundPaymentFromProvider_` in
`@medusajs/payment`, `dist/services/payment-module.js`). Thus each partial refund has its own key.

If `data.stripe_session_id` is absent, throw a `MedusaError` of the type `UNEXPECTED_STATE` with no
request.

The response is a Refund object. Read `id` (`re_...`) and `status`. Return
`{ data: { ...input.data, refund_ids: [...(input.data.refund_ids ?? []), refund.id] } }`.

Rules from the refund docs:

- A partial refund is allowed. More than one partial refund is allowed, until the total is
  refunded. A refund larger than the remaining amount fails.
- A refund of a refunded charge fails with the code `charge_already_refunded`.
- `status` is one of `pending`, `requires_action`, `succeeded`, `failed` and `canceled`. Accept
  `pending`, `requires_action` and `succeeded`. For `failed` or `canceled`, throw a `MedusaError` of
  the type `UNEXPECTED_STATE`.
- A refund uses the available Stripe balance. If the balance is too low, a card refund stays
  `pending` until the balance is enough. A refund for another method fails.
- A refund can fail later (`refund.failed` event). The provider does not listen to it. The owner
  sees it in the Dashboard.
- With Adaptive Pricing, the refund is in IDR, and Stripe refunds the customer in the currency of
  the payment.
- For an HTTP error, throw a `MedusaError` of the type `UNEXPECTED_STATE` with the error message of
  Stripe. Medusa Admin shows it.

## 10. Expiry, cancellation and update

### Expiry

- `expires_at` can be from 30 minutes to 24 hours after creation. The default is 24 hours.
- The template uses 1 hour (`now + 3600`). This is a choice of the template, not a fact of Stripe.
- After the expiry, `status` is `expired`, and the hosted page shows a message that the session
  expired.
- Do not send `after_expiration[recovery][enabled]`. It makes a new session that the provider does
  not know.

### Cancellation

`cancelPayment` and `deletePayment` make one request:
`POST {apiUrl}/v1/checkout/sessions/{stripe_session_id}/expire`, with no body.

- Stripe can expire a session only when `status` is `open`. For another status, the request gets
  an error.
- Do not throw for an error. Write a warning to the log and return `{ data: input.data }`.
  README.md gives this rule.
- Do not cancel the PaymentIntent. The session object says that you cannot cancel the
  PaymentIntent of a Checkout Session. Expire the session instead.
- If `stripe_session_id` is absent in `data`, return `{ data: input.data }` with no request.
- Medusa can call `cancelPayment` for a paid session, for example when the save of an authorized
  payment fails (README.md). The expire then fails. Do not refund in the provider. Write a warning
  with `stripe_session_id`. The owner refunds in the Stripe Dashboard if necessary.

### Update

`updatePayment`:

1. Do the currency and amount checks of `initiatePayment`.
2. Get the old session. If its `status` is `complete`, throw a `MedusaError` of the type
   `UNEXPECTED_STATE`. The customer can have paid, and a new session can charge the customer two
   times.
3. Expire the old session, as `cancelPayment` does.
4. Create a new session for `input.amount`, as `initiatePayment` does. Use `input.data.session_id`
   as the session id. Do not send `Idempotency-Key`.
5. Return `{ data: { ...input.data, <the five keys of the new session> } }`. The spread keeps
   `customer`.

The update API of Checkout Sessions cannot change the amount of a `hosted_page` session. The
changelog adds line item updates only for a custom UI (**unverified** for `hosted_page`).

## 11. Amount and currency

Stripe treats IDR as a two-decimal currency. IDR is not in the list of zero-decimal currencies and
not in the special cases (ISK, HUF, TWD, UGX) on the currencies page. Each amount in the API is in
the minor unit, 1/100 of a rupiah.

The one formula:

```ts
const stripeAmount = MathBN.convert(input.amount).toNumber() * 100
```

Example: a cart total of Rp 95.000. Medusa gives `95000`. The provider sends
`unit_amount=9500000`. The session has `amount_total: 9500000`. The webhook result has
`amount: 9500000 / 100 = 95000`.

- The provider multiplies. It never divides a Medusa amount by 100. The webhook result divides a
  Stripe amount by 100, which README.md allows ([The result](README.md#the-result)).
- The Medusa Stripe provider uses the same rule: `getSmallestUnit` in
  `@medusajs/payment-stripe` multiplies IDR by 100.
- A Medusa amount in whole rupiah gives a Stripe amount that ends in `00`. The division in the
  webhook result thus gives a whole number. This is true only when the session has no discount, tax
  or shipping from Stripe. See the "Do not send" note in
  [Create a hosted payment](#6-create-a-hosted-payment).
- Compare in the Stripe unit: `session.amount_total === data.amount * 100`.
- Send `currency=idr` in lower case. The response has `currency: "idr"`.

### Minimum and maximum

- The minimum depends on the settlement currency of the account. The currencies page lists
  `0.50 IDR` for an IDR account. A charge that Stripe converts to another settlement currency must
  be at least the minimum of that currency, for example `0.50 USD` or `0.50 SGD`. The rupiah value
  of that minimum changes with the exchange rate. A smaller amount fails with the code
  `amount_too_small`.
- Card payments: up to 12 digits in the minor unit, so up to Rp 9.999.999.999. American Express:
  up to 9 digits "in most currencies", so up to Rp 9.999.999 (**unverified** for IDR).
- Other payment methods: up to 12 digits for IDR. A payment method can have a lower limit of its
  own.
- Card networks can have lower limits for a currency or a region.

## 12. Rate limits

- Live mode: 100 requests per second for the account. Sandbox: 25 requests per second.
- Each endpoint: 25 requests per second, for example `GET /v1/checkout/sessions/{id}`.
- Live mode: at most 50 requests in progress at the same time.
- A limited request gets HTTP 429 with the header `Stripe-Rate-Limited-Reason`. A 429 with the code
  `lock_timeout` is not a rate limit, but you can retry it.
- Read allocation: on average at most 500 `GET` requests for each transaction, over the last 30
  days. Each account gets at least 10,000 `GET` requests each month.
- `maxSessionsPerRun` of the recovery adapter: use `10`. This is a choice of the template, not a
  fact of Stripe. The job calls `isSessionPaid` one session at a time. Thus one run makes at most
  10 `GET` requests.
- The recovery job checks a pending session each 15 minutes for 48 hours, also after the Stripe
  session expires. One abandoned session can thus cost up to 192 `GET` requests. With many
  abandoned carts and few orders, watch the read allocation in the Dashboard.
- Give each call a timeout of 10 seconds (`AbortSignal.timeout(10_000)`), as README.md says.

## 13. Sandbox tests

Use a sandbox key (`sk_test_...` or `rk_test_...`). Do not use real card data in a sandbox.

| Card number           | Result                                                           |
| --------------------- | ---------------------------------------------------------------- |
| `4242 4242 4242 4242` | The payment succeeds.                                            |
| `4000 0000 0000 0002` | The card is declined (`generic_decline`).                        |
| `4000 0000 0000 9995` | The card is declined (`insufficient_funds`).                     |
| `4000 0027 6000 3184` | 3D Secure on each payment. The hosted page shows the challenge.  |
| `4000 0000 0000 0077` | The payment succeeds, and the funds go to the available balance. |

For each card, use any future expiry date and any 3-digit CVC (4 digits for American Express).

The tests:

1. Pay with `4242 4242 4242 4242`. The browser comes back to `/checkout/return`. The order opens.
2. Pay with `4000 0000 0000 0002`. The hosted page shows the decline. The session stays `open`.
   Then pay with `4242 4242 4242 4242` on the same page.
3. Pay with `4000 0027 6000 3184`. Complete the 3D Secure challenge.
4. Open the hosted page and close the browser before you pay. The cart stays a cart. After 1 hour,
   the session is `expired`.
5. Refund: pay with `4000 0000 0000 0077`, so that the sandbox balance can pay the refund. Then
   refund a part in Medusa Admin, and then the rest.
6. Check that the hosted page shows IDR for the account country of the client. It is
   **unverified** that each account country can present IDR.

Webhook tests:

- With a public HTTPS host, use the destination of [Webhook](#8-webhook).
- Without a public host, use the Stripe CLI. Run
  `stripe listen --forward-to localhost:9000/hooks/payment/pp_stripe-checkout_stripe-checkout`.
  The command prints a signing secret (`whsec_...`). Put it in `STRIPE_WEBHOOK_SECRET` of
  `apps/backend/.env`. This secret is different from the secret of a Dashboard destination.
- With the Stripe CLI, Checkout sends the customer to `success_url` at once. It does not wait for
  the webhook.
- `stripe trigger checkout.session.completed` makes a session that has no `metadata.session_id`. The
  provider returns `NOT_SUPPORTED` for it. Use a real checkout for the test.

## 14. Traps

- **Indonesian accounts.** A Stripe account in Indonesia accepts only Indonesian bank transfers
  through the PaymentIntents API. Ask for the country of the account before you build. See
  [Who can use Stripe in Indonesia](#who-can-use-stripe-in-indonesia).
- **IDR is not zero-decimal.** Multiply the rupiah amount by 100. Without it, the customer pays
  1/100 of the total.
- **API version.** Always send `Stripe-Version`. Without it, the default version of the account
  applies, and a breaking change can arrive without a code change. Examples: `ui_mode` `hosted`
  became `hosted_page` in `2026-03-25.dahlia`, and `payment_method_types` gives HTTP 400 from
  `2026-09-30.endive`.
- **`complete` is not paid.** Check `payment_status === "paid"`. A delayed payment method gives
  `complete` and `unpaid`.
- **The raw body.** Compute the signature from `rawData`, not from the parsed body.
- **Lower-case header.** Read `headers["stripe-signature"]`.
- **The full secret.** The HMAC key is the full `whsec_...` string. Do not remove the prefix.
- **One secret for each destination and mode.** The sandbox destination, the live destination and
  the Stripe CLI each have a different signing secret.
- **Snapshot, not thin.** A thin event has no `data.object`. Select **Snapshot**.
- **No PaymentIntent at creation.** The create response has `payment_intent: null`. Get it from the
  session at refund time.
- **`url` disappears.** `url` is present only while the session is active. Store it at creation.
- **Stripe-side totals.** Promotion codes, discounts, automatic tax, Stripe shipping and adjustable
  quantities change `amount_total`. Then `authorizePayment` refuses each payment. Do not turn them
  on in the request.
- **Idempotency key reuse.** The same `Idempotency-Key` with different parameters fails within 24
  hours. A create request sends no key, because `expires_at` changes. Only the refund request
  sends a key, the Medusa refund id.
- **Refund balance.** A refund needs an available balance. In a sandbox, pay with
  `4000 0000 0000 0077` before you test a refund.
- **Minimum amount.** The minimum follows the settlement currency, not IDR, when Stripe converts the
  charge. A small cart can fail with `amount_too_small`.
- **The SDK uses its own HTTP client.** Use `fetch`, or the test mocks do not catch the calls.
- **Sandbox retries.** A sandbox retries a failed webhook only three times in a few hours.
- **No webhook without a signature.** Stripe signs each webhook, so the provider never needs to get
  the session again in `getWebhookActionAndData`. If the signing secret is empty, each webhook gives
  `NOT_SUPPORTED`. The return page and the recovery job still complete the cart.
- **A different amount.** If the amount differs, `authorizePayment` keeps throwing
  `PAYMENT_AUTHORIZATION_ERROR`. The webhook result does not compare the amount.

## 15. Example JSON for test mocks

The examples below have only the fields that the provider reads, and a few more. A real object
has more fields. The ids, the times and the hash part of `url` are examples.

### Create a Checkout Session: HTTP 200

`POST /v1/checkout/sessions`

```json
{
  "id": "cs_test_a1b2c3",
  "object": "checkout.session",
  "amount_subtotal": 9500000,
  "amount_total": 9500000,
  "cancel_url": null,
  "client_reference_id": "payses_01JTEST",
  "currency": "idr",
  "customer_email": "budi@example.com",
  "expires_at": 1760785200,
  "livemode": false,
  "metadata": { "session_id": "payses_01JTEST" },
  "mode": "payment",
  "payment_intent": null,
  "payment_status": "unpaid",
  "status": "open",
  "success_url": "https://store.example.com/checkout/return",
  "ui_mode": "hosted_page",
  "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3#fidkdWxOYHwnPyd1blpxYHZxWjA0"
}
```

### Retrieve a Checkout Session: open

`GET /v1/checkout/sessions/cs_test_a1b2c3`

```json
{
  "id": "cs_test_a1b2c3",
  "object": "checkout.session",
  "amount_total": 9500000,
  "client_reference_id": "payses_01JTEST",
  "currency": "idr",
  "expires_at": 1760785200,
  "metadata": { "session_id": "payses_01JTEST" },
  "mode": "payment",
  "payment_intent": null,
  "payment_status": "unpaid",
  "status": "open",
  "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3#fidkdWxOYHwnPyd1blpxYHZxWjA0"
}
```

### Retrieve a Checkout Session: paid

```json
{
  "id": "cs_test_a1b2c3",
  "object": "checkout.session",
  "amount_total": 9500000,
  "client_reference_id": "payses_01JTEST",
  "currency": "idr",
  "expires_at": 1760785200,
  "metadata": { "session_id": "payses_01JTEST" },
  "mode": "payment",
  "payment_intent": "pi_3TEST000000000001",
  "payment_status": "paid",
  "status": "complete",
  "url": null
}
```

For the "different amount" test, use the same JSON with `"amount_total": 9000000`.

### Retrieve a Checkout Session: expired

```json
{
  "id": "cs_test_a1b2c3",
  "object": "checkout.session",
  "amount_total": 9500000,
  "currency": "idr",
  "metadata": { "session_id": "payses_01JTEST" },
  "mode": "payment",
  "payment_intent": null,
  "payment_status": "unpaid",
  "status": "expired",
  "url": null
}
```

The expire request (`POST /v1/checkout/sessions/cs_test_a1b2c3/expire`) returns the same object
with `"status": "expired"`.

### Unknown session: HTTP 404

The `code` comes from the error codes page. The `message` and `param` are **unverified**.

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "resource_missing",
    "message": "No such checkout.session: 'cs_test_missing'",
    "param": "session"
  }
}
```

### Expire a session that is not open: HTTP 400

The exact `code` and `message` are **unverified**.

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "This Checkout Session is not in an expireable state."
  }
}
```

### Create a refund: HTTP 200

`POST /v1/refunds`

```json
{
  "id": "re_3TEST000000000001",
  "object": "refund",
  "amount": 5000000,
  "charge": "ch_3TEST000000000001",
  "created": 1760782000,
  "currency": "idr",
  "metadata": { "session_id": "payses_01JTEST" },
  "payment_intent": "pi_3TEST000000000001",
  "reason": null,
  "status": "succeeded"
}
```

### Refund more than the remaining amount: HTTP 400

The exact `code` and `message` are **unverified**.

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Refund amount is greater than unrefunded amount on charge.",
    "param": "amount"
  }
}
```

### Webhook event: `checkout.session.completed`

```json
{
  "id": "evt_1TEST000000000001",
  "object": "event",
  "api_version": "2026-09-30.endive",
  "created": 1760781600,
  "livemode": false,
  "pending_webhooks": 1,
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1b2c3",
      "object": "checkout.session",
      "amount_total": 9500000,
      "client_reference_id": "payses_01JTEST",
      "currency": "idr",
      "metadata": { "session_id": "payses_01JTEST" },
      "mode": "payment",
      "payment_intent": "pi_3TEST000000000001",
      "payment_status": "paid",
      "status": "complete"
    }
  }
}
```

The expected result is
`{ action: PaymentActions.SUCCESSFUL, data: { session_id: "payses_01JTEST", amount: 95000 } }`.

For `checkout.session.async_payment_succeeded`, use the same JSON with that `type`. For a delayed
method that is still in progress, use `checkout.session.completed` with
`"payment_status": "unpaid"`. The result is `NOT_SUPPORTED`.

### Make a signed test request

The unit test makes a valid header with the test secret of `.env.test`:

```ts
import crypto from "node:crypto"

const rawBody = JSON.stringify(event)
const t = Math.floor(Date.now() / 1000)
const v1 = crypto
  .createHmac("sha256", "whsec_test_fake")
  .update(`${t}.${rawBody}`, "utf8")
  .digest("hex")

const payload = {
  data: JSON.parse(rawBody),
  rawData: Buffer.from(rawBody, "utf8"),
  headers: { "stripe-signature": `t=${t},v1=${v1}` },
}
```

Test cases for the signature:

- The header above: `SUCCESSFUL`.
- `v1` computed with another secret: `NOT_SUPPORTED`.
- `t` 301 seconds in the past, with a correct `v1` for that `t`: `NOT_SUPPORTED`.
- A changed `rawData` (for example one more space): `NOT_SUPPORTED`.
- No `stripe-signature` header: `NOT_SUPPORTED`.
- Only a `v0` signature: `NOT_SUPPORTED`.

### The fetch mock

The fetch mock of README.md serves the origin `https://stripe-checkout.test`:

| Method and path                         | Answer                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `POST /v1/checkout/sessions`            | Parse the body with `URLSearchParams`. Store a session. Return it. |
| `GET /v1/checkout/sessions/:id`         | The stored session, or HTTP 404 with `resource_missing`.           |
| `POST /v1/checkout/sessions/:id/expire` | `status: "expired"` if it was `open`, else HTTP 400.               |
| `POST /v1/refunds`                      | A Refund object with the `amount` of the body.                     |

The mock rules:

- A new session gets the id `cs_test_<n>`, with a counter `n`, and the `url`
  `https://checkout.stripe.com/c/pay/cs_test_<n>`.
- The mock sets `amount_total` from `line_items[0][price_data][unit_amount]` times
  `line_items[0][quantity]`, and copies `currency`, `client_reference_id` and `metadata`.
- `POST /v1/refunds` for an unknown `payment_intent`: HTTP 404 with `resource_missing`.
- An unknown path on the mock origin: HTTP 404 with `resource_missing`.
- The helpers:
  - `markPaid(id)`: sets `status: "complete"`, `payment_status: "paid"` and
    `payment_intent: "pi_test_<n>"`.
  - `setAmountTotal(id, amount)`: sets `amount_total` (in the Stripe unit).
  - `getSession(id)`: returns the stored session, so that a test can check `status: "expired"`.
  - `restore()`: puts back the original `fetch`.
