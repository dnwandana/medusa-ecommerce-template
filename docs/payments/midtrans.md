# Midtrans payment gateway

Checked on: 2026-10-18

This document gives the facts of the Midtrans API for a provider that obeys
[the contract in README.md](README.md). Read README.md first. Where this document gives a more
exact rule than README.md for Midtrans, this document applies.

| Item            | Value                               |
| --------------- | ----------------------------------- |
| `<slug>`        | `midtrans`                          |
| `<provider_id>` | `pp_midtrans_midtrans`              |
| `<GATEWAY>`     | `MIDTRANS`                          |
| `<Name>`        | `Midtrans`                          |
| Module path     | `apps/backend/src/modules/midtrans` |
| Hosted payment  | Snap in redirect mode               |

The provider uses two Midtrans APIs:

- The Snap API creates the hosted payment. Its response has `redirect_url`, the URL of the hosted
  page. The customer goes to that URL. The storefront does not load the Snap pop-up script
  (`snap.js`), and it does not use the client key.
- The Core API gives the status of a payment, and it expires and refunds a payment.

## 1. Sources

Each Midtrans fact in this document comes from one of these pages. A fact with no clear statement
on these pages has the mark **unverified**. A fact with "(source: ...)" names its page.

| Topic                                                 | URL                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| Snap integration guide (endpoint, `redirect_url`)     | https://docs.midtrans.com/docs/snap-snap-integration-guide                        |
| Snap API reference (request and response)             | https://docs.midtrans.com/reference/backend-integration                           |
| Snap JSON objects (field types and lengths)           | https://docs.midtrans.com/reference/json-objects                                  |
| Snap advanced features (redirect, expiry, payments)   | https://docs.midtrans.com/docs/snap-advanced-feature                              |
| Snap page expiry (expiry settings, not an API)        | https://docs.midtrans.com/reference/expire-a-snap-session                         |
| HTTP notification (webhook)                           | https://docs.midtrans.com/docs/https-notification-webhooks                        |
| Notification IP addresses                             | https://docs.midtrans.com/docs/ip-address                                         |
| Get transaction status                                | https://docs.midtrans.com/reference/get-transaction-status                        |
| Transaction status cycle                              | https://docs.midtrans.com/docs/transaction-status-cycle                           |
| Fraud status                                          | https://docs.midtrans.com/reference/fraud-status                                  |
| Expire transaction                                    | https://docs.midtrans.com/reference/expire-transaction                            |
| Cancel transaction                                    | https://docs.midtrans.com/reference/cancel-transaction                            |
| Refund transaction                                    | https://docs.midtrans.com/reference/refund-transaction                            |
| API headers and idempotency                           | https://docs.midtrans.com/reference/api-headers                                   |
| Technical FAQ (Snap token, order id reuse)            | https://docs.midtrans.com/docs/technical-faq                                      |
| Testing payment on sandbox                            | https://docs.midtrans.com/docs/testing-payment-on-sandbox                         |
| Account and access keys                               | https://docs.midtrans.com/docs/midtrans-account                                   |
| Official Node.js SDK, base URLs                       | https://github.com/Midtrans/midtrans-nodejs-client/blob/master/lib/apiConfig.js   |
| Official Node.js SDK, Core API calls and notification | https://github.com/Midtrans/midtrans-nodejs-client/blob/master/lib/transaction.js |
| Official Node.js SDK, HTTP client and error rule      | https://github.com/Midtrans/midtrans-nodejs-client/blob/master/lib/httpClient.js  |

Two facts come from the Medusa 2.21.2 source in `apps/backend/node_modules`, not from Midtrans:

- `@medusajs/payment`, `dist/models/payment-session.js`: the session id has the prefix `payses`.
- `@medusajs/utils`, `dist/common/generate-entity-id.js`: the id is `<prefix>_` plus a ULID. A ULID
  has 26 characters: digits and upper-case letters.

## 2. Check before you build

Check these pages again before you write code. APIs change.

