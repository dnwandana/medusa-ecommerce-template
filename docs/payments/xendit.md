# Xendit payment gateway

Checked on: 2026-10-18

This document gives the facts of the Xendit API for a Xendit provider in this template. Read
[README.md](README.md) first. The README gives the contract, the procedure and the tests. This
document gives only the Xendit part.

| Item            | Value                                                           |
| --------------- | --------------------------------------------------------------- |
| `<slug>`        | `xendit`                                                        |
| `<provider_id>` | `pp_xendit_xendit`                                              |
| `<Name>`        | `Xendit` (class `XenditProviderService`)                        |
| `<name>`        | `xendit` (function `xenditClientOptions(env)`)                  |
| `<GATEWAY>`     | `XENDIT` (constant `XENDIT_PROVIDER_ID`)                        |
| Module path     | `apps/backend/src/modules/xendit`                               |
| Xendit product  | Payment Sessions, `session_type: "PAY"`, `mode: "PAYMENT_LINK"` |
| Webhook rule    | Token check, then get the session and the payment from the API  |

## 1. Sources

Official Xendit documentation. Each page also has a Markdown copy: add `.md` to the URL.

- Documentation index: https://docs.xendit.co/llms.txt
- Choose your integration: https://docs.xendit.co/docs/available-payment-products
- How payment sessions work: https://docs.xendit.co/docs/how-payment-sessions-work
- Payment Sessions overview: https://docs.xendit.co/docs/payment-sessions-overview
- One Time Payment (a session in IDR): https://docs.xendit.co/docs/payment-1
- Migrate from (legacy) Payment Links/Invoice to Payment Session:
  https://docs.xendit.co/docs/migrate-to-payment-session
- Create a session: https://docs.xendit.co/apidocs/create-session
- Get the status of a session: https://docs.xendit.co/apidocs/get-session
- Cancel a session: https://docs.xendit.co/apidocs/cancel-session
- Session webhook:
  https://docs.xendit.co/apidocs/webhook-notification-sent-defined-webhook-url-updates-payment-session
- Get the status of a payment: https://docs.xendit.co/apidocs/get-payment
- Payment webhook notification: https://docs.xendit.co/apidocs/payment-webhook-notification
- Refund a payment request: https://docs.xendit.co/apidocs/refund-payment-request
- Refund Payment (guide): https://docs.xendit.co/docs/refund-payment-request
- Refund webhook notification: https://docs.xendit.co/apidocs/refund-webhook-notification
- Simulate payment [test mode]: https://docs.xendit.co/apidocs/simulate-payment-test-mode
- Simulate card scenarios (test cards): https://docs.xendit.co/docs/cards-simulate-card-scenarios
- Available payment methods (limits and refund support of each channel):
  https://docs.xendit.co/docs/available-payment-methods
- Quick setup (authentication): https://docs.xendit.co/apidocs/quick-setup
- API keys: https://docs.xendit.co/docs/api-keys
- Pre-integration checklist (webhook topics, channels):
  https://docs.xendit.co/docs/payments-integration-setup
- Handling webhooks: https://docs.xendit.co/docs/handling-webhooks
- Webhook behavior (retries): https://docs.xendit.co/apidocs/webhook-behavior
- Delayed webhooks: https://docs.xendit.co/docs/delayed-webhooks
- Integration security: https://docs.xendit.co/docs/integration-security
- Rate limits: https://docs.xendit.co/apidocs/rate-limits
- Create account: https://docs.xendit.co/docs/create-account
- Your dashboard (test mode and live mode): https://docs.xendit.co/docs/your-dashboard
- Activate payment methods: https://docs.xendit.co/docs/activate-payment-methods

Official SDK source, used only where the docs are not clear:

- `xendit/xendit-node` v7.0.0, `refund/apis/Refund.ts`:
  https://github.com/xendit/xendit-node/blob/master/refund/apis/Refund.ts

### Why Payment Sessions and not the Invoice API

- Xendit calls the Invoice API (`POST /v2/invoices`) the "legacy Payment Link (previously called
  Invoice)". Xendit gives a migration guide from it to Payment Sessions.
- The migration guide says that the legacy Payment Link has "a limited, older set of payment
  channels". Payment Sessions give "every channel Xendit supports".
- A Payment Session with `mode: "PAYMENT_LINK"` returns `payment_link_url`. This is the URL of the
  Xendit hosted checkout page. Thus it fits the redirect flow of the README.
- `mode: "COMPONENTS"` embeds the payment fields in the storefront. The template has no embedded
  payment forms. Do not use it.
- The official Node SDK (`xendit-node` v7.0.0) has no client for Payment Sessions. Call the REST API
  with the global `fetch`, as the README says.

## 2. Check before you build

Check these pages again before you write code. APIs change.

- Open each page of section 1. The API reference pages have an OpenAPI block. Compare the fields of
  this document with that block.
- Look again at the migration guide. If Xendit marks Payment Sessions as legacy, stop and choose the
  product that Xendit recommends.
- Look again at the `xendit-node` repository. If it now has a Payment Sessions client, you can still
  use `fetch`. The tests replace `global.fetch`.

## 3. Account and dashboard setup

1. Sign up at https://dashboard.xendit.co/register/. Verify your email. The new account opens in
   **Test Mode**. Test Mode uses virtual money.
2. To switch the mode, click the business name in the bottom left corner of the dashboard. Then
   toggle **Switch to Test / Live Mode**. Live Mode is available only after Xendit verifies the
   business. The page "Create account" says that the verification takes up to 14 working days.
3. In Test Mode, go to **Settings > Developers > API Keys**. Click **Generate Secret Key**. Give the
   key the `Write` permission for the money-in products. The page "API keys" recommends this
   permission for money-in. Copy the key into `XENDIT_SECRET_KEY`. A new account has no secret key.
   You must generate one.
