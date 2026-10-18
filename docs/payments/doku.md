# DOKU payment gateway

Checked on: 2026-10-18

This document gives the facts of the DOKU API for one provider that obeys the contract in
[README.md](README.md). Read the README first. This document does not repeat the contract.

The values for this gateway:

| Term            | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| DOKU product    | DOKU Checkout (the hosted payment page of DOKU, "Jokul")   |
| `<slug>`        | `doku`                                                     |
| `<provider_id>` | `pp_doku_doku`                                             |
| `<Name>`        | `Doku` (the class `DokuProviderService`)                   |
| `<name>`        | `doku` (the function `dokuClientOptions`)                  |
| `<GATEWAY>`     | `DOKU` (the constant `DOKU_PROVIDER_ID`, the env `DOKU_*`) |
| Module path     | `apps/backend/src/modules/doku`                            |

Each fact has a source tag, for example [S1]. Section 1 gives the URL of each tag. A fact that the
sources do not state clearly has the mark **unverified**, with the sandbox test that settles it. A
rule that has the label "design choice" is a decision of this document, not a DOKU rule.

## 1. Sources

Official DOKU documentation (developer site `developers.doku.com`). Each page also has a Markdown
copy: add `.md` to the URL.

- [S1] Backend Integration (create a Checkout payment):
  https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration
- [S2] Frontend Integration (redirect or pop-up):
  https://developers.doku.com/accept-payments/doku-checkout/integration-guide/frontend-integration
- [S3] Simulate Payment and Notification:
  https://developers.doku.com/accept-payments/doku-checkout/integration-guide/simulate-payment-and-notification
- [S4] Checkout Settings:
  https://developers.doku.com/accept-payments/doku-checkout/configuration/checkout-settings
- [S5] Supported Payment Methods:
  https://developers.doku.com/accept-payments/doku-checkout/configuration/supported-payment-methods
- [S6] Order Status for Checkout Page:
  https://developers.doku.com/accept-payments/doku-checkout/order-and-notification-handling/order-status-for-checkout-page
- [S7] Cancel Order API:
  https://developers.doku.com/accept-payments/doku-checkout/order-and-notification-handling/cancel-order-api
- [S8] Expired Notification:
  https://developers.doku.com/accept-payments/doku-checkout/order-and-notification-handling/expired-notification
- [S9] Signature Component from Request Header:
  https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-component-from-request-header
- [S10] Signature from API Get Method:
  https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-from-api-get-method
- [S11] Signature Sample Code (Node.js tab):
  https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/sample-code
- [S12] Signature Component from Response Header:
  https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-componen-from-response-header
- [S13] Notification: https://developers.doku.com/get-started-with-doku-api/notification
- [S14] Setup Notification URL:
  https://developers.doku.com/get-started-with-doku-api/notification/setup-notification-url
- [S15] Notification Best Practice:
  https://developers.doku.com/get-started-with-doku-api/notification/best-practice
- [S16] Retry Notification:
  https://developers.doku.com/get-started-with-doku-api/notification/retry-notification
- [S17] Override Notification URL:
  https://developers.doku.com/get-started-with-doku-api/notification/override-notification-url
- [S18] HTTP Notification Sample - Non SNAP:
  https://developers.doku.com/get-started-with-doku-api/notification/http-notification-sample-non-snap
- [S19] Check Status API, Non-SNAP:
  https://developers.doku.com/get-started-with-doku-api/check-status-api/non-snap
- [S20] Idempotency Request:
  https://developers.doku.com/get-started-with-doku-api/idempotency-request
- [S21] Card Refund: https://developers.doku.com/accept-payments/direct-api/non-snap/card/refund
- [S22] Card Payment Page Integration Guide (test cards, invoice length):
  https://developers.doku.com/accept-payments/direct-api/non-snap/card/payment-page-integration-guide
- [S23] HTTP Status and Case Code:
  https://developers.doku.com/get-started-with-doku-api/response-code/http-status-and-case-code
- [S24] User Registration: https://developers.doku.com/get-started-with-doku-api/user-registration
- [S25] Retrieve Payment Credential:
  https://developers.doku.com/get-started-with-doku-api/retrieve-payment-credential
- [S26] Libraries and SDK: https://developers.doku.com/developer-kit/libraries-and-sdk
- [S29] DOKU Checkout (overview and demo link):
  https://developers.doku.com/accept-payments/doku-checkout

Official DOKU source code (GitHub organization `PTNUSASATUINTIARTHA-DOKU`). Use it only where the
documentation is not clear.

- [S27] Official Postman collection, commit `4a4b678`, file `doku-postman-collection.json`, items
  "DOKU Checkout - Initiate Payment" and "Check Status API":
  https://github.com/PTNUSASATUINTIARTHA-DOKU/doku-postman-collection
- [S28] Official WooCommerce plugin, commit `f2ab64c`, files
  `woo-doku-jokul/Common/JokulUtils.php`, `Service/JokulCheckoutService.php`,
  `Service/JokulCheckStatusService.php`, `Service/JokulNotificationService.php` and
  `Module/JokulCheckoutModule.php`: https://github.com/PTNUSASATUINTIARTHA-DOKU/doku-woocommerce-plugin

Medusa source in this repository, and Node.js:

- [M1] `@medusajs/payment` 2.21.2, `dist/models/payment-session.js`: the id of a payment session
  has the prefix `payses`.
- [M2] `@medusajs/utils` 2.21.2, `dist/common/generate-entity-id.js`: an id is
  `<prefix>_<ULID>`. A ULID has 26 characters from the Crockford set: `0-9` and `A-Z` without `I`,
  `L`, `O` and `U`.
- [M3] `@medusajs/utils` 2.21.2, `dist/payment/webhook.js`: `PaymentActions.SUCCESSFUL` is
  `"captured"` and `PaymentActions.NOT_SUPPORTED` is `"not_supported"`.
- [M4] `@medusajs/core-flows` 2.21.2, `dist/payment/workflows/process-payment.js` and
  `dist/payment/steps/authorize-payment-session.js`: the workflow authorizes a session only if the
  session has no payment, and completes the cart only if the cart has no order. A throw in
  `authorizePayment` makes the workflow fail.
- [N1] Node.js, `message.headers`: header names are lowercase. A header can repeat, so read a
  value as `string | string[]`. https://nodejs.org/api/http.html#messageheaders

## 2. Check before you build

Check these pages again before you write code. APIs change.

Open each page of section 1. If a page and this document are different, the page is correct.
Change this document and its `Checked on` date.

README step 3 says: settle each **unverified** fact in the sandbox before you write the code that
uses it. This document gives a safe fallback for each one, so that you can write the unit tests
first. These unverified facts change code. Settle them before you finish:

| Fact                                                 | Section | Code that depends on it           |
| ---------------------------------------------------- | ------- | --------------------------------- |
| The `original_request_id` that the card refund wants | 9       | `refundPayment`                   |
| The refund path (docs and Postman differ)            | 9       | `refundPayment`                   |
| The HTTP status of a failed refund                   | 9       | `refundPayment`                   |
| The check status value after a cancel (`CANCELLED`?) | 7       | `getPaymentStatus`                |
| The body of "Not Found" from the check status API    | 7       | the status parser, the fetch mock |
| The notification format of a virtual account payment | 8       | `getWebhookActionAndData`         |
| DOKU refuses a reused invoice number                 | 10      | `updatePayment`                   |
| DOKU accepts a space in `customer.name`              | 6       | the customer mapper               |

## 3. Account and dashboard setup

DOKU has two dashboards ("DOKU Back Office"). The sandbox account and the production account are
different accounts [S24].