Open each URL of [Sources](#1-sources). Compare the facts with this document. If a page and this
document are different, the page is correct. Change this document and its `Checked on` date.

Do not use the SDK `midtrans-client` in the provider. It uses Axios, not `fetch`, so the test mocks
of README.md do not replace its calls. Call the API with `fetch`, as README.md says. The SDK source
is a reference only.

## 3. Account and dashboard setup

The Midtrans dashboard is the MAP (Merchant Administration Portal). The login URL is
https://dashboard.midtrans.com/login. The dashboard has one sandbox environment and one production
environment. Select the environment with the "Environment" menu at the top left. Each environment
has its own keys and its own settings (source: account and access keys).

1. Make a Midtrans account. Log in to the dashboard.
2. Select the sandbox environment.
3. Go to **Settings → Access Keys**. Copy the **Server Key**. You do not need the Client Key or the
   Merchant ID. The Client Key is for Snap.js, and the template does not use Snap.js.
4. Go to **Settings → Configuration**. Set **Payment Notification URL** to
   `https://<public host>/hooks/payment/pp_midtrans_midtrans`. The URL must start with `https://`
   or `http://`. Midtrans recommends `https://` (source: webhook).
5. On the same page, set **Finish Redirect URL**, **Unfinished Redirect URL** and **Error Redirect
   URL** to `${STOREFRONT_URL}/checkout/return`, for example
   `https://example.com/checkout/return`. The API request also sends the finish URL (see
   [Create a hosted payment](#6-create-a-hosted-payment)). The API has no field for the unfinished
   URL.
6. Click **Update**.
7. Production: do steps 2 to 6 again in the production environment. Midtrans activates production
   only after it approves the account. The approval procedure is not in the sources
   (**unverified**).
8. Refunds: Midtrans must activate the refund feature for the account (source: refund). If the
   refund API refuses all refunds, ask Midtrans support to activate it.

Payment methods:

- The Snap API field `enabled_payments` limits the payment methods of one hosted payment. See
  [Create a hosted payment](#6-create-a-hosted-payment).
- The dashboard page **Snap Preferences → Payment Channels** also selects the payment methods. The
  Snap advanced features page says that this setting applies only to the Snap pop-up. For redirect
  mode, the page points to "the configuration on the next section". It is **unverified** whether
  redirect mode shows all active payment methods when the request has no `enabled_payments`. Check
  this in the sandbox.

The notification URL must be on the public internet. Midtrans cannot send a notification to
`localhost`, to a URL with a password, to a URL behind a VPN, or to an unusual port. Use the
standard port 80 or 443 (source: webhook). The template uses 443.

## 4. Environment variables

| Key                         | Purpose                                                                                     | Development value                          | Test value (`.env.test`)        | Production value                   |
| --------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------- | ---------------------------------- |
| `MIDTRANS_SERVER_KEY`       | The Server Key. It authenticates each API call and it is part of the webhook signature.     | empty (secret)                             | `SB-Mid-server-test`            | `change-me`                        |
| `MIDTRANS_API_URL`          | The Core API base URL: status, expire, refund.                                              | `https://api.sandbox.midtrans.com`         | `https://midtrans.test`         | `https://api.midtrans.com`         |
| `MIDTRANS_SNAP_URL`         | The Snap API base URL: create the hosted payment.                                           | `https://app.sandbox.midtrans.com/snap/v1` | `https://midtrans.test/snap/v1` | `https://app.midtrans.com/snap/v1` |
| `MIDTRANS_ENABLED_PAYMENTS` | Optional. A comma-separated list of `enabled_payments` values. Empty: the request omits it. | empty                                      | empty                           | the list of the client, or empty   |

- Midtrans has two hosts, one for the Snap API and one for the Core API. Thus the provider has one
  base URL key for each host, as README.md allows. Both keys must name the same environment. A sandbox key on a
  production URL gives HTTP 401 (source: Snap API reference, error 401).
- In `.env.test`, both base URLs use the origin `https://midtrans.test`. The paths of the two APIs
  do not overlap (`/snap/v1/...` and `/v2/...`). Thus one fetch mock for one origin serves both
  APIs.
- The sandbox Server Key starts with `SB-Mid-server-` in the examples of the docs. A production
  Server Key has a different prefix (**unverified**).
- `validateOptions` throws when `storefrontUrl`, `apiUrl` or `snapUrl` is empty. It does not check
  `serverKey`.
- Add the four keys to the five places of
  [Environment variables in README.md](README.md#environment-variables). In
  `apps/backend/.env.example`, name the dashboard page: "Midtrans dashboard → Settings → Access
  Keys".

`midtransClientOptions(env)` in `client.ts`:

```ts
export function midtransClientOptions(env: Record<string, string | undefined>) {
  const trim = (url: string) => url.replace(/\/+$/, "")
  return {
    serverKey: env.MIDTRANS_SERVER_KEY || "",
    apiUrl: trim(env.MIDTRANS_API_URL || "https://api.sandbox.midtrans.com"),
    snapUrl: trim(env.MIDTRANS_SNAP_URL || "https://app.sandbox.midtrans.com/snap/v1"),
    enabledPayments: (env.MIDTRANS_ENABLED_PAYMENTS || "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean),
  }
}
```

The provider does not check the codes of `MIDTRANS_ENABLED_PAYMENTS`. Midtrans checks them. It is
**unverified** what Midtrans does with an unknown code.

`constants.ts`:

```ts
export const MIDTRANS_PROVIDER_ID = "pp_midtrans_midtrans"
export const MIDTRANS_EXPIRY_HOURS = 24
export const MIDTRANS_TIMEOUT_MS = 10_000
export const MIDTRANS_MAX_SESSIONS_PER_RUN = 20
export const MIDTRANS_REFUNDABLE_PAYMENT_TYPES = [
  "credit_card",
  "gopay",
  "shopeepay",
  "dana",
  "ovo",
  "qris",
  "kredivo",
  "akulaku",
]
// A Medusa payment session id, with the optional suffix of updatePayment.
export const MIDTRANS_ORDER_ID_PATTERN = /^payses_[0-9A-Z]{26}(-u\d+)?$/
```

The checkout label (see [Checkout label in README.md](README.md#checkout-label)):

| Key                                              | `en.json`                                                              | `id.json`                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `checkout.paymentProviders.pp_midtrans_midtrans` | `Midtrans`                                                             | `Midtrans`                                                                      |
| `checkout.paymentHints.pp_midtrans_midtrans`     | `Pay by virtual account, card, QRIS or e-wallet on the Midtrans page.` | `Bayar dengan virtual account, kartu, QRIS, atau e-wallet di halaman Midtrans.` |

Change the hint if the client limits the payment methods with `MIDTRANS_ENABLED_PAYMENTS`.

## 5. Base URLs and authentication

| API      | Sandbox                                    | Production                         |
| -------- | ------------------------------------------ | ---------------------------------- |
| Snap API | `https://app.sandbox.midtrans.com/snap/v1` | `https://app.midtrans.com/snap/v1` |
| Core API | `https://api.sandbox.midtrans.com`         | `https://api.midtrans.com`         |

Sources: the Snap integration guide (both Snap URLs), the get transaction status page (Core sandbox
URL), and `lib/apiConfig.js` of the official Node.js SDK (all four URLs).

Each request has these headers:

```http
Accept: application/json
Content-Type: application/json
Authorization: Basic <base64 of "<server key>:">
```

- The user name is the Server Key. The password is empty. Encode the Server Key followed by one
  colon: `Buffer.from(`${serverKey}:`).toString("base64")` (source: Snap integration guide).
- A GET request has no body. Send the `Content-Type` header anyway. The docs send it in the GET
  example.
- Do not send the header `Idempotency-Key`. The provider does not need it. The Snap order id and
  the refund `refund_key` already prevent a double operation. For reference: Midtrans accepts the
  header on POST requests, the maximum length is 46 characters, and Midtrans keeps a key for five
  minutes (source: API headers).
- Give each request `signal: AbortSignal.timeout(MIDTRANS_TIMEOUT_MS)`.

### Errors and the field `status_code`

- The Snap API gives an error as HTTP 401 (bad key), HTTP 4xx (bad parameter) or HTTP 5xx (Midtrans
  error, usually temporary). The body has `error_messages`, an array of strings (source: Snap
  integration guide, Snap API reference).
- The Core API puts a `status_code` string in each response body, for example `"200"`, `"201"`,
  `"404"` or `"407"`. The docs show the "transaction not found" body (`status_code` `"404"`) under
  the HTTP 200 response (source: get transaction status). It is **unverified** whether the HTTP
  status of a Core API response is always the same as the body `status_code`.
- The official SDK (`lib/httpClient.js`) rejects a response with a body `status_code` of 400 or more,
  except 407. 407 is the success code of the expire API.
- Thus the client of the template reads the JSON body for each HTTP status, and decides from the
  body. It does not decide from the HTTP status alone. See [The client](#the-client).

### The client

`client.ts` exports the class `MidtransClient` and the class `MidtransApiError`.

```ts
export class MidtransApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null, // null for a network error or a timeout
    readonly statusCode: string | null // the body status_code, if the body has one
  ) {
    super(message)
  }
}
```

`new MidtransClient({ serverKey, apiUrl, snapUrl, enabledPayments })` has four methods. Each method
parses the body as JSON. If `fetch` throws, or the body is not JSON, the method throws a
`MidtransApiError` with the HTTP status (or `null`) and the message `Midtrans <path>: <cause>`.
Never put the Server Key in a message.

| Method                        | Request                                   | Returns                                                                               | Throws `MidtransApiError` when                                                                       |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `createSnapTransaction(body)` | `POST {snapUrl}/transactions`             | `{ token, redirect_url }`                                                             | The HTTP status is not 2xx, or `redirect_url` is not a string. Message: `error_messages.join("; ")`. |
| `getStatus(orderId)`          | `GET {apiUrl}/v2/{orderId}/status`        | The body, when it has a string `transaction_status`, or when `status_code` is `"404"` | Each other body. Message: `status_message`.                                                          |
| `expire(orderId)`             | `POST {apiUrl}/v2/{orderId}/expire`       | The body `status_code` as a string, for each JSON body                                | Only a network error, a timeout, or a body that is not JSON.                                         |
| `refund(transactionId, body)` | `POST {apiUrl}/v2/{transactionId}/refund` | The body, when `status_code` is `"200"`                                               | Each other body. Message: `status_message`.                                                          |

Encode each id in a path with `encodeURIComponent`.

The service converts a `MidtransApiError` to a `MedusaError` as each method of this document says.

## 6. Create a hosted payment

`initiatePayment` calls `createSnapTransaction`:

```http
POST {MIDTRANS_SNAP_URL}/transactions
```

The request body:

```json
{
  "transaction_details": {
    "order_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
    "gross_amount": 95000
  },
  "customer_details": {
    "first_name": "Budi",
    "last_name": "Santoso",
    "email": "budi@example.com",
    "phone": "+6281234567890"
  },
  "callbacks": {
    "finish": "https://example.com/checkout/return"
  },
  "expiry": {
    "start_time": "2026-10-18 14:30:00 +0700",
    "unit": "hour",
    "duration": 24
  }
}
```

The fields (source: Snap JSON objects, Snap advanced features):

| Field                              | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transaction_details.order_id`     | Required. String, 50 characters maximum. Letters, digits and the symbols `-`, `_`, `~`, `.`. Unique for the merchant. Send `input.data.session_id`. See below.                                                                                                                                                                                                                                                                                                                        |
| `transaction_details.gross_amount` | Required. Integer. The amount in whole rupiah. See [Amount and currency](#11-amount-and-currency).                                                                                                                                                                                                                                                                                                                                                                                    |
| `customer_details`                 | Optional. Midtrans recommends it. `first_name`, `last_name`, `email`, `phone`: each a string of 255 characters maximum.                                                                                                                                                                                                                                                                                                                                                               |
| `callbacks.finish`                 | Optional. String, 255 characters maximum. The URL after a paid payment. Send `${storefrontUrl}/checkout/return`. It replaces the Finish Redirect URL of the dashboard for this payment.                                                                                                                                                                                                                                                                                               |
| `callbacks.error`                  | Optional. Do not send it. The Error Redirect URL of the dashboard applies. See [Account and dashboard setup](#3-account-and-dashboard-setup).                                                                                                                                                                                                                                                                                                                                         |
| `expiry`                           | Optional. `start_time` (`yyyy-MM-dd HH:mm:ss Z`), `unit` (`day`, `hour` or `minute`, plural also accepted), `duration` (integer). Minimum 20 seconds, maximum 7 days.                                                                                                                                                                                                                                                                                                                 |
| `enabled_payments`                 | Optional. An array of payment method codes. Send it only when `enabledPayments` is not empty. Codes on the Snap advanced features page: `credit_card`, `gopay`, `shopeepay`, `permata_va`, `bca_va`, `bni_va`, `bri_va`, `echannel`, `other_va`, `indomaret`, `alfamart`, `akulaku`. The same page gives the alias `bank_transfer` (Permata, BCA, BNI and BRI VAs and `echannel`) and the alias `store`. Codes for QRIS, DANA, OVO and Kredivo are not on that page (**unverified**). |
| `item_details`                     | Optional. Do not send it. If you send it, the sum of `price × quantity` must be equal to `gross_amount`, and each `price` must be an integer.                                                                                                                                                                                                                                                                                                                                         |

The customer:

- Midtrans needs no customer field for the template payment methods. Do not throw when
  `data.customer` or one of its fields is absent. (Akulaku needs `customer_details`, source: Snap
  JSON objects. The storefront always sends `customer`.)
- Send `customer_details` only when `data.customer` exists. Copy `first_name`, `last_name`, `email`
  and `phone`. Omit a field that is absent or an empty string, for example an empty `last_name`.
- Send `phone` as it is, in E.164 (`+6281234567890`). For BNI VA, Midtrans needs a phone that
  starts with `+62` or `0`, with 30 characters maximum (source: Snap JSON objects). The storefront
  phone obeys this rule.

The order id:

- Send `input.data.session_id` as `order_id`. The Medusa session id is `payses_` plus a ULID: 33
  characters, digits, upper-case letters and `_` (see the Medusa sources in [Sources](#1-sources)).
  It obeys the rule of Midtrans.
- Medusa makes a new session id for each new payment session. Thus each hosted payment has a new
  order id.
- Midtrans refuses an order id that a payment already used. The error text is
  `transaction_details.order_id has already been taken` in English, or
  `transaction_details.order_id sudah digunakan` in Indonesian (source: technical FAQ, Snap advanced
  features).
- Exception: while the customer has not selected a payment method on the Snap page, a new Snap
  request with the same order id is accepted. It gives a new token and a new `redirect_url`. The old
  token stops working (source: technical FAQ, Snap advanced features).

The expiry:

- Send `expiry` with `unit: "hour"`, `duration: MIDTRANS_EXPIRY_HOURS` (24) and `start_time` set to
  the current time. 24 hours is the default lifetime of a Snap token and its `redirect_url`
  (source: Snap advanced features).
- Send `start_time`. Without it, Midtrans starts the expiry of a bank transfer or a GoPay payment
  only when the customer selects the payment method. The Snap advanced features page recommends
  `start_time`.
- Write `start_time` in Western Indonesia Time with the offset `+0700`:

```ts
const wib = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString() // the UTC fields now show WIB
const startTime = `${wib.slice(0, 10)} ${wib.slice(11, 19)} +0700`
```

The checks before the request:

- Throw a `MedusaError` of the type `INVALID_DATA` when `currency_code.toLowerCase()` is not `idr`.
- Throw a `MedusaError` of the type `INVALID_DATA` when the amount is not an integer. See
  [Amount and currency](#11-amount-and-currency).
- Throw a `MedusaError` of the type `INVALID_DATA` when `input.data.session_id` is absent.

The response is HTTP 201 (source: Snap API reference):

```json
{
  "token": "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
  "redirect_url": "https://app.sandbox.midtrans.com/snap/v3/redirection/66e4fa55-fdac-4ef9-91b5-733b97d1b862"
}
```

- `redirect_url` is the URL of the hosted page. Return it as `payment_url`.
- The path of `redirect_url` differs between the pages of the docs (`/snap/v2/vtweb/...`,
  `/snap/v3/redirection/...`). Do not check the path. Check only that the value starts with
  `https://`. Else throw a `MedusaError` of the type `UNEXPECTED_STATE`.
- `token` is the Snap token. The provider does not need it. Do not store it.
- If `createSnapTransaction` throws, throw a `MedusaError` of the type `UNEXPECTED_STATE` with the
  message `Midtrans payment failed (HTTP <httpStatus>): <message>`.

What `initiatePayment` returns:

```ts
return {
  id: orderId, // the Midtrans order id, which is the session id
  data: {
    payment_url: response.redirect_url,
    order_id: orderId,
    amount: amount, // whole rupiah, a number
    session_id: orderId,
  },
}
```

- The gateway payment id is the order id, under the key `order_id`. Midtrans gives a
  `transaction_id` only after the customer selects a payment method. The Core API accepts the order
  id in each path (source: get transaction status, expire transaction, refund transaction). Thus the
  provider uses `order_id` for the status and expire calls.
- `order_id` and `session_id` have the same value. Keep both keys, because README.md names
  `session_id`.
- Midtrans returns no expiry time. Thus the session data has no expiry key.

## 7. Payment status

`authorizePayment`, `getPaymentStatus`, `retrievePayment`, `refundPayment` and the recovery adapter
call `getStatus`:

```http
GET {MIDTRANS_API_URL}/v2/{order_id}/status
```

The path accepts the order id or the Midtrans `transaction_id` (source: get transaction status). Use
`data.order_id`.

The response fields that the provider reads:

| Field                | Type and meaning                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `status_code`        | String. `"200"` success, `"201"` pending, `"404"` transaction not found.                   |
| `transaction_status` | String. See the table below.                                                               |
| `fraud_status`       | String. `accept`, `deny`, or `challenge`. Not all payment methods return it.               |
| `gross_amount`       | String with two decimals, for example `"95000.00"`. The amount of the transaction in IDR.  |
| `order_id`           | String. The order id of the request.                                                       |
| `transaction_id`     | String. The Midtrans id of the payment attempt.                                            |
| `payment_type`       | String, for example `credit_card`, `bank_transfer`, `echannel`, `gopay`, `qris`, `cstore`. |

The Snap transaction before the customer selects a payment method:

- The Core API does not know the Snap transaction until the customer selects a payment method on
  the Snap page. Until then, the status request gives `status_code` `"404"` (source: transaction
  status cycle: "you might encounter `404` or _Payment not found_ response while calling _Core API
  GET Status_ … the customer did not yet choose any payment method within the Snap payment page").
  The body has `status_message` `"Transaction doesn't exist."` (source: get transaction status).
- This is not an error. It means "not paid yet". If the customer never selects a method, the status
  stays `"404"`. Snap sends no webhook when the Snap page expires (source: Snap page expiry).

### The paid rule

The payment is paid when both conditions are true (source: webhook, "transaction status" note and
sample handler):

1. `transaction_status` is `settlement`, or `transaction_status` is `capture`.
2. `fraud_status` is `accept`, or `fraud_status` is absent and `transaction_status` is `settlement`.

Write it as one function `isPaid(status)` in `client.ts` or `service.ts`. `authorizePayment`,
`getPaymentStatus`, `getWebhookActionAndData` and the recovery adapter all use it.

Compare the status values in lower case. The docs show one example with `"PENDING"` in upper case
(**unverified**).

The amount check: `Number(status.gross_amount)` must be equal to `data.amount`. The docs give no
separate "paid amount" field. It is **unverified** that `gross_amount` is always the amount that the
customer paid.

### The map to Medusa

`getPaymentStatus` returns `{ status, data: input.data }`. If `getStatus` throws, both methods
throw: `authorizePayment` a `PAYMENT_AUTHORIZATION_ERROR`, `getPaymentStatus` an
`UNEXPECTED_STATE`.

| `transaction_status` | `fraud_status`     | Meaning (from the docs)                                       | `authorizePayment`                            | `getPaymentStatus`                                |
| -------------------- | ------------------ | ------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| (status `"404"`)     | none               | The customer has not selected a payment method.               | throw `PAYMENT_AUTHORIZATION_ERROR`           | `pending`                                         |
| `pending`            | any                | Waiting for the customer to pay, or for 3DS or OTP on a card. | throw                                         | `pending`                                         |
| `capture`            | `accept`           | Card payment accepted. It becomes `settlement` later.         | `captured` if the amount is equal, else throw | `captured` if the amount is equal, else `pending` |
| `capture`            | not `accept`       | `challenge`: the fraud system questions the card payment.     | throw                                         | `pending`                                         |
| `settlement`         | `accept` or absent | Paid. The money is received.                                  | `captured` if the amount is equal, else throw | `captured` if the amount is equal, else `pending` |
| `settlement`         | other value        | Not documented.                                               | throw                                         | `pending`                                         |
| `deny`               | any                | The bank or the fraud system refused the attempt.             | throw                                         | `pending`                                         |
| `cancel`             | any                | The merchant or Midtrans canceled the payment.                | throw                                         | `canceled`                                        |
| `expire`             | any                | The customer did not pay in time.                             | throw                                         | `canceled`                                        |
| `failure`            | any                | An unexpected error, usually a bank that does not respond.    | throw                                         | `pending`                                         |
| `authorize`          | any                | Card pre-authorization. The template does not use it.         | throw                                         | `pending`                                         |
| `refund`             | any                | Refunded in full by the merchant.                             | throw                                         | `canceled`                                        |
| `chargeback`         | any                | Charged back.                                                 | throw                                         | `canceled`                                        |
| `partial_refund`     | any                | Refunded in part by the merchant.                             | throw                                         | `pending`                                         |
| `partial_chargeback` | any                | Charged back in part.                                         | throw                                         | `pending`                                         |
| any other value      | any                | A new status of Midtrans.                                     | throw                                         | `pending`                                         |

Sources of the meanings: transaction status cycle, webhook, fraud status.

Notes on the map:

- `deny` and `failure` give `pending`, not `canceled`. One Snap order id accepts more than one
  payment attempt until a payment succeeds or the order id expires. Thus the customer can try a
  different method after a `deny` (source: Snap advanced features, "Multiple payment attempts"). It
  is **unverified** which attempt the status API returns when an order id has more than one attempt.
- `fraud_status` `challenge` is on the get transaction status page and on the card pages, but not
  on the fraud status page. The fraud status page lists only `accept` and `deny`. Midtrans may not
  use `challenge` any more (**unverified**). The map still covers it. What happens to a `challenge`
  payment that nobody approves is **unverified**.
- `refund`, `chargeback`, `partial_refund` and `partial_chargeback` happen only after a paid
  payment, so they come after the order exists. Their `getPaymentStatus` values are a rule of this
  template, not a fact of Midtrans. Medusa 2.21.2 does not call `getPaymentStatus` in the flow of the
  template (README.md).
- `retrievePayment` returns `{ data: { ...input.data, gateway_status } }` with
  `gateway_status: status.transaction_status`, or `"not_found"` for status `"404"`. If `getStatus`
  throws, `retrievePayment` throws an `UNEXPECTED_STATE`.
- When `authorizePayment` throws for a different amount, write the error log of README.md with
  `order_id`, `gross_amount` and `data.amount`.

## 8. Webhook

Midtrans calls it the "HTTP(S) notification". All facts of this section come from the webhook page,
except where a different source is named.

- Method `POST`. Header `Content-Type: application/json`. The body is a JSON object.
- Midtrans sends a notification each time the status of a payment attempt changes: `pending`,
  `settlement`, `capture`, `deny`, `cancel`, `expire`, `refund`, and the other statuses of
  [Payment status](#7-payment-status).
- The webhook URL is `https://api.<domain>/hooks/payment/pp_midtrans_midtrans`. Set it in the
  dashboard. See [Account and dashboard setup](#3-account-and-dashboard-setup).
- Midtrans adds no custom header to the request.
- Midtrans sends the notification with TLS up to version 1.2. An endpoint that accepts only TLS 1.3
  does not get it. Make sure that the server accepts TLS 1.2 (**unverified** for the Caddy
  configuration of the template).
- Optional per-payment URL: the request header `X-Override-Notification` on the Snap request
  replaces the dashboard URL for that payment. `X-Append-Notification` adds a URL. Each header takes
  up to three URLs, separated by commas. The template does not send these headers. Use the
  dashboard URL.

### The payload

The fields of each notification:

| Field                | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| `transaction_time`   | `YYYY-MM-DD HH:MM:SS`, Western Indonesia Time                |
| `transaction_status` | see [Payment status](#7-payment-status)                      |
| `transaction_id`     | the Midtrans id of the attempt                               |
| `status_message`     | text                                                         |
| `status_code`        | string, for example `"200"`, `"201"`, `"202"`                |
| `signature_key`      | the signature, a SHA-512 hash as hex text                    |
| `payment_type`       | for example `credit_card`, `bank_transfer`, `qris`           |
| `order_id`           | the order id of the Snap request                             |
| `merchant_id`        | the merchant id                                              |
| `gross_amount`       | string with two decimals, for example `"95000.00"`           |
| `currency`           | `"IDR"`                                                      |
| `fraud_status`       | `accept`, `deny`, or absent (Indomaret and Alfamart omit it) |

Some payment types add fields, for example `settlement_time`, `va_numbers`, `masked_card`. Ignore
unknown fields.

### The verification

Midtrans signs each notification. Thus the README rule "verify the signature" applies:

```text
signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
```

The Midtrans signature covers fields of the parsed body, not the raw body. Thus the provider reads
`payload.data`. It does not need `payload.rawData`.

`getWebhookActionAndData(payload)` does these steps in this order:

1. Read `order_id`, `status_code`, `gross_amount` and `signature_key` from `payload.data`. If one of
   them is not a string, return `NOT_SUPPORTED`.
2. Join `order_id`, `status_code`, `gross_amount` and the Server Key with no separator. Use
   `gross_amount` exactly as it is in the body, for example `"95000.00"`. Do not convert it to a
   number first.
3. Compute `crypto.createHash("sha512").update(text).digest("hex")`.
4. Convert the result and `signature_key` to buffers with `Buffer.from(value, "hex")`. If the two
   lengths are different, the signature is bad. Else compare them with `crypto.timingSafeEqual`.
5. If the signature is bad, write an error to the log and return `NOT_SUPPORTED`.
6. If `order_id` does not match `MIDTRANS_ORDER_ID_PATTERN`, return `NOT_SUPPORTED`. This is a
   foreign event: a payment of the same Midtrans account that this store did not make.
7. If `isPaid` of [Payment status](#7-payment-status) is false for the fields of the notification,
   return `NOT_SUPPORTED`.
8. Return
   `{ action: PaymentActions.SUCCESSFUL, data: { session_id, amount: Number(gross_amount) } }`.
   `session_id` is `order_id` with the suffix `-u<digits>` removed:
   `order_id.replace(/-u\d+$/, "")`. See
   [Expiry, cancellation and update](#10-expiry-cancellation-and-update). `Number("95000.00")` is
   `95000`, whole rupiah.

Do not throw. Wrap the steps in `try`, and return `NOT_SUPPORTED` for each error.

The docs also describe a second check: call the status API for the order id. The official Node.js
SDK `notification()` does only this check, with no signature check (source: SDK `transaction.js`).
The provider does not need it in `getWebhookActionAndData`, because `authorizePayment` calls the
status API in each case.

### Delivery

- Midtrans waits 15 seconds for a response. Medusa answers at once, so this is not a problem.
- An HTTP 2xx response stops the retries. Medusa returns HTTP 200 for each notification, also for a
  bad signature, so Midtrans does not retry.
- Retries after a failure: up to five retries after about 2, 10, 30, 90 and 210 minutes. The count
  depends on the response: HTTP 500 one retry, HTTP 503 four retries, HTTP 400 or 404 two retries,
  other errors five retries. HTTP 301, 302 and 303 get no retry.
- A settlement notification arrives in up to 20 seconds. An expiry notification arrives in up to 90
  seconds.
- Midtrans can send a notification twice. Midtrans can also send `settlement` before `pending`.
  Medusa handles both: `processPaymentWorkflow` does nothing for a cart that already has an order
  (README.md).
- The notification comes from fixed IP addresses (source: notification IP addresses). Do not use
  them to verify a notification. The page says to verify with the signature.
- The dashboard shows the delivery history: **Settings → Configuration → See History**.

## 9. Refund

```http
POST {MIDTRANS_API_URL}/v2/{order_id or transaction_id}/refund
```

The request body (source: refund transaction):

```json
{
  "refund_key": "01JABCDEFGHJKMNPQRSTVWXYZ0",
  "amount": 20000,
  "reason": "Refund from Medusa Admin"
}
```

| Field        | Rule                                                                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refund_key` | Optional. Letters, digits, `-` and `_`. A retry with the same key within 7 days of the first attempt does not make a second refund. Without it, Midtrans makes a new refund id. The docs give no maximum length (**unverified**). |
| `amount`     | Optional. Integer, whole rupiah. Without it, Midtrans refunds the full amount.                                                                                                                                                    |
| `reason`     | Optional. 255 characters maximum. The refund page says that a card payment of the bank BNI needs it.                                                                                                                              |

The procedure of `refundPayment`:

1. Call `getStatus(data.order_id)`. If it throws, or the body `status_code` is `"404"`, throw a
   `MedusaError` of the type `UNEXPECTED_STATE` with the message
   `Midtrans status for <order_id> failed: <message>`.
2. If `status.payment_type` is not in `MIDTRANS_REFUNDABLE_PAYMENT_TYPES`, write a warning to the
   log and return `{ data: input.data }`. The owner then returns the money by hand, for example by
   bank transfer. The refund page lists only these payment types with a refund: `credit_card`,
   `gopay`, `shopeepay`, `dana`, `ovo`, QRIS, `kredivo`, `akulaku`. The page writes "QRIS". The
   value `qris` of `payment_type` is **unverified**.
3. Call `refund(status.transaction_id, body)`. The refund page accepts the order id or the
   `transaction_id` in the path. It requires `transaction_id` for a GoPay static QRIS payment. Thus
   the provider always sends `transaction_id`.
4. Body:
   - `refund_key`: `context.idempotency_key` with each character that is not a letter, a digit, `-`
     or `_` replaced with `-`. No prefix. If `context.idempotency_key` is absent or empty, omit
     `refund_key`.
   - `amount`: `MathBN.convert(input.amount).toNumber()`. No conversion is necessary. Always send
     it.
   - `reason`: always `"Refund from Medusa Admin"`.
5. If `refund` throws, throw a `MedusaError` of the type `UNEXPECTED_STATE` with the message
   `Midtrans refund failed (<statusCode>): <message>`.
6. Return `{ data: { ...input.data, refund_ids: [...old ids, String(refund_chargeback_id)] } }`.
   `refund_chargeback_id` is a number in the response examples (**unverified** type). Store it as a
   string.

The response fields: `status_code`, `status_message`, `transaction_id`, `order_id`, `gross_amount`,
`payment_type`, `transaction_time`, `transaction_status` (`refund` or `partial_refund`),
`refund_chargeback_id`, `refund_amount` (the total refunded so far), `refund_key`.

Errors (body `status_code`):

| `status_code` | `status_message`                                                     |
| ------------- | -------------------------------------------------------------------- |
| `"412"`       | Merchant cannot modify the status of the transaction                 |
| `"414"`       | Refund request is rejected due to invalid amount                     |
| `"406"`       | Duplicate refund ID                                                  |
| `"401"`       | Transaction cannot be authorized with the current client/server key. |

Limits:

- The refund API works only for a payment with the status `settlement`. For `pending`, `authorize`
  or `capture`, Midtrans says to use the cancel API (source: refund transaction). A card payment in
  `capture` settles automatically the next day (source: transaction status cycle). Thus a refund
  of a card payment on the same day probably gets `"412"` (**unverified**). Medusa Admin then shows
  the error. The owner tries again the next day.
- Partial refunds: ShopeePay and OVO do not accept them. The docs do not list the other types. The
  card example shows a partial refund.
- Time limits: for example DANA 45 days, Kredivo 14 days, OVO 7 days, GoPay up to 180 days,
  ShopeePay QRIS off-us 7 days. See the refund page for the full table.
- Midtrans sends two refund notifications: one without `bank_confirmed_at` and one with it. The
  second one confirms the refund. The provider returns `NOT_SUPPORTED` for both, because the paid
  rule is false for `refund` and `partial_refund`.
- The direct refund API `/v2/{id}/refund/online/direct` still works for old merchants. Do not use
  it. The card refund page says that `/refund` covers all cases.

## 10. Expiry, cancellation and update

Expire:

```http
POST {MIDTRANS_API_URL}/v2/{order_id}/expire
```

- It changes a pending payment to `expire`. It works for Snap payments. The expired order id can be
  used again (source: expire transaction).
- The success response has `status_code` `"407"` and `transaction_status` `"expire"`. Midtrans then
  sends an `expire` notification with `status_code` `"202"` (source: expire transaction).
- A refusal has `status_code` `"412"` (Merchant cannot modify the status of the transaction).
- A Snap payment with no selected payment method is not in the Core API (see
  [Payment status](#7-payment-status)). It is **unverified** what the expire call gives then. The
  status API gives `"404"` for it.

`cancelPayment` and `deletePayment`:

1. If `data.order_id` is absent, return `{ data: input.data }` with no call. This happens when
   `initiatePayment` failed.
2. Call `expire(data.order_id)`.
3. If the result is `"407"`, `"404"` or `"412"`, return `{ data: input.data }`.
4. For each other result, and when `expire` throws, write a warning to the log. Return
   `{ data: input.data }`. Never throw.

Cancel:

- `POST {MIDTRANS_API_URL}/v2/{order_id}/cancel` cancels a payment before `settlement`, also a card
  payment in `capture` (source: cancel transaction). A settled payment needs a refund.
- The provider does not call it. Medusa calls `cancelPayment` and `deletePayment` for a payment that
  the customer did not pay, and the expire call covers that case.

The Snap page:

- Midtrans has no API to revoke a Snap token or to close a Snap page. Source: technical FAQ, "There
  is no official revoke or cancel API method for Snap token". The page "Expire a Snap Session"
  describes only the fields `expiry` and `page_expiry` of the Snap request. It is not an API to
  close a page.
- The workaround of the technical FAQ: a new Snap request with the same order id, before the
  customer selects a method, makes the old token stop working. The provider does not use it.
- An expired Snap page cannot open again. Snap sends no webhook when the page expires (source: Snap
  page expiry).

Update:

- Medusa 2.21.2 does not call `updatePayment` in the store flow (README.md). Implement it anyway.
- `updatePayment`:
  1. Do the steps of `cancelPayment` for `data.order_id`. Ignore the result.
  2. Make a new order id: `${data.session_id}-u${Date.now()}`. The result has 33 + 15 = 48
     characters, below the maximum of 50.
  3. Do the steps of `initiatePayment` with the new order id and `input.amount`.
  4. Return `{ data }` with the new `payment_url`, the new `order_id`, the new `amount`, and the old
     `session_id`.
- The webhook result removes the suffix `-u<digits>` from `order_id` to get `session_id` (see
  [Webhook](#8-webhook)). A Medusa session id never has this suffix.

## 11. Amount and currency

- Currency: Midtrans takes IDR. The Snap request has no currency field. The notification has
  `currency: "IDR"` (source: webhook).
- `gross_amount` in a request is an integer in whole rupiah (source: Snap JSON objects). Send the
  Medusa amount with no conversion: `MathBN.convert(input.amount).toNumber()`. Do not divide or
  multiply.
- The docs do not say if Midtrans accepts a decimal `gross_amount` for IDR (**unverified**). Check
  the value with `Number.isInteger`. If it is not an integer, throw a `MedusaError` of the type
  `INVALID_DATA`.
- `item_details.price` must be an integer with no decimals. The provider does not send
  `item_details`.
- `gross_amount` in a response or a notification is a string with two decimals, for example
  `"95000.00"` (source: get transaction status, webhook). Convert it with `Number(gross_amount)` to
  compare it and to return it in the webhook result. `Number("95000.00")` is `95000`.
- The refund `amount` is an integer in whole rupiah, as in the request (source: refund
  transaction).

## 12. Rate limits

- The docs give no rate limit for the Snap API, the status API, the expire API or the refund API
  (**unverified**). The docs give a limit only for the BIN API (100 requests per minute, HTTP 409),
  which the provider does not use.
- `maxSessionsPerRun` of the recovery adapter: `MIDTRANS_MAX_SESSIONS_PER_RUN` (20). This is a
  choice of the template, not a fact of Midtrans. With one run each 15 minutes, the job makes at
  most 20 status calls each 15 minutes.
- Give each call a timeout of `MIDTRANS_TIMEOUT_MS` (10 seconds), as README.md says.

The recovery adapter (`recovery.ts`):

- `providerId`: `MIDTRANS_PROVIDER_ID`.
- `isSessionPaid(data)`: make a `MidtransClient` from `midtransClientOptions(process.env)`. Call
  `getStatus(data.order_id)`. Return `isPaid(status)`. Status `"404"` gives `false`. Do not compare
  the amount. A paid cart with a different amount then fails in `authorizePayment`, and the job
  sends the alert email to the owner. Let an error of `getStatus` throw. The job then skips the
  session for this run.
- `paymentReference(data)`: return `data.order_id`.

## 13. Sandbox tests

Never pay a sandbox payment with a real bank or a real e-wallet. Use the simulators (source: testing
payment on sandbox).

Cards (CVV `123`, any future expiry date, OTP or 3DS `112233`):

| Case                                            | Visa                  | Mastercard            |
| ----------------------------------------------- | --------------------- | --------------------- |
| 3DS, accepted                                   | `4811 1111 1111 1114` | `5211 1111 1111 1117` |
| 3DS, denied by the bank                         | `4911 1111 1111 1113` | `5111 1111 1111 1118` |
| Attempted authentication, accepted              | `4411 1111 1111 1118` | `5410 1111 1111 1116` |
| Attempted authentication, denied (fraud system) | `4611 1111 1111 1116` | `5411 1111 1111 1115` |
| Attempted authentication, denied by the bank    | `4711 1111 1111 1115` | `5511 1111 1111 1114` |

Simulators:

| Payment method       | Simulator                                                                 |
| -------------------- | ------------------------------------------------------------------------- |
| BCA VA               | https://simulator.sandbox.midtrans.com/bca/va/index                       |
| BNI VA               | https://simulator.sandbox.midtrans.com/bni/va/index                       |
| BRI VA, Permata VA   | https://simulator.sandbox.midtrans.com/openapi/va/index (select the bank) |
| Mandiri Bill Payment | https://simulator.sandbox.midtrans.com/openapi/va/index?bank=mandiri      |
| QRIS                 | https://simulator.sandbox.midtrans.com/v2/qris/index                      |
| GoPay                | https://simulator.sandbox.midtrans.com/v2/deeplink/index                  |

The test procedure:

1. Make an order in the storefront with the sandbox keys. Select Midtrans.
2. On the Snap page, select a VA, for example BCA. Copy the VA number.
3. Before you pay, open `${STOREFRONT_URL}/checkout/return`. The return page shows "pending". The
   status API gives `pending`.
4. Pay the VA number in the simulator.
5. Open the return page again or wait for the webhook. The cart becomes an order.
6. Make a second order with the card `4811 1111 1111 1114`. The return page makes the order.
7. Make a third order and close the browser on the Snap page. Do not pay. After 24 hours, the
   status is `expire`.
8. Refund the card order in Medusa Admin on the next day (see [Refund](#9-refund)).

The return URL gets the query `?order_id=...&status_code=...&transaction_status=...` (source: Snap
advanced features). The return page ignores it. A 3DS 2 card payment can come back with
`transaction_status=pending`. Midtrans says to use the notification for the final status (source:
Snap advanced features).

## 14. Traps

- **The status API gives "404" for a new Snap payment.** The Core API knows the payment only after
  the customer selects a method. Treat `"404"` as "not paid": `authorizePayment` throws
  `PAYMENT_AUTHORIZATION_ERROR`, `isSessionPaid` returns `false`. Do not treat it as an API failure.
- **Read the body `status_code`.** The Core API puts the result in the body. Do not trust only the
  HTTP status. See [The client](#the-client).
- **`capture` is not always paid.** A `capture` counts as paid only with `fraud_status` `accept`.
- **Settlement can become deny.** For Permata VA, Mandiri Bill Payment and Indomaret, a
  `settlement` can change to `deny` (a reversal), usually in 1 to 5 minutes. Midtrans says to treat
  the payment as not paid (source: transaction status cycle). The order can already exist then. The
  provider returns `NOT_SUPPORTED` for the `deny` notification, so Medusa does not change the order.
  The owner must check the dashboard and cancel the order by hand. To avoid the risk, set
  `MIDTRANS_ENABLED_PAYMENTS` to a list without `permata_va`, `echannel` and `indomaret`.
- **The webhook can report a different amount.** The webhook result does not compare the amount.
  `authorizePayment` compares `gross_amount` from the status API with `data.amount`, and throws
  `PAYMENT_AUTHORIZATION_ERROR` when they are different.
- **Use `gross_amount` as a string in the signature.** `"95000.00"` and `95000` give different
  hashes.
- **The old Snap page stays open.** Midtrans cannot close a Snap page. After Medusa deletes a
  session, the customer can maybe still pay the old page until it expires, if the customer did not
  select a method before. The expire call of `deletePayment` then probably has no effect
  (**unverified**, see [Expiry, cancellation and update](#10-expiry-cancellation-and-update)). The
  webhook of that payment then names a deleted session, and Medusa does not complete the cart. The
  owner sees a paid payment in the Midtrans dashboard with no order. Refund it in the dashboard.
- **Unfinished and error redirects go to the return page.** The customer can come back with no
  payment. The return page then tries six times and shows "pending". This is correct: the cart
  stays, and the customer can select another payment method on `/checkout`.
- **Do not use the SDK.** It uses Axios. The fetch mock of the tests does not see its calls.
- **No Snap pop-up.** Do not load `snap.js` in the storefront. Do not use the Client Key. The
  storefront only follows `payment_url`.
- **Sandbox and production keys are different.** A sandbox Server Key on a production URL gives
  HTTP 401 with "Access denied due to unauthorized transaction, please check client or server key".
- **Expiry needs `start_time`.** Without it, a VA payment expires 24 hours after the customer
  selects the method, not 24 hours after the checkout.

## 15. Example JSON for test mocks

The shapes come from the examples of the docs. The ids, the times and the amounts are examples. The
mock computes `signature_key` with the formula of [Webhook](#8-webhook) and the Server Key of
`.env.test`.

### The fetch mock

`apps/backend/integration-tests/helpers/midtrans-mock.ts` exports `installMidtransMock()`. It
replaces `global.fetch` for the origin `https://midtrans.test` only. It gives each other URL to the
original `fetch`.

- The mock returns HTTP 401 with the "bad key" body below when the header `Authorization` is not
  `Basic ` plus the base64 of `SB-Mid-server-test:`.
- It keeps the payments in a `Map` from the order id to
  `{ state, gross_amount, payment_type, fraud_status, transaction_id }`. `state` is one of
  `"unselected"`, `"pending"`, `"settlement"`, `"expire"`.
- It records each request as `{ method, path, body }` in the array `requests`.
- It returns an object with these functions:
  - `select(orderId, paymentType = "bank_transfer")`: `unselected` to `pending`.
  - `pay(orderId, amount?)`: to `settlement`. `amount` sets `gross_amount`, for a different amount.
  - `restore()`: puts the original `fetch` back. Call it in `afterEach`.

The routes:

| Request                            | Mock answer                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /snap/v1/transactions`       | HTTP 201, `{ token, redirect_url: "https://midtrans.test/snap/v3/redirection/<token>" }`. Stores the order id as `unselected`, with `gross_amount` `"<n>.00"`. |
| `GET /v2/<id>/status`              | HTTP 200. `unselected` or unknown: the "not found" body. Else the status body for the state.                                                                   |
| `POST /v2/<id>/expire`             | HTTP 200. `pending`: state to `expire`, the "expire success" body. `unselected` or unknown: the "not found" body, no change. Else the "refused" body.          |
| `POST /v2/<transaction_id>/refund` | HTTP 200. `settlement`: the "refund success" body. Else the "refused" body.                                                                                    |

The integration test "a change of the cart total deletes the old session" asserts that `requests`
has `POST /v2/<old order id>/expire`. It does not assert a state change, because an `unselected`
payment does not change (see [Expiry, cancellation and update](#10-expiry-cancellation-and-update)).

### Example bodies

Snap create, success (HTTP 201):

```json
{
  "token": "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
  "redirect_url": "https://app.sandbox.midtrans.com/snap/v3/redirection/66e4fa55-fdac-4ef9-91b5-733b97d1b862"
}
```

Snap create, duplicate order id (HTTP 4xx, **unverified** exact status):

```json
{
  "error_messages": ["transaction_details.order_id has already been taken"]
}
```

Snap create, bad key (HTTP 401):

```json
{
  "error_messages": [
    "Access denied due to unauthorized transaction, please check client or server key",
    "Visit https://snap-docs.midtrans.com/#request-headers for more details"
  ]
}
```

Status, not found (no payment method selected yet):

```json
{
  "status_code": "404",
  "status_message": "Transaction doesn't exist.",
  "id": "ca1774d3-302a-4d47-8495-11524ee306b8"
}
```

Status, BCA VA pending:

```json
{
  "status_code": "201",
  "status_message": "Success, transaction is found",
  "transaction_id": "9aed5972-5b6a-401e-894b-a32c91ed1a3a",
  "order_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "gross_amount": "95000.00",
  "currency": "IDR",
  "payment_type": "bank_transfer",
  "transaction_time": "2026-10-18 14:31:02",
  "transaction_status": "pending",
  "va_numbers": [{ "bank": "bca", "va_number": "12345678901" }],
  "fraud_status": "accept",
  "merchant_id": "G141532850",
  "expiry_time": "2026-10-19 14:30:00"
}
```

Status, BCA VA paid:

```json
{
  "status_code": "200",
  "status_message": "Success, transaction is found",
  "transaction_id": "9aed5972-5b6a-401e-894b-a32c91ed1a3a",
  "order_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "gross_amount": "95000.00",
  "currency": "IDR",
  "payment_type": "bank_transfer",
  "transaction_time": "2026-10-18 14:31:02",
  "settlement_time": "2026-10-18 14:35:40",
  "transaction_status": "settlement",
  "va_numbers": [{ "bank": "bca", "va_number": "12345678901" }],
  "fraud_status": "accept",
  "merchant_id": "G141532850"
}
```

Status, card accepted:

```json
{
  "status_code": "200",
  "status_message": "Success, transaction is found",
  "transaction_id": "57d5293c-e65f-4a29-95e4-5959c3fa335b",
  "order_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "gross_amount": "95000.00",
  "currency": "IDR",
  "payment_type": "credit_card",
  "transaction_time": "2026-10-18 14:31:02",
  "transaction_status": "capture",
  "fraud_status": "accept",
  "masked_card": "48111111-1114",
  "bank": "bni",
  "card_type": "credit",
  "merchant_id": "G141532850"
}
```

Status, card in challenge: the card body with these values.

```json
{
  "status_code": "201",
  "transaction_status": "capture",
  "fraud_status": "challenge"
}
```

Status, expired: the pending body with `"transaction_status": "expire"`. The `status_code` of an
expired status body is **unverified**: the expire API gives `"407"`, and the expire notification
gives `"202"`. Use `"407"` in the mock. The provider reads only `transaction_status`.

Status, a different amount: the paid body with `"gross_amount": "90000.00"`.

Expire, success:

```json
{
  "status_code": "407",
  "status_message": "Success, transaction has expired",
  "transaction_id": "9aed5972-5b6a-401e-894b-a32c91ed1a3a",
  "order_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "payment_type": "bank_transfer",
  "transaction_time": "2026-10-18 14:31:02",
  "transaction_status": "expire",
  "gross_amount": "95000.00"
}
```

Expire or refund, refused:

```json
{
  "status_code": "412",
  "status_message": "Merchant cannot modify the status of the transaction"
}
```

Refund, partial success:

```json
{
  "status_code": "200",
  "status_message": "Success, refund request is approved",
  "transaction_id": "57d5293c-e65f-4a29-95e4-5959c3fa335b",
  "order_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "gross_amount": "95000.00",
  "payment_type": "credit_card",
  "transaction_time": "2026-10-18 14:31:02",
  "transaction_status": "partial_refund",
  "refund_chargeback_id": 1234,
  "refund_amount": "20000.00",
  "refund_key": "01JABCDEFGHJKMNPQRSTVWXYZ0"
}
```

The exact `status_message` text of a refund success and the type of `refund_amount` are
**unverified**. Do not compare them in the code.

Notification, BCA VA paid (`payload.data`):

```json
{
  "transaction_time": "2026-10-18 14:31:02",
  "transaction_status": "settlement",
  "transaction_id": "9aed5972-5b6a-401e-894b-a32c91ed1a3a",
  "status_message": "midtrans payment notification",
  "status_code": "200",
  "signature_key": "<sha512 hex of order_id + status_code + gross_amount + server key>",
  "settlement_time": "2026-10-18 14:35:40",
  "payment_type": "bank_transfer",
  "order_id": "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
  "merchant_id": "G141532850",
  "gross_amount": "95000.00",
  "fraud_status": "accept",
  "currency": "IDR",
  "va_numbers": [{ "bank": "bca", "va_number": "12345678901" }]
}
```

Notification, expired: the same keys with `"transaction_status": "expire"` and
`"status_code": "202"`.

Notification, foreign event: the paid notification with `"order_id": "web-order-321"` and a good
signature.

A signature in a test:

```ts
import crypto from "node:crypto"

const sign = (orderId: string, statusCode: string, grossAmount: string, serverKey: string) =>
  crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex")
```