4. Go to **Settings > Developers > Webhooks**
   (https://dashboard.xendit.co/settings/developers#webhooks). Find the topic **Payment Session –
   Completed**. Enter `https://<public host>/hooks/payment/pp_xendit_xendit`. Click **Test & Save**.
   Then open the backend log. The test webhook has no real session, so the provider logs an error
   from `GET /sessions` (HTTP 404). If the provider logs a bad or absent token instead, the session
   webhook has no `x-callback-token` header. See section 8.
5. On the same page, copy the webhook verification token into `XENDIT_WEBHOOK_TOKEN`. Xendit puts
   this token in the header `x-callback-token` of each webhook.
6. Do not set a URL for the other topics, for example the refund topics or **Payment Session –
   Expired**. The provider ignores them. If you set them, the provider returns `NOT_SUPPORTED`.
7. The redirect URL comes from the API request (`success_return_url` and `cancel_return_url`). The
   dashboard has no redirect URL setting for a session.
8. Payment channels: in Test Mode, all channels are available by default. In Live Mode, activate
   each channel in **Payment Channels > Activate Payment Channels**. A channel that is not active
   fails in production.
9. Before production, do steps 3 to 5 again in Live Mode. The live key and the live webhook settings
   are different from the test key and settings. **Unverified:** whether the webhook token in Live
   Mode is a different value from the token in Test Mode. Copy the token of each mode.

## 4. Environment variables

| Key                    | Purpose                                         | Development value                    | `.env.test` value     | Production value        |
| ---------------------- | ----------------------------------------------- | ------------------------------------ | --------------------- | ----------------------- |
| `XENDIT_API_URL`       | Base URL of the API                             | `https://api.xendit.co`              | `https://xendit.test` | `https://api.xendit.co` |
| `XENDIT_SECRET_KEY`    | Secret API key. Basic auth user name.           | empty (put the test key in `.env`)   | `xnd_test_fake_key`   | `change-me`             |
| `XENDIT_WEBHOOK_TOKEN` | Webhook verification token (`x-callback-token`) | empty (put the test token in `.env`) | `xendit-test-token`   | `change-me`             |

- The test mode and the live mode use the same base URL. The key selects the mode. See section 5.
- The `.env.example` comment for `XENDIT_SECRET_KEY` names **Settings > Developers > API Keys**. The
  comment for `XENDIT_WEBHOOK_TOKEN` names **Settings > Developers > Webhooks**.
- `client.ts`:

```ts
export function xenditClientOptions(env: Record<string, string | undefined>) {
  return {
    apiUrl: env.XENDIT_API_URL || "https://api.xendit.co",
    secretKey: env.XENDIT_SECRET_KEY || "",
  }
}
```

- `paymentModule(env)`. The webhook token is an option of the service only. The recovery adapter
  does not need it.

```ts
{
  resolve: "./src/modules/xendit",
  id: "xendit",
  options: {
    storefrontUrl: env.STOREFRONT_URL,
    webhookToken: env.XENDIT_WEBHOOK_TOKEN || "",
    ...xenditClientOptions(env),
  },
}
```

- `validateOptions` throws for an empty `storefrontUrl` or an empty `apiUrl`. It does not check
  `secretKey` or `webhookToken`. See the README.
- The checkout label keys of the README (section "Checkout label"). This document proposes these
  texts. The client can change them:
  - `checkout.paymentProviders.pp_xendit_xendit`: `"Xendit"` in `en.json` and in `id.json`.
  - `checkout.paymentHints.pp_xendit_xendit`:
    `"Pay with a card, an e-wallet, QRIS or a virtual account."` in `en.json`, and
    `"Bayar dengan kartu, e-wallet, QRIS, atau virtual account."` in `id.json`.

## 5. Base URLs and authentication

- Base URL: `https://api.xendit.co`. The same URL serves the test mode and the live mode. "All API
  requests exist in either test or live mode", and each mode has its own keys.
- Use only the secret key on the server. Never send it to the browser and never put it in the
  session data.
- Authentication: HTTP Basic. The user name is the secret key. The password is empty. Thus the
  header is:

```ts
const auth = "Basic " + Buffer.from(`${secretKey}:`).toString("base64")
headers: { Authorization: auth, "Content-Type": "application/json" }
```

- `xendit-node` builds the same header: `"Basic " + btoa(this.secretKey + ":")` (`Refund.ts`, line
  94).
- All requests must use HTTPS.
- The `GET /v3/payments/{payment_id}` endpoint accepts the header `api-version: 2024-11-11`. Send
  it. The session endpoints and `POST /refunds` define no `api-version` header.
- Send `Content-Type: application/json` only with a request body. `POST /sessions/{id}/cancel` has
  no body. **Unverified:** whether Xendit refuses an empty body with this header.
- Remove a trailing slash from `apiUrl` before you add a path.
- Accept each 2xx status as a success (`response.ok`). The documented statuses are 201 for
  `POST /sessions` and 200 for the other calls.
- Read an error body with `response.text()`, then try `JSON.parse`. A gateway error, for example an
  HTML page with HTTP 502, is not JSON. Then put the HTTP status and the first 200 characters of the
  text in the error.
- A wrong or missing key gives HTTP 401 with `error_code: "INVALID_API_KEY"`.
- An error body has `error_code` (string), `message` (string) and an optional `errors` array. Put
  `error_code` and `message` in the `MedusaError` message.

The calls of `client.ts`:

| Method          | HTTP call                                    | Section |
| --------------- | -------------------------------------------- | ------- |
| `createSession` | `POST /sessions`                             | 6       |
| `getSession`    | `GET /sessions/{payment_session_id}`         | 7       |
| `getPayment`    | `GET /v3/payments/{payment_id}`              | 7       |
| `cancelSession` | `POST /sessions/{payment_session_id}/cancel` | 10      |
| `createRefund`  | `POST /refunds`                              | 9       |

## 6. Create a hosted payment

`initiatePayment` calls `POST {apiUrl}/sessions`.

The request body:

```json
{
  "reference_id": "<input.data.session_id>",
  "session_type": "PAY",
  "mode": "PAYMENT_LINK",
  "amount": 150000,
  "currency": "IDR",
  "country": "ID",
  "capture_method": "AUTOMATIC",
  "allow_save_payment_method": "DISABLED",
  "description": "Order payment",
  "success_return_url": "https://shop.example.com/checkout/return",
  "cancel_return_url": "https://shop.example.com/checkout/return"
}
```

The fields:

- `reference_id` (required, string, 1 to 64 characters): the Medusa payment session id,
  `input.data.session_id`, for example `payses_01JABCDEFGHJKMNPQRSTVWXYZ0`. Medusa makes this id
  from the prefix `payses_` and a ULID (`@medusajs/payment`, model `payment-session`), so it has 33
  characters. Xendit describes it as "your reference to uniquely identify the Payment Session". The
  webhook path reads it back from the API as `session_id`.
- `session_type` (required): `"PAY"`, a one-time payment.
- `mode` (required): `"PAYMENT_LINK"`, the hosted checkout page.
- `amount` (required, number): the cart total in whole rupiah. See section 11. It must be greater
  than 0 for `PAY`.
- `currency` (required): `"IDR"`. `country` (required): `"ID"`.
- `capture_method`: `"AUTOMATIC"`. The payment takes the money at once. This matches the `captured`
  status of the README.
- `allow_save_payment_method`: `"DISABLED"`. The template saves no payment method.
- `description` (1 to 1000 characters): text on the hosted page. Optional. Send the fixed text
  `"Order payment"`. The provider does not know the order number yet, and it does not know the
  locale of the customer.
- `success_return_url` and `cancel_return_url`: both `${storefrontUrl}/checkout/return`, with no
  trailing slash before `/checkout`. Xendit sends the customer to this URL "after the session is
  completed or expired, or if the customer decide to stop the payment process". Both URLs must be
  HTTPS. The error list of "Create a session" says: `INVALID_URL` - "A URL field (e.g.
  `success_return_url`, `cancel_return_url`) is not a valid HTTPS URL". It is an HTTP 400 error. See
  section 14.