1. Make a sandbox account at https://sandbox.doku.com/bo/sandbox-registration. Sign in at
   https://sandbox.doku.com/bo/login [S24].
2. Get the keys: **Integrations → API Keys** (https://sandbox.doku.com/bo/integrations/api-keys).
   Copy the **Client ID** and the **Secret Key** [S25] [S26]. A non-SNAP client id starts with
   `BRN-` or `MCH-` [S26].
3. Select the payment methods: **Settings → Checkout Page → Payment Method Settings**. Tick each
   method and save [S4]. Select only the methods of section 6, "Payment methods". The other methods
   need data that the provider does not send.
4. Leave the due date on the same tab empty. The provider sends `payment.payment_due_date` in each
   request [S4].
5. Set the notification URL (the webhook URL) on each payment channel that you selected:
   **Settings → Payment Settings → <channel group> → CONFIGURE** [S14]. The channel groups are
   Virtual Account, Cards, Convenience Store, e-Wallet and Paylater [S14].
   - Sandbox: `https://<public host>/hooks/payment/pp_doku_doku`.
   - Production: `https://api.<domain>/hooks/payment/pp_doku_doku`.
   - Use exactly the path `/hooks/payment/pp_doku_doku`. The signature includes the path (section
     8).
   - **Unverified:** the docs give no notification URL for QRIS and no one setting for all Checkout
     channels. Test: pay with QRIS in the sandbox and look for the notification in **Integration →
     HTTP Notification** [S16]. You can select QRIS before the test. With no notification, the
     return page or the recovery job still completes the cart (section 14, trap 2).
6. The redirect URL needs no dashboard setting. The provider sends it in each request
   (`order.callback_url`, section 6) [S1].
7. Do not turn on the expired notification (**Settings → Checkout Appearance → Expired Settings**)
   [S8]. The docs give no payload for it, and the provider does not need it.
8. Optional: turn on **Settings → Checkout Appearance → System Settings → Order Settings → Order
   Cancellation** [S7]. Then `cancelPayment` can close an unpaid virtual account or QRIS order
   (section 10).
9. Production: register at https://dashboard.doku.com/bo/register and finish the business
   verification (KYB). Then repeat steps 2 to 8 in the production dashboard [S24] [S26].

### Text for `docs/deployment.md`

README step 27 adds the production steps to the section "Payments". Use this text:

```markdown
### DOKU

1. Sign in to the DOKU production dashboard (https://dashboard.doku.com).
2. Open **Integrations → API Keys**. Put the Client ID in `DOKU_CLIENT_ID` and the Secret Key in
   `DOKU_SECRET_KEY` in `.env`. Set `DOKU_API_URL=https://api.doku.com`.
3. Open **Settings → Checkout Page → Payment Method Settings**. Select the payment methods of
   `docs/payments/doku.md`, section 6.
4. Open **Settings → Payment Settings**. On each selected channel, click **CONFIGURE** and set the
   notification URL `https://api.<domain>/hooks/payment/pp_doku_doku`.
5. Optional: open **Settings → Checkout Appearance → System Settings** and turn on **Order
   Cancellation**.
```

## 4. Environment variables

| Key               | Purpose                                                       | Development value              | Production value       | `.env.test` value   |
| ----------------- | ------------------------------------------------------------- | ------------------------------ | ---------------------- | ------------------- |
| `DOKU_API_URL`    | Base URL of the DOKU API. It selects the sandbox or the live. | `https://api-sandbox.doku.com` | `https://api.doku.com` | `https://doku.test` |
| `DOKU_CLIENT_ID`  | Client ID, from **Integrations → API Keys**.                  | empty                          | `change-me`            | `BRN-0000-TEST`     |
| `DOKU_SECRET_KEY` | Secret Key, from **Integrations → API Keys**. Secret.         | empty                          | `change-me`            | `SK-test-secret`    |

- The Secret Key signs the requests to DOKU and verifies the notifications from DOKU. There is no
  separate webhook key [S9] [S15].
- The provider also uses `STOREFRONT_URL` (README, "Environment variables").
- The notification path `/hooks/payment/pp_doku_doku` is a constant in `constants.ts`, not an env
  key. Export it as `DOKU_NOTIFICATION_PATH`.

The comments for `apps/backend/.env.example` (README, "Environment variables", item 1):

```sh
# DOKU base URL: https://api-sandbox.doku.com (sandbox) or https://api.doku.com (production).
DOKU_API_URL=https://api-sandbox.doku.com
# DOKU dashboard → Integrations → API Keys → Client ID.
DOKU_CLIENT_ID=
# DOKU dashboard → Integrations → API Keys → Secret Key. Keep it secret.
DOKU_SECRET_KEY=
```

## 5. Base URLs and authentication

| Environment | Base URL                       | Source |
| ----------- | ------------------------------ | ------ |
| Sandbox     | `https://api-sandbox.doku.com` | [S1]   |
| Production  | `https://api.doku.com`         | [S1]   |

The endpoints that the provider uses:

| Call             | Method and path                         | Source |
| ---------------- | --------------------------------------- | ------ |
| Create a payment | `POST /checkout/v1/payment`             | [S1]   |
| Check status     | `GET /orders/v1/status/{invoice}`       | [S19]  |
| Cancel an order  | `POST /checkout/v3/cancellations`       | [S7]   |
| Card refund      | `POST /cancellation/credit-card/refund` | [S21]  |

DOKU has no API key header and no Basic auth. Each request has four headers [S1] [S19]:

| Header              | Value                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| `Client-Id`         | The Client ID.                                                                       |
| `Request-Id`        | A unique string for each request, 128 characters maximum. See the rules below.       |
| `Request-Timestamp` | The time in UTC, ISO 8601, with no milliseconds, for example `2026-10-18T03:24:25Z`. |
| `Signature`         | `HMACSHA256=<base64>`. See below.                                                    |

- Send `Content-Type: application/json` with each POST. The official plugin sends it [S28]. The docs
  do not name it. Do not send it with a GET (design choice).
- Make the timestamp with `new Date().toISOString().slice(0, 19) + "Z"`. The official Postman
  collection uses this code [S27]. **Unverified:** DOKU refuses a timestamp with milliseconds. The
  samples never have milliseconds [S1].
- `Request-Id` is the idempotency key of DOKU. The same `Request-Id` with the same body gives HTTP
  409 with the first response body [S20]. The rules (design choice):
  - Create: use the invoice number (section 6). The cancel API then finds the order with the same
    value (section 10).
  - Refund: use `context.idempotency_key` when it is 128 characters or less. Else use
    `crypto.randomUUID()`.
  - Check status and cancel: use `crypto.randomUUID()`.

### Request signature

The procedure [S9] [S10] [S11]:

1. Serialize the body one time: `const body = JSON.stringify(payload)`. Send this exact string.
2. For a POST, compute `Digest`: the SHA-256 hash of `body` (UTF-8), as base64. A GET has no
   `Digest` [S10].
3. Make the component string. Put one `Name:value` pair on each line. Join the lines with `\n`. Do
   not add `\n` at the end [S9]:

   ```text
   Client-Id:<Client-Id header>
   Request-Id:<Request-Id header>
   Request-Timestamp:<Request-Timestamp header>
   Request-Target:<path of the endpoint, for example /checkout/v1/payment>
   Digest:<digest>
   ```

   For a GET, stop after the `Request-Target` line [S10].

4. Compute the HMAC-SHA256 of the component string with the Secret Key as the key. Encode it as
   base64 [S9].
5. Put `HMACSHA256=` before the result [S9].

`Request-Target` is the path only, with no host and no query. For the check status call it includes
the invoice number, for example `/orders/v1/status/01JABCDEFGHJKMNPQRSTVWXYZ0` [S10] [S27].

DOKU also signs its responses (header `Signature`, component `Response-Timestamp`) [S12]. The
provider does not check the response signature. HTTPS to the fixed DOKU host already authenticates
the response (design choice).

### `client.ts`

Put all DOKU code that the service and the recovery adapter share in `client.ts` (design choice):

```ts
import crypto from "node:crypto"

export const DOKU_SANDBOX_URL = "https://api-sandbox.doku.com"

export type DokuClientOptions = { apiUrl: string; clientId: string; secretKey: string }

export function dokuClientOptions(env: Record<string, string | undefined>): DokuClientOptions {
  return {
    apiUrl: env.DOKU_API_URL || DOKU_SANDBOX_URL,
    clientId: env.DOKU_CLIENT_ID || "",
    secretKey: env.DOKU_SECRET_KEY || "",
  }
}

export function dokuSignature(input: {
  clientId: string
  requestId: string
  timestamp: string
  target: string
  body?: string | Buffer
  secretKey: string
}): string {
  const lines = [
    `Client-Id:${input.clientId}`,
    `Request-Id:${input.requestId}`,
    `Request-Timestamp:${input.timestamp}`,
    `Request-Target:${input.target}`,
  ]
  if (input.body !== undefined) {
    const digest = crypto.createHash("sha256").update(input.body).digest("base64")
    lines.push(`Digest:${digest}`)
  }
  const hmac = crypto.createHmac("sha256", input.secretKey).update(lines.join("\n"), "utf8")
  return `HMACSHA256=${hmac.digest("base64")}`
}

// Each method returns the HTTP status and the parsed body. It throws only for a network error or
// a timeout. `body` is `null` when the response is not JSON; `text` keeps the raw response.
export type DokuResponse = { status: number; body: any; text: string }

export class DokuClient {
  constructor(options: DokuClientOptions)
  createPayment(payload: object, requestId: string): Promise<DokuResponse>
  getStatus(invoiceNumber: string): Promise<DokuResponse>
  cancelOrder(payload: object): Promise<DokuResponse>
  refundCard(payload: object, requestId: string): Promise<DokuResponse>
}
```

- Each method signs the request with `dokuSignature` and calls the global `fetch` with
  `AbortSignal.timeout(10_000)` (README, "Module and registration").
- Remove a trailing slash from `apiUrl` before you add the path.

## 6. Create a hosted payment

`initiatePayment` calls `POST {apiUrl}/checkout/v1/payment` [S1]. DOKU supports a redirect to
`payment.url` with no script [S2]. Thus the storefront sends the customer to the URL in the same
tab, as for each gateway (README, "What a gateway adds"), and needs no DOKU JavaScript.

### The invoice number

DOKU identifies an order by `order.invoice_number`. The notification and the check status API give
it back [S18] [S19]. It is the reference of the README contract. The README says "send
`data.session_id`". For DOKU, send a short form of it:

- `invoice_number = data.session_id.slice("payses_".length)`. This is the 26-character ULID [M1]
  [M2].
- Do not send the full session id. It has 33 characters and the symbol `_`. DOKU allows 30
  characters for a credit card order, and no symbol for KKI [S1] [S22].
- Throw a `MedusaError` of the type `INVALID_DATA` when `data.session_id` does not match
  `/^payses_[0-9A-HJKMNP-TV-Z]{26}$/`.
- `getWebhookActionAndData` makes the session id again: `"payses_" + invoice_number.slice(0, 26)`.
- `updatePayment` adds the suffix `U<n>` (section 10). A ULID never contains `U` [M2], so the suffix
  cannot clash.
- The unit test "sends the session id" (README, "Unit tests") checks that the invoice number is the
  ULID of the session id.

### Checks before the call

`initiatePayment` does the checks in this order. Each failed check throws a `MedusaError` of the
type `INVALID_DATA`:

1. `currency_code` is `idr` (README, "initiatePayment").
2. `data.session_id` matches the regex above.
3. The amount is a whole number, more than 0 and not more than `999999999999` (section 11).

The customer data never makes the call fail. See the customer rules below.

### Request

Headers: section 5. `Request-Id` is the invoice number. `Request-Target:/checkout/v1/payment` [S27]
[S28].

| Field                       | Value                                                                | Source    |
| --------------------------- | -------------------------------------------------------------------- | --------- |
| `order.invoice_number`      | The ULID of the session id. See above.                               | [S1]      |
| `order.amount`              | `MathBN.convert(input.amount).toNumber()`. Whole rupiah. Section 11. | [S1]      |
| `order.currency`            | `"IDR"`                                                              | [S1]      |
| `order.callback_url`        | `${storefrontUrl}/checkout/return`                                   | [S1] [S3] |
| `order.callback_url_result` | `${storefrontUrl}/checkout/return`                                   | [S1]      |
| `order.auto_redirect`       | `true`                                                               | [S1]      |
| `payment.payment_due_date`  | `60` (minutes). Section 10.                                          | [S1] [S4] |
| `customer`                  | See the customer rules below.                                        | [S1]      |

- `auto_redirect: true` sends the customer from the DOKU result page to the callback URL [S1].
- The docs list `order.auto_redirect` as mandatory, but the basic sample omits it [S1]. The docs do
  not agree with themselves. Always send it. **Unverified:** the value `true` has no side effect on
  the methods of this document. Test: pay with each method in the sandbox and check that the browser
  comes back to the return page.
- Send `callback_url` and `callback_url_result` with the same value. `callback_url` is the "Back to
  Merchant" button of the main page. `callback_url_result` is the button of the result page [S1].
- After a payment in the simulator, DOKU sends the customer to `callback_url` [S3].
- **Unverified:** DOKU adds query parameters to the callback URL. The return page ignores them, so
  the answer changes nothing.
- Do not send `order.line_items`, `payment.payment_method_types`, `shipping_address`,
  `billing_address` or `additional_info`. The basic request works for the methods below [S1].
- Do not send `payment.type`. The default is a sale. `AUTHORIZE` puts a card payment "On Hold"
  [S1].
- Do not send `order.disable_retry_payment`. When it is absent, a customer whose payment failed can
  try again on the DOKU page [S1].

### Customer rules

The limits come from [S1]. The handling of a value above a limit is a design choice: the provider
omits or cuts a field and never throws, because all customer fields are optional for the methods
below [S1].

| Field                | Value from `data.customer`                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `customer.name`      | `first_name`, filtered (see below), cut to 255 characters. Omit if empty.                        |
| `customer.last_name` | `last_name`, filtered, cut to 16 characters. Omit if empty, or if `customer.name` is omitted.    |
| `customer.email`     | `email`, if it has 128 characters or less. Else omit.                                            |
| `customer.phone`     | `phone` without a leading `+`, if the result matches `/^\d{8,16}$/`. Else omit. `6281234567890`. |

- The filter: replace each character that does not match `/[\p{L} ]/u` with nothing, collapse two or
  more spaces into one, and trim. DOKU says "Allowed chars: alphabetic" for the name [S1]. A
  Unicode letter is a letter, so "José" stays "José".
- **Unverified:** DOKU accepts a space or a non-ASCII letter in the name. Test: create payments
  with the names `Siti Aminah` and `José` in the sandbox. If DOKU refuses them, change the filter to
  `/[A-Za-z]/`.
- `customer.phone` has the format `{calling_code}{phone_number}`, for example `6281122334455`, 16
  characters maximum [S1]. The storefront gives `+6281234567890` (README, "Inputs from Medusa").
- If `data.customer` is absent, or each field is omitted, do not send the `customer` object. A card
  payment needs an email or a phone [S22]. The storefront always gives both.

### Payment methods

The basic request works only for these methods [S1]:

- Virtual Account (the `VIRTUAL_ACCOUNT_*` values of [S5]).
- Credit Card (`CREDIT_CARD`).
- QRIS (`QRIS`).
- Convenience Store (`ONLINE_TO_OFFLINE_ALFA`, `ONLINE_TO_OFFLINE_INDOMARET`).
- E-money OVO and LinkAja (`EMONEY_OVO`, `EMONEY_LINKAJA`).

Other methods need fields that the provider does not have, for example `line_items` for Akulaku,
Kredivo, Indodana, Jenius and KKI [S1]. Do not select them in the dashboard (section 3, step 3).
**Unverified:** ShopeePay, DANA and DOKU Wallet work with the basic request. Test each one in the
sandbox before you select it.

### Response

Success: HTTP 200 [S1]. A repeat of the same `Request-Id` and body gives HTTP 409 with the same body
[S20]. Treat the call as a success only when all three are true. The official plugin uses the same
check [S28]:

- the HTTP status is 200 or 409;
- `message[0]` is `"SUCCESS"`;
- `response.payment.url` is a string that starts with `https://`.

| Field                           | Use                                                                                            | Source |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ------ |
| `response.payment.url`          | The hosted page. Store it as `payment_url`.                                                    | [S1]   |
| `response.payment.token_id`     | The DOKU token of the page. Do not store it. The provider does not use it.                     | [S1]   |
| `response.payment.expired_date` | The expiry, `yyyyMMddHHmmss` in UTC+7, for example `20261018114711`. Store it as `expires_at`. | [S1]   |
| `response.order.invoice_number` | The same value as the request.                                                                 | [S1]   |
| `response.order.amount`         | The same amount as the request, but as a string, for example `"20000"`.                        | [S1]   |

- Convert `expired_date` to ISO 8601: `"20261018114711"` becomes `"2026-10-18T11:47:11+07:00"`.
- If `expired_date` is absent or does not match `/^\d{14}$/`, omit `expires_at` (design choice).

Failure: HTTP 400 with `{ "error_messages": ["order.invoice_number must be filled", ...] }` [S1].
Throw a `MedusaError` of the type `UNEXPECTED_STATE` (README, "initiatePayment") with this message
(design choice):

- `DOKU create payment failed: HTTP <status>: <detail>`.
- `<detail>` is the first value that exists: `error_messages` joined with `"; "`, `message` joined
  with `"; "`, the first 200 characters of the response text, or `"no payment URL"`.

### Session data

`initiatePayment` returns `{ id: invoice_number, data }`. `data` has only the keys of README,
"Session data", and no secret:

| Key                   | Value                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| `payment_url`         | `response.payment.url`                                                   |
| `doku_invoice_number` | The invoice number. This is the gateway payment id.                      |
| `amount`              | The amount in whole rupiah, as a number.                                 |
| `session_id`          | `input.data.session_id`                                                  |
| `expires_at`          | The converted `expired_date`. Absent if DOKU gives no valid expiry date. |

### Checkout label

The README section "Checkout label" asks for two locale keys. The values (design choice):

| Key                                      | `en.json`                                                           | `id.json`                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `checkout.paymentProviders.pp_doku_doku` | `DOKU`                                                              | `DOKU`                                                                 |
| `checkout.paymentHints.pp_doku_doku`     | `Pay with a virtual account, QRIS, a card or OVO on the DOKU page.` | `Bayar dengan virtual account, QRIS, kartu, atau OVO di halaman DOKU.` |

Change the hint if the client selects other methods (section 6).

## 7. Payment status

`authorizePayment`, `getPaymentStatus`, `retrievePayment`, `refundPayment`, the "No signature" path
of the webhook and the recovery adapter call the check status API [S19]:

- `GET {apiUrl}/orders/v1/status/{doku_invoice_number}`.
- The headers of section 5, with no `Digest`. `Request-Target:/orders/v1/status/<invoice number>`
  [S10] [S27].
- The path accepts the invoice number or the `Request-Id` [S19]. Use the invoice number.

The fields that the provider reads [S6] [S19]:

| Field                             | Meaning                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `transaction.status`              | The payment status. See the map below.                                                          |
| `order.amount`                    | The amount. It can be a number (`150000`), a number with decimals (`120000.0`) or a string.     |
| `order.status`                    | `ORDER_GENERATED`, `ORDER_EXPIRED` or `ORDER_RECOVERED`. Only some merchants get it. See below. |
| `service.id`                      | The service, for example `VIRTUAL_ACCOUNT`, `CREDIT_CARD`, `QRIS`, `EMONEY`.                    |
| `channel.id`                      | The channel, for example `VIRTUAL_ACCOUNT_BCA`.                                                 |
| `transaction.original_request_id` | The request id of the channel payment. The card refund needs it (section 9).                    |

- Convert the amount with `Number(order.amount)` before you compare. Then compare it with
  `data.amount` (section 11).
- Call the check status API 60 seconds or more after the payment completes [S19]. An earlier call
  can give a status that is not final. See section 14, trap 2.
- `order.status` and the order-level `PENDING` come only for merchants registered from December
  2024, or after DOKU support turns the feature on [S6]. For other merchants, the API gives "Not
  Found" until the customer selects a channel [S6].
- **Unverified:** the response for an unknown invoice ("Not Found"). The docs give no error body.
  The official plugin treats a body with no `transaction` object as an error [S28]. Test: call the
  check status API with an unknown invoice number in the sandbox.

### Three results of one call

Classify each check status call into one of three results (design choice):

| Result      | Condition                                                                  |
| ----------- | -------------------------------------------------------------------------- |
| `status`    | HTTP 200 and the body has a `transaction` object.                          |
| `not found` | HTTP 404, or HTTP 200 with no `transaction` object.                        |
| `failure`   | A network error, a timeout, HTTP 429, HTTP 5xx, or each other HTTP status. |

### The status map

The values of `transaction.status` [S19], and the result in each method of the README contract. Use
the first row that matches, from the top:

| Result or DOKU status                                        | Meaning [S19]                                   | `authorizePayment`                 | `getPaymentStatus` |
| ------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------- | ------------------ |
| `failure` or `not found`                                     | No usable status.                               | throws                             | `pending`          |
| `SUCCESS`, amount equal                                      | Paid. Final.                                    | returns `captured`                 | `captured`         |
| `SUCCESS`, amount different                                  | Paid, but not the order amount.                 | throws, writes an error to the log | `pending`          |
| `REFUNDED` or `PARTIAL_REFUNDED`, amount equal               | Paid, then refunded.                            | throws                             | `captured`         |
| `EXPIRED`, or `order.status` is `ORDER_EXPIRED`              | The due date passed. Final.                     | throws                             | `canceled`         |
| `VOIDED`, or `CANCELLED` (**unverified**)                    | Voided [S18], or closed by the cancel API [S7]. | throws                             | `canceled`         |
| `PENDING`, `REDIRECT`, `TIMEOUT`, `FAILED`, each other value | Not paid yet. `FAILED` is not final [S15].      | throws                             | `pending`          |

- "throws" means `PAYMENT_AUTHORIZATION_ERROR` (README, "authorizePayment").
- `getPaymentStatus` returns `{ status, data: input.data }`.
- The provider never returns `authorized` or `error`. The README explains why `authorizePayment`
  returns only `captured`.
- A refunded payment was paid with the order amount, so it is `captured` (README, "getPaymentStatus":
  "paid with the amount of `data.amount`"). Medusa records the refund itself.
- `ORDER_RECOVERED` has no row of its own. It falls to the last row, unless `transaction.status`
  matches an earlier row.
- For an old merchant account, an abandoned page can stay "Not Found", so `getPaymentStatus` stays
  `pending`. This has no effect on the store flow.
- **Unverified:** the status of an order that the cancel API closed. The report shows `CANCELLED`
  [S7], but the check status docs do not list it. Test: cancel a virtual account order in the
  sandbox, then call the check status API.

`retrievePayment`:

- Result `status`: return `{ data: { ...input.data, gateway_status: transaction.status } }`.
- Result `not found` or `failure`: throw a `MedusaError` of the type `UNEXPECTED_STATE` with the
  HTTP status (design choice). Medusa 2.21.2 does not call this method in the store flow.

The recovery adapter (`recovery.ts`):

- `isSessionPaid(data)`: result `status` gives `transaction.status === "SUCCESS"`. Result `not
found` gives `false`. Result `failure` throws, so the job skips the session for this run.
- `paymentReference(data)` returns `data.doku_invoice_number`.
- `maxSessionsPerRun`: section 12.

## 8. Webhook

DOKU calls the webhook "HTTP Notification" [S13].

### Events

- DOKU sends a `POST` with a JSON body to the notification URL of the channel [S13] [S18].
- DOKU sends a notification when the customer pays. A virtual account sends only `SUCCESS` [S18].
  A card can also send `FAILED`, `VOIDED`, `REFUNDED` and a capture [S18].
- In Checkout, ignore `FAILED`. The customer can try again with another method [S15].
- DOKU can send the same notification more than once [S15]. A repeat is harmless: the workflow does
  not authorize a session two times and does not complete a cart two times [M4].
- The notification URL must answer with HTTP 2xx. Else DOKU tries 3 more times: after 30 minutes,
  6 hours and 12 hours from the first attempt [S16]. The Medusa route always answers HTTP 200
  (README, "The route"). Thus DOKU does not try again, also after a bad signature.
- You can send a notification again by hand: **Integration → HTTP Notification**, then the retry
  icon [S16].
- DOKU can add new fields to the body. Parse it in a non-strict way [S13] [S15].

### Payload

Headers [S18]. Node gives the names in lowercase [N1]:

| Header              | Value                             |
| ------------------- | --------------------------------- |
| `client-id`         | The Client ID of the merchant.    |
| `request-id`        | A unique id of this notification. |
| `request-timestamp` | The time in UTC, ISO 8601.        |
| `signature`         | `HMACSHA256=<base64>`             |

If a header value is an array, use its first element [N1].

Body fields that the provider reads [S18]:

| Field                  | Use                                                         |
| ---------------------- | ----------------------------------------------------------- |
| `order.invoice_number` | The invoice number that the provider sent. The reference.   |
| `order.amount`         | The amount. A number, sometimes with decimals (`20000.00`). |
| `transaction.status`   | `SUCCESS`, `FAILED`, `VOIDED`, `REFUNDED`, and others.      |

- Read the body fields from `payload.data`, the body that Medusa parsed (README, "The event").
- Use `payload.rawData` only for the digest.
- In a unit test, set `rawData` to `Buffer.from(raw)` and `data` to `JSON.parse(raw)` with the same
  string `raw`.

The notification of a Checkout payment has `additional_info.origin.product: "CHECKOUT"` in the card
sample [S18]. Do not depend on it. Other samples do not show it.

### Verification

DOKU signs each notification [S15] [S18]. Thus the README rule "verify the signature" applies.
Do not get the payment again from the API when the signature is valid. The "No signature" path below
is only a fallback for an event that has no `signature` header.

`getWebhookActionAndData(payload)` does these steps. It never throws. Wrap the body of the method in
`try`/`catch`, and return `NOT_SUPPORTED` for each error.

1. Read `client-id`, `request-id`, `request-timestamp` and `signature` from `payload.headers`.
2. If `signature` is absent, go to "No signature" below.
3. If another header is absent, or `client-id` is not the Client ID of the options, write a warning
   to the log and return `NOT_SUPPORTED`.
4. Compute the digest from `payload.rawData`, the raw body: SHA-256, then base64 [S15] [S28]. Do not
   serialize `payload.data` again. A new `JSON.stringify` changes the bytes, for example `20000.00`
   becomes `20000`.
5. Make the component string of section 5 with the header values and
   `Request-Target:/hooks/payment/pp_doku_doku` (`DOKU_NOTIFICATION_PATH`). For a notification, the
   target is the path of the merchant notification URL [S9] [S15].
6. Compute `HMACSHA256=<base64>` with the Secret Key (`dokuSignature`, section 5).
7. Compare it with the `signature` header with `crypto.timingSafeEqual`. Compare the lengths first,
   because `timingSafeEqual` throws for two lengths. If they are not equal, write an error to the
   log and return `NOT_SUPPORTED`.
8. If `transaction.status` is not `SUCCESS`, return `NOT_SUPPORTED`. Do not write to the log. This
   is a normal event.
9. If `order.invoice_number` does not match `/^[0-9A-HJKMNP-TV-Z]{26}(U\d{1,3})?$/`, write a warning
   to the log and return `NOT_SUPPORTED`. It is not a payment of this store.
10. Set `amount = Number(payload.data.order.amount)`. If `amount` is not a finite number more than
    0, write a warning to the log and return `NOT_SUPPORTED`.
11. Return:

```ts
{
  action: PaymentActions.SUCCESSFUL,
  data: { session_id: `payses_${invoiceNumber.slice(0, 26)}`, amount },
}
```

`amount` needs no conversion. DOKU amounts are whole rupiah (section 11).

The provider does not check the age of `request-timestamp` and does not store `request-id` (design
choice). The docs give no time window [S15]. A replayed paid event is harmless: `authorizePayment`
asks the check status API, and the workflow does not complete a cart two times [M4].

**No signature.** The docs show a `Signature` header on each non-SNAP notification [S18]. If a
notification has no `signature` header, do not trust its body:

1. Read only `order.invoice_number` from `payload.data`. Do step 9 above with it.
2. Call the check status API (section 7) with this invoice number.
3. If the result is not `status`, or `transaction.status` is not `SUCCESS`, return `NOT_SUPPORTED`.
   For a `failure`, write an error to the log.
4. Take the amount from `Number(order.amount)` of the API response. Do step 10 above with it.
5. Return `SUCCESSFUL` with `session_id` from the invoice number of step 1.

The `client-id` check does not apply to this path. The API response is the only trusted data.

**Unverified:** a virtual account payment through Checkout sends the non-SNAP format above, not the
SNAP format. Test: pay a virtual account order in the sandbox and look at the body in **Integration
→ HTTP Notification**. If the format is SNAP, the signature check fails, the provider returns
`NOT_SUPPORTED`, and the recovery job completes the cart.

## 9. Refund

- DOKU documents a refund API only for cards: `POST {apiUrl}/cancellation/credit-card/refund`
  [S21]. A refund is also possible in the dashboard [S21].
- The docs of Checkout, virtual account, QRIS and convenience store give no refund API.
- **Unverified:** the official Postman collection uses the path
  `/credit-card/v1/cancellation/credit-card/refund` [S27]. The docs use
  `/cancellation/credit-card/refund` [S21]. Use the docs path. Test: refund a sandbox card payment
  with each path.

`refundPayment` does these steps:

1. Call the check status API (section 7) with `data.doku_invoice_number`. If the result is not
   `status`, throw a `MedusaError` of the type `UNEXPECTED_STATE` with the message
   `DOKU status check failed: HTTP <status>` (design choice). Medusa Admin shows the message, and
   the owner can try again.
2. If `service.id` is not `CREDIT_CARD`, write a warning to the log and return
   `{ data: input.data }`. The owner refunds the customer by hand (README, "refundPayment").
3. Else call the refund API. The headers are those of section 5, with
   `Request-Target:/cancellation/credit-card/refund`. The `Request-Id` rule is in section 5. The
   body has only the three fields of [S21]. It has no `refund.type`. DOKU sets the type [S21].

```json
{
  "order": { "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0" },
  "payment": { "original_request_id": "<transaction.original_request_id from step 1>" },
  "refund": { "amount": 95000 }
}
```

4. Success: the HTTP status is 200 or 409, and `refund.status` is `SUCCESS` [S20] [S21]. HTTP 409
   repeats the first response of the same `Request-Id` [S20]. Return
   `{ data: { ...input.data, refund_ids } }`. `refund_ids` is the old list plus the `Request-Id` of
   this call. Do not add the `Request-Id` when the list already has it.
5. Each other result is a failure. Throw a `MedusaError` of the type `UNEXPECTED_STATE` with the
   message `DOKU refund failed: <detail>` (design choice). `<detail>` is the first value that
   exists: `error.message` (for example "Total Refund amount is Bigger than Original Transaction"
   [S21]), `refund.status`, or `HTTP <status>`.

DOKU gives no refund id. The response has `refund.approval_code` only for a success [S21]. Thus the
`Request-Id` is the id in `refund_ids` (design choice).

Rules [S21]:

- A partial refund is possible. More than one refund is possible until the total reaches the
  original amount.
- Before DOKU settles the funds to the bank account, DOKU does a `VOID`. A void must have the full
  amount, else it fails. Thus a partial refund fails before settlement.
- The `refund.type` of the response can be `MANUAL_PARTIAL_REFUND` or `MANUAL_FULL_REFUND`. DOKU
  then returns the money by hand, in several days. `refund.status` has only the values `SUCCESS`
  and `FAILED`. Thus a manual refund with `SUCCESS` is a success for Medusa.
- With a "Cards Direct" contract, the acquiring bank decides if an online refund is possible.
- `refund.amount` is a number in whole rupiah (section 11).
- **Unverified:** `transaction.original_request_id` from the check status API is the correct
  `payment.original_request_id` for a Checkout card payment. The refund docs say "Request ID from
  payment initiation" [S21]. The Checkout status samples show a DOKU number, for example `"76392"`,
  not the `Request-Id` of the create call [S6]. Test: refund a sandbox card payment with this value.
  If DOKU refuses it, use `doku_invoice_number`, which is the `Request-Id` of the create call
  (section 5).
- **Unverified:** the HTTP status of a failed refund. The docs do not give it [S21]. Step 5 does
  not depend on it.

## 10. Expiry, cancellation and update

### Expiry

- `payment.payment_due_date` is the life of the page in minutes. The default is 60 minutes. It has
  6 digits maximum [S1] [S4].
- Send `60`. Keep the value below 2880 (48 hours). The recovery job ignores a session that is older
  than 48 hours (README, "Recovery adapter").
- For a virtual account or a convenience store, the customer pays later at a bank or a shop. If the
  client wants more time, raise the value, for example to `1440`.
- After the due date, the status is `EXPIRED` and `order.status` is `ORDER_EXPIRED` [S6] [S19].
- Do not send `order.recover_abandoned_cart`. It lets the customer pay an expired order again [S1].

### Cancellation

`cancelPayment` and `deletePayment` call `POST {apiUrl}/checkout/v3/cancellations` [S7]:

```json
{
  "order": { "invoice_number": "<data.doku_invoice_number>" },
  "payment": { "original_request_id": "<data.doku_invoice_number>" },
  "note": "Medusa payment session closed"
}
```

- `payment.original_request_id` is "the original request id that used to generate the URL" [S7].
  The create call used the invoice number as its `Request-Id` (section 5). Thus both fields have the
  invoice number.
- The headers are those of section 5, with `Request-Target:/checkout/v3/cancellations`.
- The API closes only an unpaid order with a virtual account (not BTN, BNC, BPD or OCBC) or QRIS.
  It does not close cards, e-wallets, convenience stores, direct debit, paylater, KKI or digital
  banking [S7].
- The API works only after the owner turns on **Order Cancellation** (section 3, step 8) [S7].
- A paid or expired order cannot be cancelled [S7].
- The docs give no response body [S7]. Treat HTTP 200 as a success. For each other result, write a
  warning to the log and return `{ data: input.data }` (README, "cancelPayment"). The page expires
  at the due date.

### Update

`updatePayment` does these steps:

1. Call the cancel API for the old order, as `cancelPayment` does, with the old
   `data.doku_invoice_number`. Do not throw.
2. Read the old attempt from the old invoice number: the number after `U`, or `0` if there is no
   `U`. Set `attempt` to the old attempt plus 1.
3. Set `invoice_number = <ULID of data.session_id>U<attempt>`, for example
   `01JABCDEFGHJKMNPQRSTVWXYZ0U1`. The number has 30 characters or less while `attempt` is 999 or
   less. If `attempt` is more than 999, throw a `MedusaError` of the type `INVALID_DATA`.
4. Do the checks and the call of section 6 with `input.amount`, `input.currency_code`,
   `input.data.customer` and the new invoice number.
5. Return `{ data }` with the new session data of section 6. Do not return a `status`.

**Unverified:** DOKU refuses an invoice number that an earlier order used. The suffix avoids the
question. Medusa 2.21.2 does not call `updatePayment` in the store flow (README, "updatePayment").

## 11. Amount and currency

- `order.amount` is a number "in IDR Currency and without decimal", 12 digits maximum [S1].
- Thus the DOKU unit is whole rupiah, the same unit as Medusa. There is no conversion:
  `order.amount = MathBN.convert(input.amount).toNumber()`.
- Throw a `MedusaError` of the type `INVALID_DATA` in `initiatePayment` when the amount is not a
  whole number, or is 0 or less, or is more than `999999999999` (12 digits).
- `order.currency` is `IDR` (the default) [S1]. `initiatePayment` refuses each currency other than
  `idr` (README, "initiatePayment").
- DOKU gives amounts in three forms: a string in the create response (`"20000"`) [S1], a number
  with decimals in some notifications and statuses (`20000.00`, `120000.0`) [S6] [S18], and a
  plain number [S18] [S19]. Use `Number(value)` on each. Compare with `===` after the conversion.
- The webhook result needs no conversion back. `amount` is already whole rupiah.
- **Unverified:** the minimum amount of each channel. The docs give none for Checkout. Test: create
  a payment of `10000` in the sandbox, and pay it with each channel that the client uses.

## 12. Rate limits

- The docs give no rate limit for the Checkout API or the check status API.
- The response code tables of the SNAP channels list HTTP 429 "Too Many Requests" [S23]. An HTTP 429
  is a `failure` (section 7): `authorizePayment` throws `PAYMENT_AUTHORIZATION_ERROR`, and
  `isSessionPaid` throws, so the job skips the session for this run.
- Set `maxSessionsPerRun: 20` in the recovery adapter (design choice). **Unverified:** the real
  limit. Ask DOKU support before a store has more than 20 open DOKU payments at one time.

## 13. Sandbox tests

- Payment simulator: https://sandbox.doku.com/integration/simulator/ [S3]. Create an order in the
  storefront, open the DOKU page, select a method, then pay the code (virtual account, QRIS,
  convenience store) in the simulator.
- Test cards: https://sandbox.doku.com/integration/simulator/credit-card [S22].
- A demo of the Checkout page: https://sandbox.doku.com/demo/checkout-api [S29].
- The notification URL must be reachable from the internet. DOKU does not send to `localhost`, to a
  URL with authentication, or behind a VPN [S14].
- DOKU refuses an `ngrok` domain [S14]. Use a staging server, or a tunnel with another domain. The
  docs name `localhost.run` [S14].
- Each notification and its delivery status is in **Integration → HTTP Notification**. You can send
  it again from there [S16].
- A sandbox order shows in **Report → Checkout Orders** with the status Pending, Success or Expired
  [S6].

Do these tests for each method that the client uses. They replace README steps 24 to 26 for DOKU.

1. Pay at once. The customer comes back to the return page. The page can show "pending" (section
   14, trap 2). Within 15 minutes, the cart becomes an order.
2. Close the browser on the DOKU page after the payment. Within 15 minutes, the cart becomes an
   order. In **Integration → HTTP Notification**, check that DOKU sent the notification and got
   HTTP 200. In the backend log, check that the provider did not log a bad signature.
3. Let a page expire. The check status API gives `EXPIRED`.
4. Refund a card payment from Medusa Admin, one time with the full amount and one time with a part
   (section 9).
5. Settle each **unverified** mark of section 2, and write the answer in this document.

## 14. Traps

1. **The session id is too long for an invoice number.** A Medusa session id has 33 characters
   with `_` [M1] [M2]. DOKU allows 30 characters for cards and no symbol for KKI [S1] [S22]. Send
   the 26-character ULID (section 6).
2. **The status API is late.** DOKU says to call the check status API 60 seconds or more after the
   payment [S19]. The return page tries for about 10 seconds (README, "What a gateway adds"). Thus
   the return page often shows "pending". Medusa calls `authorizePayment` for the webhook after a
   delay of 5 seconds, with 3 attempts (README, "The route"). If the status is not `SUCCESS` yet,
   `authorizePayment` throws and the workflow fails [M4]. **Unverified:** the delay between the 3
   attempts, so the webhook can fail for each attempt. The recovery job runs every 15 minutes and
   completes the cart (README, "Recovery adapter"). Tell the client that a DOKU order can take up to
   15 minutes to show as paid.
3. **The digest uses the raw body.** Compute the notification digest from `payload.rawData`. A
   parsed and serialized body has other bytes (section 8).
4. **The signature includes the path.** The webhook URL in the dashboard must have the exact path
   `/hooks/payment/pp_doku_doku`. Medusa also accepts `/hooks/payment/doku_doku` (README, "The
   route"), but then the signature check fails.
5. **One request body, one string.** Compute the request digest from the exact string that you
   send. Do not let `fetch` or a library serialize the object a second time.
6. **`FAILED` is not final in Checkout.** The customer can retry on the same page. Ignore `FAILED`
   in the webhook. `authorizePayment` throws, `getPaymentStatus` gives `pending`, and
   `isSessionPaid` gives `false` [S15].
7. **The amount has many forms.** String, integer or decimal (section 11). Always use `Number()`.
8. **The webhook answers 200 for a bad signature.** DOKU then does not try again [S16]. Find the
   notification in **Integration → HTTP Notification** and send it again by hand.
9. **A refund API exists only for cards** [S21]. For the other channels the owner returns the money
   by hand. A partial card refund fails before settlement (section 9).
10. **The cancel API is off by default** and works only for virtual accounts and QRIS [S7].
11. **The notification URL is set per channel group** [S14]. If you add a channel later, set the URL
    there too. `additional_info.override_notification_url` can change the host, but the path must
    stay the same as the configured URL [S17]. The provider does not use it.
12. **Phone without `+`.** DOKU wants `6281234567890` [S1].
13. **Name with letters only, last name 16 characters maximum** [S1] (section 6).
14. **Some methods need line items.** Akulaku, Kredivo, Indodana, Jenius, KKI and Allobank need
    `order.line_items` with prices that add up to `order.amount` [S1]. The provider does not send
    them. Do not select these methods.
15. **Old merchant accounts get "Not Found".** Before December 2024, the check status API gives
    "Not Found" until the customer selects a channel [S6]. Treat it as "not paid".
16. **Do not use the DOKU SDK.** The official SDK supports only SNAP virtual accounts, direct debit
    and e-wallets, not Checkout [S26]. Use the global `fetch` (README, "Module and registration").
17. **No `ngrok`.** DOKU refuses an `ngrok` notification URL [S14].
18. **The key name differs.** The docs say "Secret Key" [S9] [S25]. The official plugin calls it
    `shared_key` [S28]. It is the same key. This document uses `DOKU_SECRET_KEY`.

## 15. Example JSON for test mocks

The values below are test values. They are not real keys.

Options: `{ storefrontUrl: "https://shop.test", apiUrl: "https://doku.test", clientId:
"BRN-0000-TEST", secretKey: "SK-test-secret" }`. The session id is
`payses_01JABCDEFGHJKMNPQRSTVWXYZ0`, so the invoice number is `01JABCDEFGHJKMNPQRSTVWXYZ0`. The
amount is `95000`.

### The fetch mock

`apps/backend/integration-tests/helpers/doku-mock.ts` (README, "HTTP integration test"). Its
interface (design choice):

```ts
export type DokuMockOrder = {
  invoiceNumber: string
  amount: number
  status: string // the transaction.status: "PENDING" at the start
  serviceId: string // "VIRTUAL_ACCOUNT" at the start
  cancelled: boolean
}

export function installDokuMock(origin = "https://doku.test"): {
  orders: Map<string, DokuMockOrder>
  setStatus(invoiceNumber: string, status: string): void
  setAmount(invoiceNumber: string, amount: number): void
  restore(): void
}
```

The mock replaces `global.fetch` for `origin` only. It gives each other URL to the original
`fetch`. It routes these calls:

| Call                                    | Mock behavior                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POST /checkout/v1/payment`             | Stores an order. Returns HTTP 200 with the create response below, `url` `https://doku.test/pay/<invoice>`. |
| `GET /orders/v1/status/<invoice>`       | Returns HTTP 200 with the "paid" or "not paid" body below, from the stored order. HTTP 404 `{}` if absent. |
| `POST /checkout/v3/cancellations`       | Sets `cancelled: true` and `status: "CANCELLED"` on the order. Returns HTTP 200 `{}`.                      |
| `POST /cancellation/credit-card/refund` | Returns the refund success body below.                                                                     |

- The mock checks that the four headers of section 5 are present. It does not verify the signature.
  The unit tests verify the signature with the vectors below.
- The test "the old hosted payment is closed" (README, "HTTP integration test") is required. It
  checks that the old order has `cancelled: true` after a change of the cart total.

### Create: request body (`POST /checkout/v1/payment`)

```json
{
  "order": {
    "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0",
    "amount": 95000,
    "currency": "IDR",
    "callback_url": "https://shop.test/checkout/return",
    "callback_url_result": "https://shop.test/checkout/return",
    "auto_redirect": true
  },
  "payment": { "payment_due_date": 60 },
  "customer": {
    "name": "Siti",
    "last_name": "Aminah",
    "email": "siti@example.com",
    "phone": "6281234567890"
  }
}
```

### Create: success response (HTTP 200), from the shape of [S1]

```json
{
  "message": ["SUCCESS"],
  "response": {
    "order": {
      "amount": "95000",
      "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0",
      "currency": "IDR",
      "session_id": "2ebffd22d23e436895ce5c38f7ddcf86"
    },
    "payment": {
      "payment_method_types": ["VIRTUAL_ACCOUNT_BCA", "CREDIT_CARD", "QRIS"],
      "payment_due_date": 60,
      "token_id": "2ebffd22d23e436895ce5c38f7ddcf8620261018094712362",
      "url": "https://sandbox.doku.com/checkout-link-v2/2ebffd22d23e436895ce5c38f7ddcf8620261018094712362",
      "expired_date": "20261018114711"
    },
    "uuid": 2225240712094712339107164227041411929328,
    "headers": {
      "request_id": "01JABCDEFGHJKMNPQRSTVWXYZ0",
      "signature": "HMACSHA256=cyoua5cA6DR5mG/4vw3ice48KjCX+CGdLdSfMumJUuo=",
      "date": "2026-10-18T03:47:11Z",
      "client_id": "BRN-0000-TEST"
    }
  }
}
```

- `response.order.session_id` is a DOKU session id. It is not the Medusa session id. Ignore it.
- `response.uuid` is a number with 40 digits [S1]. `JSON.parse` loses its precision. The provider
  does not read it, so this causes no error.
- Expected session data: `{ payment_url: "https://sandbox.doku.com/checkout-link-v2/...",
doku_invoice_number: "01JABCDEFGHJKMNPQRSTVWXYZ0", amount: 95000, session_id:
"payses_01JABCDEFGHJKMNPQRSTVWXYZ0", expires_at: "2026-10-18T11:47:11+07:00" }`.

### Create: failure response (HTTP 400), from [S1]

```json
{
  "error_messages": ["order.invoice_number must be filled", "order.amount must greater than 0"]
}
```

Expected error message: `DOKU create payment failed: HTTP 400: order.invoice_number must be
filled; order.amount must greater than 0`.

### Check status: paid (HTTP 200), from the shape of [S19]

```json
{
  "order": {
    "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0",
    "amount": 95000
  },
  "transaction": {
    "status": "SUCCESS",
    "date": "2026-10-18T03:24:23Z",
    "original_request_id": "76392"
  },
  "service": { "id": "VIRTUAL_ACCOUNT" },
  "acquirer": { "id": "BCA" },
  "channel": { "id": "VIRTUAL_ACCOUNT_BCA" },
  "virtual_account_info": { "virtual_account_number": "1900600000000046" }
}
```

For the "different amount" test, use the same body with `"amount": 90000`. For a card refund test,
use `"service": { "id": "CREDIT_CARD" }` and `"channel": { "id": "CREDIT_CARD" }`.

### Check status: not paid, channel not selected (HTTP 200), from [S6]

```json
{
  "order": {
    "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0",
    "amount": 95000,
    "status": "ORDER_GENERATED",
    "date": "2026-10-18T02:58:30Z"
  },
  "transaction": {
    "status": "PENDING",
    "date": "2026-10-18T02:58:30Z",
    "original_request_id": "3719"
  },
  "service": { "id": "" },
  "acquirer": { "id": "" },
  "channel": { "id": "" }
}
```

For the expiry test, set `order.status` to `ORDER_EXPIRED` and `transaction.status` to `EXPIRED`.
For "Not Found", use HTTP 404 with `{}` (**unverified**, section 7).

### Notification: paid virtual account, with a valid signature

Headers:

```text
client-id: BRN-0000-TEST
request-id: 479b663f-5c9d-400d-8e80-3e548a8f7639
request-timestamp: 2026-10-18T03:24:25Z
signature: HMACSHA256=xTopyGMIlhGI7jY31p205RmeH/6gKTFWCt1pbEMC5Oc=
```

Raw body. The shape is from [S18]. The bytes are exactly this one line: compact JSON with the keys
in this order, UTF-8, and no newline at the end. Copy it into the test as a string literal.

```text
{"service":{"id":"VIRTUAL_ACCOUNT"},"acquirer":{"id":"BCA"},"channel":{"id":"VIRTUAL_ACCOUNT_BCA"},"transaction":{"status":"SUCCESS","date":"2026-10-18T03:24:23Z","original_request_id":"76392"},"order":{"invoice_number":"01JABCDEFGHJKMNPQRSTVWXYZ0","amount":95000},"virtual_account_info":{"virtual_account_number":"1900600000000046"}}
```

- The digest of this body is `UHhjkdTplHWETx9nY3L3ky6YLjRdEXt9kIkltfCPHbw=`.
- The signature uses `Request-Target:/hooks/payment/pp_doku_doku` and the secret `SK-test-secret`.
- This document computed the digest and the signature with the procedure of [S9]. They are not DOKU
  values. They let a unit test check `dokuSignature` without a sandbox.
- Payload: `{ data: JSON.parse(raw), rawData: Buffer.from(raw), headers }`.
- Expected result: `{ action: "captured", data: { session_id: "payses_01JABCDEFGHJKMNPQRSTVWXYZ0",
amount: 95000 } }`. `"captured"` is the value of `PaymentActions.SUCCESSFUL` [M3].
- Bad signature test: change one character of the `signature` header. Expected result:
  `{ action: "not_supported" }` [M3].
- Unpaid test: the same body with `"status":"FAILED"` in place of `"status":"SUCCESS"`, and the
  signature `HMACSHA256=I+Jcu3v/Jsr0j/puMMobH/v6S4nOH2JV4XgLhejsy4c=`. The signature is valid.
  Expected result: `{ action: "not_supported" }`.
- No signature test: the paid body with no `signature` header, and a fetch mock that gives the
  "not paid" status body. Expected result: `{ action: "not_supported" }`. With the "paid" status
  body, the expected result is the paid result above.

Check status signature test vector: `Client-Id:BRN-0000-TEST`,
`Request-Id:d895fb53-479c-4f77-a76a-ab81b40d77cb`, `Request-Timestamp:2026-10-18T03:30:00Z`,
`Request-Target:/orders/v1/status/01JABCDEFGHJKMNPQRSTVWXYZ0`, no `Digest`, secret
`SK-test-secret`. The result is `HMACSHA256=df57IhfXfuNnMoaCD9dlxQOcT6FWlqjlQhXl37mZJMw=`.

### Card refund: success (HTTP 200), from [S21]

```json
{
  "order": { "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0" },
  "payment": { "original_request_id": "76392" },
  "refund": {
    "amount": 95000,
    "type": "FULL_REFUND",
    "status": "SUCCESS",
    "message": "Approved",
    "approval_code": "12321"
  }
}
```

### Card refund: failure, from [S21]

```json
{
  "order": { "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0" },
  "payment": { "original_request_id": "76392" },
  "refund": {
    "amount": 200000,
    "type": "FULL_REFUND",
    "status": "FAILED"
  },
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Total Refund amount is Bigger than Original Transaction",
    "type": "Payment Failed"
  }
}
```

The docs do not give the HTTP status of this response (**unverified**, section 9). Use HTTP 400 in
the mock. Expected error message: `DOKU refund failed: Total Refund amount is Bigger than Original
Transaction`.

### Cancel: request body (`POST /checkout/v3/cancellations`), from [S7]

```json
{
  "order": { "invoice_number": "01JABCDEFGHJKMNPQRSTVWXYZ0" },
  "payment": { "original_request_id": "01JABCDEFGHJKMNPQRSTVWXYZ0" },
  "note": "Medusa payment session closed"
}
```

The docs give no response body [S7]. Use HTTP 200 with `{}` in the mock.