- **Unverified:** the session status after the customer stops the payment and goes to
  `cancel_return_url`. The status is probably still `ACTIVE`. Then the return page shows "pending",
  and the session expires later.
- Do not send `customer` or `customer_id`. For `PAY` with `allow_save_payment_method: "DISABLED"`,
  Xendit does not require a customer (`MISSING_CUSTOMER` applies only to `SAVE`, `OPTIONAL` and
  `FORCED`). The reasons are in section 14. Thus `initiatePayment` never throws for a missing
  customer field.
- Do not send `expires_at`. The session then expires 30 minutes after creation. See section 10.
- Do not send `metadata`, `items` or `allowed_payment_channels`. With no `allowed_payment_channels`,
  the hosted page shows all channels that are active for the account.
- **Unverified:** the language of the hosted page. `locale` is an ISO 639-1 code with the default
  `en` (schema of "Create a session"). The docs do not list the other values. Do not send it until a
  sandbox test shows that `id` works.
- The spec defines no idempotency header for `POST /sessions`. Send none.

The response is HTTP 201. The fields that the provider uses:

| Field                | Example                       | Use                                                                                                                   |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `payment_session_id` | `ps-67527107dda8b2513acdaef0` | The gateway payment id. The schema gives 27 characters.                                                               |
| `payment_link_url`   | `https://dev.xen.to/qZx5RD_7` | The URL of the hosted page.                                                                                           |
| `status`             | `ACTIVE`                      | Always `ACTIVE` after creation.                                                                                       |
| `amount`             | `150000`                      | Equal to the request.                                                                                                 |
| `expires_at`         | `2024-12-06T04:05:35.049Z`    | The expiry time.                                                                                                      |
| `expires_ttl`        | `1800`                        | Seconds to the expiry. The schema says: present for `ACTIVE`, 0 for `EXPIRED`, absent for `CANCELED` and `COMPLETED`. |

- The `payment_link_url` examples of Xendit: `https://checkout.xendit.co/sessions/ps-...` or
  `https://xen.to/...` in live mode. `https://checkout-staging.xendit.co/sessions/ps-...` or
  `https://dev.xen.to/...` in test mode. The schema says that the field "can be null". If it is null
  or does not start with `https://`, throw `UNEXPECTED_STATE`.

`initiatePayment` returns:

```ts
return {
  id: session.payment_session_id,
  data: {
    payment_url: session.payment_link_url,
    xendit_session_id: session.payment_session_id,
    amount, // whole rupiah, the number that the request sent
    session_id: input.data.session_id,
    expires_at: session.expires_at,
  },
}
```

- The key of the gateway payment id is `xendit_session_id`. The other methods and the recovery
  adapter read it.
- Errors of `POST /sessions` (HTTP 400): `API_VALIDATION_ERROR`, `INVALID_AMOUNT`,
  `INVALID_PAYMENT_CHANNEL`, `INVALID_CURRENCY`, `INVALID_COUNTRY`, `INVALID_URL`,
  `INVALID_EXPIRY_DATE`, `MISSING_CUSTOMER`, and others. HTTP 401: `INVALID_API_KEY`. Throw
  `UNEXPECTED_STATE` for each of them, as the README says.

## 7. Payment status

Xendit has two objects. The session tells if the customer completed the checkout. The payment tells
if the money moved. The migration guide says: "treat the Session's own status field as the lifecycle
source of truth ... and treat the underlying Payment object's status as the transaction source of
truth". Thus the provider checks both.

### The paid check

Put this check in `client.ts`, as a method of the client:
`checkSession(data: { xendit_session_id, session_id, amount })`. The recovery adapter has no service
and no logger, so the check must not log. It returns a result object, and the caller logs.

The result:

```ts
type XenditCheck =
  | { state: "paid"; session: XenditSession; payment: XenditPayment }
  | { state: "open"; session: XenditSession } // ACTIVE, or COMPLETED but the payment is not final
  | { state: "closed"; session: XenditSession } // EXPIRED or CANCELED, or the payment failed
  | { state: "mismatch"; session: XenditSession; payment?: XenditPayment; reason: string }
```

The steps:

1. Call `GET {apiUrl}/sessions/{data.xendit_session_id}`. A failed call throws.
2. If `status` is `"EXPIRED"` or `"CANCELED"`, return `closed`.
3. If `status` is `"ACTIVE"`, return `open`. An `ACTIVE` session can have a `payment_id` after a
   failed attempt. Ignore it.
4. Now `status` is `"COMPLETED"`. Return `mismatch` with a reason when one of these is false:
   - `reference_id` is equal to `data.session_id`.
   - `currency` is `"IDR"`.
   - `amount` is equal to `data.amount`.
   - `payment_id` is not null.
5. Call `GET {apiUrl}/v3/payments/{payment_id}` with the header `api-version: 2024-11-11`. A failed
   call throws.
6. If the payment `status` is `"FAILED"`, `"EXPIRED"` or `"CANCELED"`, return `closed`.
7. If the payment `status` is `"PENDING"` or `"AUTHORIZED"`, return `open`.
8. Now the payment `status` is `"SUCCEEDED"`. Return `mismatch` with a reason when one of these is
   false:
   - `currency` is `"IDR"`.
   - `request_amount` is equal to `data.amount`.
   - If `captures` is a non-empty array, the sum of `captures[].capture_amount` is equal to
     `data.amount`. **Unverified:** whether each channel fills `captures`. The official examples
     (`DANA`, `OVO`) have one capture with the full amount.
9. Return `paid`.

The session statuses (`GET /sessions/{id}`): `ACTIVE`, `COMPLETED`, `EXPIRED`, `CANCELED`. The
payment statuses (`GET /v3/payments/{id}`): `PENDING`, `AUTHORIZED`, `SUCCEEDED`, `FAILED`,
`EXPIRED`, `CANCELED`.

### The map to Medusa

| `checkSession` result                | `authorizePayment`                                     | `getPaymentStatus` | `isSessionPaid` |
| ------------------------------------ | ------------------------------------------------------ | ------------------ | --------------- |
| `paid`                               | return `{ status: "captured", data: input.data }`      | `captured`         | `true`          |
| `open`                               | throw `PAYMENT_AUTHORIZATION_ERROR`                    | `pending`          | `false`         |
| `closed`                             | throw `PAYMENT_AUTHORIZATION_ERROR`                    | `canceled`         | `false`         |
| `mismatch`                           | log an error, then throw `PAYMENT_AUTHORIZATION_ERROR` | `pending`          | `false`         |
| it throws (HTTP error, timeout, 429) | throw `PAYMENT_AUTHORIZATION_ERROR`                    | `pending`          | throw           |

- For `mismatch`, log the reason, `xendit_session_id`, `payment_id`, the Xendit amounts and
  `data.amount`.
- If `data.xendit_session_id` is not a string or `data.amount` is not a number, `authorizePayment`
  throws `PAYMENT_AUTHORIZATION_ERROR`. `getPaymentStatus` returns `pending`. `isSessionPaid`
  returns `false`. `checkSession` is not called.
- `getPaymentStatus` returns `{ status, data: input.data }`.
- The page "Payment Sessions overview" says about a completed session: "Users can retry within the
  same session if they fail". **Unverified:** that a failed attempt leaves the session `ACTIVE`. The
  docs give no other status for it.
- `retrievePayment` calls `GET /sessions/{id}` and returns
  `{ data: { ...input.data, gateway_status: session.status } }`. If the call fails, it throws
  `UNEXPECTED_STATE`.
- The session object also has `payment_request_id` and `latest_payment_request_id`. `refundPayment`
  needs `payment_request_id`. See section 9.

## 8. Webhook

### Events

- The session webhook has two events: `payment_session.completed` and `payment_session.expired`.
- The provider handles only `payment_session.completed`. Each other event gives `NOT_SUPPORTED`.
- The body (from the official example, shortened):

```json
{
  "event": "payment_session.completed",
  "business_id": "661f87c614802d6c402cd82d",
  "created": "2026-12-31T23:59:59Z",
  "data": {
    "payment_session_id": "ps-661f87c614802d6c402cd82d",
    "reference_id": "order_12345_PAY",
    "session_type": "PAY",
    "currency": "PHP",
    "amount": 10000,
    "status": "COMPLETED",
    "payment_id": "py-661f87c614802d6c402cd82d",
    "payment_request_id": "pr-661f87c614802d6c402cd82d"
  }
}
```

- In `getWebhookActionAndData(payload)`, the body is `payload.data`. Thus the session id is
  `payload.data.data.payment_session_id`.

### Verification

- Xendit puts the webhook verification token in the header `x-callback-token` of each webhook. The
  pages "Handling webhooks" and "Integration security" say so. The API reference of the payment and
  refund webhooks lists the header. The API reference of the session webhook does not list it.
  **Unverified:** that the session webhook carries the header. Check it with **Test & Save** and
  with a sandbox payment.
- Node gives the header names in lower case: read `payload.headers["x-callback-token"]`. Accept only
  a string.
- Compare the header with the `webhookToken` option with `crypto.timingSafeEqual`. Compare the
  lengths first, because `timingSafeEqual` throws for buffers of different lengths.
- If `webhookToken` is empty, log an error ("XENDIT_WEBHOOK_TOKEN is empty") and return
  `NOT_SUPPORTED` for each webhook. An empty token must never match an empty or absent header.

What the token proves, and what it does not prove:

- The token proves that the sender knows the token. Xendit sends the same static token with each
  webhook.
- Xendit does not sign the body. There is no HMAC and no timestamp. Thus the token does not prove
  that the body is the body that Xendit sent, or that the webhook is new. A person who gets the
  token can send any body. A person who records a webhook can send it again.
- Thus the README rule for a gateway with no signature applies. Read only `payment_session_id` from
  the body. Then get the session and the payment again from the API. Use only the API responses for
  the status, the amount and the reference.
- The provider also reads `event` from the body, but only as a filter that skips an API call. A
  false `event` cannot make a payment paid, because step 5 uses the API status.

### The steps of `getWebhookActionAndData`

1. Check the token. A bad or absent token: log an error, return `NOT_SUPPORTED`.
2. If `payload.data.event` is not `"payment_session.completed"`, return `NOT_SUPPORTED`.
3. If `payload.data.data.payment_session_id` is not a string, return `NOT_SUPPORTED`.
4. Call `GET /sessions/{payment_session_id}`. A failed call: log an error, return `NOT_SUPPORTED`.
5. Return `NOT_SUPPORTED` when one of these is false:
   - `status` is `"COMPLETED"`.
   - `session_type` is `"PAY"`.
   - `currency` is `"IDR"`.
   - `reference_id` starts with `payses_`. One Xendit account can serve other apps. A session of
     another app has a different `reference_id`.
   - `payment_id` is not null.
6. Call `GET /v3/payments/{payment_id}`. A failed call: log an error, return `NOT_SUPPORTED`.
7. If the payment `status` is not `"SUCCEEDED"`, return `NOT_SUPPORTED`.
8. Return:

```ts
return {
  action: PaymentActions.SUCCESSFUL,
  data: { session_id: session.reference_id, amount: session.amount },
}
```

- `session.amount` is already whole rupiah. See section 11.
- This method has no `data.amount`, so it does not compare the amount. `authorizePayment` runs the
  full paid check when Medusa processes the event.
- Do not throw. See the README.

### Delivery

- Xendit sends the webhook as an HTTP POST. It counts a 2xx response as a delivery. The Medusa route
  always returns HTTP 200.
- If the response is not 2xx, Xendit tries again up to six times: after 15 minutes, 1 hour, 3 hours,
  6 hours, 12 hours and 24 hours from the first attempt.
- The dashboard has a **Webhook** tab. You can resend one event, or up to 500 events with a filter
  (page "Webhook behavior").
- Xendit can send the same event two times, and the events can arrive in any order (page "Handling
  webhooks"). Medusa completes a cart only one time, so a second event does nothing.

## 9. Refund

- The API: `POST {apiUrl}/refunds`. The refund uses the payment request id, not the session id.
- `refundPayment` steps:
  1. Call `GET /sessions/{data.xendit_session_id}`. Read `payment_request_id`. The schema describes
     it as the id "used to reference the payment made during this Session". Do not use
     `latest_payment_request_id`, which can be a failed attempt. If `payment_request_id` is null,
     throw `UNEXPECTED_STATE`.
  2. Convert the amount with `MathBN.convert(input.amount).toNumber()`. The result is whole rupiah.
     Send it with no other conversion.
  3. Call `POST /refunds` with the body below.
  4. Send the header `idempotency-key: <input.context.idempotency_key>` if the key exists. The API
     reference does not list this header. `xendit-node` sends it for `POST /refunds` (`Refund.ts`,
     lines 98-99). Thus the fact comes from the official SDK source.
  5. Add the refund `id` (prefix `rfd-`) to `refund_ids`.

```json
{
  "payment_request_id": "pr-0800fe40-bb79-47ae-9d1e-e69394d3949c",
  "reference_id": "<input.context.idempotency_key>",
  "currency": "IDR",
  "amount": 50000,
  "reason": "REQUESTED_BY_CUSTOMER"
}
```

- `payment_request_id` and `reason` are required. `reason` is one of `FRAUDULENT`, `DUPLICATE`,
  `REQUESTED_BY_CUSTOMER`, `CANCELLATION`, `OTHERS`.
- `reference_id` is optional, 1 to 255 characters. Send `input.context.idempotency_key`. If the key
  is absent, do not send `reference_id`. **Unverified:** whether Xendit requires a unique
  `reference_id` for each refund.
- `currency` and `amount` are optional in the schema. Send both. **Unverified:** what Xendit does
  with no `amount`. Probably it refunds the full amount. The provider always sends it.
- The response is HTTP 200 with `status` (`PENDING`, `SUCCEEDED`, `FAILED` or `CANCELLED`). Xendit
  says: "Refund is pending. Check the final status of the refund via webhook." The provider does not
  wait for the refund webhook. When `refundPayment` returns, Medusa records the refund. If Xendit
  later reports `FAILED`, Medusa does not know it. The owner checks the final status in the Xendit
  dashboard.
- Errors. Throw `UNEXPECTED_STATE` with `error_code` and `message` for each of them:
  - HTTP 403 `REFUND_NOT_SUPPORTED`: the channel has no refund.
  - HTTP 403 `PARTIAL_REFUND_NOT_SUPPORTED`: the channel has no partial refund.
  - HTTP 400 `REFUND_AMOUNT_EXCEEDED`: the amount is more than the amount that is not refunded yet.
  - HTTP 400 `REFUND_IN_PROGRESS`: a refund of this payment is pending. Wait, then try again.
  - HTTP 400 `PARTIAL_REFUND_COUNTS_EXCEEDED`, `INELIGIBLE_TRANSACTION_STATUS`,
    `INSUFFICIENT_BALANCE`, `TEMPORARILY_UNAVAILABLE`, `INVALID_VALUE_ERROR`,
    `API_VALIDATION_ERROR`.
  - HTTP 403 `INVALID_MERCHANT_SETTINGS`. HTTP 404 `DATA_NOT_FOUND`.
- Xendit sends the money back only to the payment method of the payment.
- Refund support of the Indonesian channels (page "Available payment methods", checked on the date
  above):

| Channel                                        | Refund | Partial refund | Refund validity (days) |
| ---------------------------------------------- | ------ | -------------- | ---------------------- |
| `CARDS`                                        | yes    | yes            | 365                    |
| `SHOPEEPAY`                                    | yes    | yes            | 365                    |
| `GOPAY`                                        | yes    | yes            | 45                     |
| `DANA`                                         | yes    | yes            | 30                     |
| `OVO`                                          | yes    | yes            | 14                     |
| `QRIS`                                         | yes    | no             | 30                     |
| `LINKAJA`                                      | yes    | no             | 30                     |
| `BRI_DIRECT_DEBIT`                             | yes    | no             | 120                    |
| `KREDIVO`                                      | yes    | yes            | 14                     |
| `INDODANA`                                     | yes    | yes            | 30                     |
| `AKULAKU`, `ATOME`, `JENIUSPAY`                | yes    | yes            | no limit               |
| All `*_VIRTUAL_ACCOUNT` channels               | no     | no             | -                      |
| `ALFAMART`, `INDOMARET`, `ASTRAPAY`, `NEXCASH` | no     | no             | -                      |

- For a channel with no refund, Xendit refuses the refund and Medusa Admin shows the message. The
  owner then returns the money outside Xendit, for example with a bank transfer.

## 10. Expiry, cancellation and update

### Expiry

- A session expires 30 minutes after creation by default. Xendit recommends "to keep Sessions
  short-lived and create a new Session again only when the customer is ready to make payment".
- `expires_at` (ISO 8601) sets another expiry. It "must be at least 10 minutes in the future and
  must not exceed the maximum allowed expiry duration". **Unverified:** the maximum duration. The
  docs do not give it.
- The template does not send `expires_at`. If a client needs more time, for example for a virtual
  account or a retail outlet payment, add `expires_at` and test the maximum in the sandbox.
- An expired session cannot become active again. Xendit sends `payment_session.expired`. The
  provider ignores this event.
- When the session expires, the customer has no hosted page. The cart stays. The customer can select
  the payment again on `/checkout`. A new call to `initiatePaymentSession` deletes the old Medusa
  session and creates a new Xendit session.

### Cancellation

- `cancelPayment` and `deletePayment` call `POST {apiUrl}/sessions/{xendit_session_id}/cancel` with
  no body.
- If `data.xendit_session_id` is not a string, make no call. Return `{ data: input.data }`. This
  happens when `initiatePayment` failed.
- The response is HTTP 200 with the session object and `status: "CANCELED"`. "The Xendit Hosted
  Checkout URL will be invalid." A canceled session cannot become active again.
- Only an `ACTIVE` session can be canceled. Other statuses give HTTP 422 with
  `error_code: "INVALID_SESSION_STATUS"`, for example
  `"Session status is COMPLETED, expecting ACTIVE"`. An unknown id gives HTTP 404 `NOT_FOUND`.
- For each error: write a warning to the log and return `{ data: input.data }`. Do not throw. See
  the README.

### Update

- Xendit has no API that changes the amount of a session.
- `updatePayment`: cancel the old session as `cancelPayment` does. Then create a new session as
  `initiatePayment` does, with `reference_id` equal to `data.session_id` and `amount` from
  `input.amount`. Return the new data.
- **Unverified:** whether Xendit accepts a second session with the same `reference_id`. The docs say
  "uniquely identify" but give no error code for a duplicate `reference_id` of a session. Medusa
  2.21.2 does not call `updatePayment` in the store flow, so this case is rare.

## 11. Amount and currency

- Xendit takes the amount for IDR as a number in rupiah. The official IDR example sends
  `"amount": 150000` for Rp 150.000.
- The conversion from whole rupiah: none. Send the Medusa amount as it is:
  `amount = MathBN.convert(input.amount).toNumber()`. Do not multiply. Do not divide.
- The conversion back to whole rupiah in the webhook result: none. `session.amount` is whole rupiah.
- Xendit says: "Amount must also respect the decimal places allowed for the given currency".
  **Unverified:** the number of decimal places that Xendit allows for IDR. The docs do not state it.
  A whole number has no decimal places, so it is always valid. Thus `initiatePayment` and
  `refundPayment` throw `INVALID_DATA` when the amount is not an integer (`Number.isInteger`). This
  check is an addition to the README contract. It stops a request that Xendit can refuse.
- `amount` must be greater than 0 for `PAY`. Else Xendit gives `INVALID_AMOUNT`.
- Each channel has its own minimum and maximum (page "Available payment methods"). Examples:

| Channel                   | Minimum (Rp) | Maximum (Rp)                               |
| ------------------------- | ------------ | ------------------------------------------ |
| `CARDS`                   | 5,000        | 200,000,000                                |
| `BCA_VIRTUAL_ACCOUNT`     | 10,000       | 50,000,000                                 |
| `BNI_VIRTUAL_ACCOUNT`     | 1            | 50,000,000                                 |
| `MANDIRI_VIRTUAL_ACCOUNT` | 1            | 50,000,000,000 (the value of the page)     |
| `ALFAMART`                | 10,000       | 5,000,000                                  |
| `INDOMARET`               | 10,000       | 2,500,000                                  |
| `QRIS`                    | 1            | 20,000,000                                 |
| `DANA`, `OVO`             | 100          | 20,000,000                                 |
| `GOPAY`, `SHOPEEPAY`      | 1            | 50,000,000 (GoPay), 20,000,000 (ShopeePay) |
| `ATOME`                   | 50,000       | 6,000,000                                  |

- **Unverified:** whether the hosted page hides a channel when the amount is out of its range.
- Compare the amounts as numbers in rupiah: `session.amount`, `payment.request_amount` and
  `capture_amount` against `data.amount`.

## 12. Rate limits

- Test mode: 60 requests per minute for each endpoint and each account. Live mode: 600 requests per
  minute for each endpoint and each account. "The Rate Limit may vary per endpoint".
- Each client IP address has a limit of 18,000 requests per minute.
- An excess gives HTTP 429 with `error_code: "RATE_LIMIT_EXCEEDED"`. The response headers
  `Rate-Limit-Limit`, `Rate-Limit-Remaining` and `Rate-Limit-Reset` give the state.
- The return page calls `authorizePayment` up to 6 times for one checkout. Each call is one
  `GET /sessions` call, plus one `GET /v3/payments` call when the session is completed.
- The recovery adapter: set `maxSessionsPerRun: 20`. This number is a choice of this document, not a
  Xendit value. One run then makes at most 20 calls to `GET /sessions` and 20 calls to
  `GET /v3/payments`. This is one third of the test mode limit of an endpoint, so the return pages
  keep a margin.
- `isSessionPaid(data)` creates the client with `xenditClientOptions(process.env)` and calls
  `checkSession(data)` (section 7). It returns `true` only for `paid`. A thrown error skips the
  session for the run, as the README says.
- `paymentReference(data)` returns `data.xendit_session_id`.

## 13. Sandbox tests

- Use a Test Mode secret key. Test Mode "will not interact with banking networks and incur no
  charges". All channels are available in Test Mode by default.
- Xendit refuses an `http://` return URL. Thus the sandbox order of README step 24 cannot use
  `pnpm dev` on `localhost`. Do the sandbox order on the public HTTPS host of README step 25, for
  example a staging server. Set `STOREFRONT_URL` to the HTTPS storefront URL of that host. The
  storefront and the API must be on the same site (see `AGENTS.md`), so use one domain for both. The
  template has no staging procedure.
- The return page path needs no webhook. `authorizePayment` asks the API, so a simulated payment
  also completes the cart through the return page.
- Cards on the hosted page. Use any CVV and an expiry date in the future:

| Card number        | Brand      | Result                                       |
| ------------------ | ---------- | -------------------------------------------- |
| `4000000000001000` | VISA       | 3DS frictionless, the authentication passes. |
| `4000000000002503` | VISA       | 3DS challenge, passes with the correct OTP.  |
| `5200000000001005` | MASTERCARD | 3DS frictionless, the authentication passes. |
| `5200000000002151` | MASTERCARD | 3DS challenge, passes with the correct OTP.  |

- A card payment with one of these amounts fails: `10051` (`EXPIRED_CARD`), `10053`
  (`DECLINED_BY_PROCESSOR`), `10054` (`INSUFFICIENT_BALANCE`), `10059` (`DECLINED_BY_ISSUER`). Use
  them to test the failed path. The customer can try again in the same session, so the session stays
  `ACTIVE`. `authorizePayment` throws.
- Other channels: select the channel on the hosted page, for example a virtual account. Then
  simulate the payment:

```bash
curl -X POST "https://api.xendit.co/v3/payment_requests/<payment_request_id>/simulate" \
  -u "$XENDIT_SECRET_KEY:" \
  -H "api-version: 2024-11-11" -H "Content-Type: application/json" \
  -d '{"amount": 150000}'
```

- The simulate response is `{ "status": "PENDING", "message": "..." }`. The result comes as a
  webhook.
- **Unverified:** where to find `<payment_request_id>` before the payment. The session field
  `latest_payment_request_id` is "the most recent Xendit Payment Request ID linked to this Session".
  Read it with `GET /sessions/{id}` after you select the channel. **Unverified:** whether the test
  mode hosted page also has its own button to simulate a payment.
- To test the amount check: simulate a payment with a different `amount`. **Unverified:** whether
  Xendit accepts a simulated amount that is different from the session amount.
- To test the webhook, use **Test & Save** on the webhook page first. The test body has no real
  session, so the provider logs an error from `GET /sessions`. This shows that the token check
  passed. Then make a sandbox payment and close the browser on the hosted page.

## 14. Traps

- **The webhook has no signature over the body.** `x-callback-token` is a static shared token. It
  does not protect the body and it does not stop a replay. `getWebhookActionAndData` must get the
  session again from the API (section 8). Never trust `status`, `amount` or `reference_id` from the
  webhook body.
- **An empty token.** If `XENDIT_WEBHOOK_TOKEN` is empty, reject each webhook. Else a request with
  no header passes the check.
- **The session webhook header is not in the API reference.** If the session webhook has no
  `x-callback-token`, each webhook gives `NOT_SUPPORTED`. The return page and the recovery job still
  complete the carts. Check the header with **Test & Save** (section 3, step 4) before you go live.
- **The return URL must be HTTPS.** `STOREFRONT_URL=http://localhost:3000` (the development value)
  makes `POST /sessions` fail with `INVALID_URL`. The checkout then shows `checkout.errors.payment`.
  Use an HTTPS URL for each sandbox test with the hosted page. The unit and integration tests use
  the fetch mock, so they are not affected.
- **A completed session is not the money.** Check the session (`COMPLETED`) and the payment
  (`SUCCEEDED`) and the amounts. See section 7.
- **The Invoice API is legacy.** Old guides and blog posts use `POST /v2/invoices`, `external_id`,
  `invoice_url` and the statuses `PENDING`, `PAID`, `SETTLED`, `EXPIRED`. Do not mix these names
  with Payment Sessions. In Payment Sessions the names are `reference_id`, `payment_link_url` and
  `ACTIVE`, `COMPLETED`, `EXPIRED`, `CANCELED`.
- **The same base URL for test and live.** Only the key selects the mode. A live key in a
  development `.env` makes real payments.
- **Do not send `customer`.** The `customer` schema of "Create a session" says that
  `customer.reference_id` "must be unique" and allows only letters and digits. `given_names` and
  `surname` allow "no special characters", so a name such as "Nur'aini" can fail. A second order of
  one customer can collide with the first `customer.reference_id` (`DUPLICATE_ERROR`). The `PAY`
  session does not need a customer.
- **The session expires after 30 minutes.** A customer who selects a virtual account or a retail
  outlet must pay in that time. **Unverified:** whether a payment code that the session created
  stays valid after the session expires.
- **A late payment.** The page "Delayed webhooks" says that a payment can arrive after the expiry
  because of a race. If the session is `EXPIRED` when the payment arrives, `authorizePayment` throws
  and the cart does not become an order. **Unverified:** whether Xendit then changes the session to
  `COMPLETED`. If the owner sees a paid Xendit payment with no Medusa order, the owner refunds it in
  the Xendit dashboard.
- **No refund for many channels.** Virtual accounts and retail outlets have no refund. QRIS, LinkAja
  and BRI direct debit have no partial refund. See section 9.
- **A refund comes from the Xendit balance.** `INSUFFICIENT_BALANCE` means that the balance is too
  low.
- **The refund result comes later.** `POST /refunds` returns `PENDING`. The final result is the
  refund webhook, which the provider does not process.
- **Rate limit in test mode.** 60 requests per minute for each endpoint. Many parallel test
  checkouts can get HTTP 429. `authorizePayment` throws, and the return page tries again.
- **Metadata limits conflict in the docs.** The schema says 50 keys and values of 500 characters.
  The error text says 20 keys and values of 80 characters. The provider sends no metadata.
- **The Node SDK has no Payment Sessions client.** Do not add `xendit-node` for this provider. Use
  `fetch`.

## 15. Example JSON for test mocks

The JSON comes from the examples and the schemas of the API reference pages of section 1 ("Create a
session", "Get the status of a session", "Cancel a session", the session webhook, "Get the status of
a payment" and "Refund a payment request"). The error messages are the example messages of these
pages. The values are changed to IDR and to the template. Use the same ids in all mocks of one test,
so that the ids match.

The fetch mock of the HTTP integration test handles these requests on the origin of `XENDIT_API_URL`
(`https://xendit.test`):

- `POST /sessions`: store a new session with `status: "ACTIVE"` in a `Map`. Return the first object
  below.
- `GET /sessions/{id}`: return the stored session.
- `POST /sessions/{id}/cancel`: change an `ACTIVE` session to `CANCELED`. Else return HTTP 422.
- `GET /v3/payments/{id}`: return the stored payment.
- `POST /refunds`: return the refund object below.
- A function `pay(sessionId, amount)` sets the session to `COMPLETED`, sets `payment_id` and
  `payment_request_id`, and stores a `SUCCEEDED` payment with `request_amount` and one capture of
  `amount`.

`POST /sessions`, HTTP 201:

```json
{
  "payment_session_id": "ps-67527107dda8b2513acdaef0",
  "created": "2026-10-18T03:35:36.032Z",
  "updated": "2026-10-18T03:35:36.032Z",
  "status": "ACTIVE",
  "reference_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "currency": "IDR",
  "amount": 150000,
  "country": "ID",
  "expires_at": "2026-10-18T04:05:35.049Z",
  "expires_ttl": 1800,
  "session_type": "PAY",
  "mode": "PAYMENT_LINK",
  "capture_method": "AUTOMATIC",
  "allow_save_payment_method": "DISABLED",
  "locale": "en",
  "business_id": "62440e322008e87fb29c1fd0",
  "success_return_url": "https://shop.example.com/checkout/return",
  "cancel_return_url": "https://shop.example.com/checkout/return",
  "payment_link_url": "https://dev.xen.to/qZx5RD_7",
  "payment_id": null,
  "payment_request_id": null,
  "latest_payment_request_id": null
}
```

`GET /sessions/ps-67527107dda8b2513acdaef0`, HTTP 200, not paid yet: the same object as above.

`GET /sessions/ps-67527107dda8b2513acdaef0`, HTTP 200, completed:

```json
{
  "payment_session_id": "ps-67527107dda8b2513acdaef0",
  "created": "2026-10-18T03:35:36.032Z",
  "updated": "2026-10-18T03:41:02.118Z",
  "status": "COMPLETED",
  "reference_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "currency": "IDR",
  "amount": 150000,
  "country": "ID",
  "expires_at": "2026-10-18T04:05:35.049Z",
  "session_type": "PAY",
  "mode": "PAYMENT_LINK",
  "capture_method": "AUTOMATIC",
  "business_id": "62440e322008e87fb29c1fd0",
  "payment_link_url": "https://dev.xen.to/qZx5RD_7",
  "payment_id": "py-ac1fcd3e-21c5-4c70-bb06-fa3c34e19e0c",
  "payment_request_id": "pr-0800fe40-bb79-47ae-9d1e-e69394d3949c",
  "latest_payment_request_id": "pr-0800fe40-bb79-47ae-9d1e-e69394d3949c"
}
```

`GET /sessions/ps-67527107dda8b2513acdaef0`, HTTP 200, expired: the first object with
`"status": "EXPIRED"` and `"expires_ttl": 0`.

`GET /v3/payments/py-ac1fcd3e-21c5-4c70-bb06-fa3c34e19e0c`, HTTP 200, paid:

```json
{
  "payment_id": "py-ac1fcd3e-21c5-4c70-bb06-fa3c34e19e0c",
  "business_id": "62440e322008e87fb29c1fd0",
  "reference_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "payment_request_id": "pr-0800fe40-bb79-47ae-9d1e-e69394d3949c",
  "type": "PAY",
  "country": "ID",
  "currency": "IDR",
  "request_amount": 150000,
  "capture_method": "AUTOMATIC",
  "channel_code": "DANA",
  "status": "SUCCEEDED",
  "captures": [
    {
      "capture_id": "cptr-ac1fcd3e-21c5-4c70-bb06-fa3c34e19e0c",
      "capture_timestamp": "2026-10-18T03:41:01.200Z",
      "capture_amount": 150000
    }
  ],
  "created": "2026-10-18T03:40:30.731Z",
  "updated": "2026-10-18T03:41:01.032Z"
}
```

**Unverified:** that the payment `reference_id` is equal to the session `reference_id`. The provider
does not compare it.

Webhook `POST /hooks/payment/pp_xendit_xendit`, header `x-callback-token: xendit-test-token`:

```json
{
  "event": "payment_session.completed",
  "business_id": "62440e322008e87fb29c1fd0",
  "created": "2026-10-18T03:41:03.000Z",
  "data": {
    "payment_session_id": "ps-67527107dda8b2513acdaef0",
    "reference_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
    "session_type": "PAY",
    "currency": "IDR",
    "amount": 150000,
    "country": "ID",
    "mode": "PAYMENT_LINK",
    "status": "COMPLETED",
    "payment_link_url": "https://dev.xen.to/qZx5RD_7",
    "payment_id": "py-ac1fcd3e-21c5-4c70-bb06-fa3c34e19e0c",
    "payment_request_id": "pr-0800fe40-bb79-47ae-9d1e-e69394d3949c",
    "business_id": "62440e322008e87fb29c1fd0"
  }
}
```

`POST /sessions/ps-67527107dda8b2513acdaef0/cancel`, HTTP 200: the first object with
`"status": "CANCELED"` and no `expires_ttl`.

`POST /sessions/ps-67527107dda8b2513acdaef0/cancel`, HTTP 422:

```json
{
  "error_code": "INVALID_SESSION_STATUS",
  "message": "Session status is COMPLETED, expecting ACTIVE"
}
```

`POST /refunds`, HTTP 200:

```json
{
  "id": "rfd-69e77490-d2cc-4bf3-8319-e064e121db93",
  "payment_request_id": "pr-0800fe40-bb79-47ae-9d1e-e69394d3949c",
  "reference_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "channel_code": "DANA",
  "currency": "IDR",
  "amount": 50000,
  "status": "PENDING",
  "reason": "REQUESTED_BY_CUSTOMER",
  "failure_code": null,
  "refund_fee_amount": null,
  "metadata": null,
  "created": "2026-10-19T02:00:00.000Z",
  "updated": "2026-10-19T02:00:00.000Z"
}
```

`POST /refunds`, HTTP 403:

```json
{
  "error_code": "REFUND_NOT_SUPPORTED",
  "message": "Refund feature is not available for this payment channel."
}
```

`POST /sessions`, HTTP 400, `STOREFRONT_URL` with `http://`:

```json
{
  "error_code": "INVALID_URL",
  "message": "Please provide a valid HTTPS URL"
}
```

Any endpoint, HTTP 401:

```json
{
  "error_code": "INVALID_API_KEY",
  "message": "API key is not authorized for this API"
}
```
