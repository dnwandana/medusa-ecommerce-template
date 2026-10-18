# Mayar payment gateway

Checked on: 2026-10-18

This document gives the facts of the Mayar Headless API for a Mayar provider. Read
[README.md](README.md) first. The README gives the contract. This document gives only the Mayar
facts.

| Item            | Value                            |
| --------------- | -------------------------------- |
| `<slug>`        | `mayar`                          |
| `<provider_id>` | `pp_mayar_mayar`                 |
| `<Name>`        | `Mayar`                          |
| `<name>`        | `mayar`                          |
| `<GATEWAY>`     | `MAYAR`                          |
| Module path     | `apps/backend/src/modules/mayar` |
| Hosted payment  | A Mayar invoice                  |

The template had a Mayar provider before. The commit `a9a582a` removed it. Its last version is in
the revision `4aace4f`. Read a file of it with `git show 4aace4f:<path>`, for example
`git show 4aace4f:apps/backend/src/modules/mayar/service.ts`. A fact with the mark "seen in the old
template code (4aace4f)" comes from that code or from its tests, not from the Mayar documentation.

Do not copy the old code without changes. It does not obey the current README in some places. See
[14. Traps](#14-traps).

## 1. Sources

The Mayar documentation has two versions of the Headless API: V1 and V2. Use V2. The migration guide
says: "API V1 is deprecated on 1 October 2026. After that date, all `https://api.mayar.id/hl/v1/*`
endpoints will stop working."

Official Mayar pages (V2):

- Introduction, authentication, sandbox, base URLs, response envelope:
  https://docs.mayar.id/api-reference-v2/introduction
- Migration from V1 to V2: https://docs.mayar.id/api-reference-v2/migration-from-v1
- Status codes: https://docs.mayar.id/api-reference-v2/statuscode
- Rate limit: https://docs.mayar.id/api-reference-v2/rate-limit
- Create invoice: https://docs.mayar.id/api-reference-v2/invoice/create
- Invoice detail: https://docs.mayar.id/api-reference-v2/invoice/detail
- Invoice list: https://docs.mayar.id/api-reference-v2/invoice/index
- Edit invoice: https://docs.mayar.id/api-reference-v2/invoice/edit
- Change product status (close an invoice): https://docs.mayar.id/api-reference-v2/product/changestatus
- Transaction detail: https://docs.mayar.id/api-reference-v2/transaction/detail
- Register the webhook URL: https://docs.mayar.id/api-reference-v2/webhook/registerurlhook
- Test the webhook URL: https://docs.mayar.id/api-reference-v2/webhook/testurlhook
- Webhook history (with example payloads): https://docs.mayar.id/api-reference-v2/webhook/history
- Webhook new history: https://docs.mayar.id/api-reference-v2/webhook/newhistory
- Retry a webhook: https://docs.mayar.id/api-reference-v2/webhook/retryhistory

Official Mayar pages (other):

- Webhook guide (events and payload fields): https://docs.mayar.id/integration/webhook
- Payment method settings (payment duration, fees): https://docs.mayar.id/features/paymentmethodsetting
- Online payment methods: https://docs.mayar.id/onlinepaymentmethod
- Create invoice, V1 (the only page that lists `redirectUrl`):
  https://docs.mayar.id/api-reference/invoice/create
- The index of all pages: https://docs.mayar.id/llms.txt

Mayar publishes no official SDK for Node.js in its documentation. Call the API with `fetch`.

The old template code at the revision `4aace4f`:

- `apps/backend/src/modules/mayar/client.ts`, `service.ts`, `invoice.ts`, `types.ts`, `index.ts`
- `apps/backend/src/modules/mayar/__tests__/` (`client`, `invoice`, `initiate`, `authorize`,
  `close` and `webhook` unit tests, and `helpers.ts`)
- `apps/backend/integration-tests/helpers/mayar-mock.ts`
- `apps/backend/integration-tests/http/mayar-checkout.spec.ts`
- `apps/backend/src/recovery/dependencies.ts` and `check-paid-carts.ts` (the old recovery code)
- `git show a345902:docs/mayar-sandbox-check.md`: a sandbox check that did not run, because the
  owner had no sandbox key. Thus the old code never ran against the real API.

## 2. Check before you build

Check these pages again before you write code. APIs change.

Give special attention to these items:

- The field `redirectUrl` on the V2 create page. On the day of the check, the page does not list
  it. See [6. Create a hosted payment](#6-create-a-hosted-payment).
- A signature or a token on the webhook. On the day of the check, no page describes one.
- A refund API. On the day of the check, no page describes one.
- The page for `POST /hl/v2/payments/simulate`. On the day of the check, only the migration guide
  names it.

## 3. Account and dashboard setup

Sandbox:

1. Register or log in at https://web.mayar.io/. This is the sandbox dashboard.
2. Open https://web.mayar.io/api-keys. Create an API key with the scope **Read & Write**. A **Read
   Only** key can call only the `GET` endpoints, and the provider must call `POST` endpoints.
3. Open **Integration → Webhook**. In the field "URL Webhook", write
   `https://<public host>/hooks/payment/pp_mayar_mayar`. Click save. Then test the URL. You can
   also set the URL with the API: `POST /hl/v2/webhooks/update` with the body
   `{ "urlHook": "<url>" }`.
4. Open **Settings → Payment Methods**. Enable the payment methods that the client uses. The Mayar
   hosted page shows all the enabled methods.
5. On the same tab, set the payment duration (from 10 minutes to 1 month). This duration applies to
   the payment code (for example a virtual account number) after the customer selects a method.

Production:

1. Register at https://mayar.id. Complete the business verification. Mayar requires it before you
   can sell.
2. Open https://web.mayar.id/api-keys. Create an API key with the scope **Read & Write**.
3. Open **Integration → Webhook**. Set `https://api.<domain>/hooks/payment/pp_mayar_mayar`.
4. Set the payment methods and the payment duration as in the sandbox.

The return URL: the provider sends `redirectUrl` in each create request. There is no dashboard
setting for it in the documentation. See [6. Create a hosted payment](#6-create-a-hosted-payment).

The Introduction page says: "any changes to your domain or subdomain require you to create a new API
KEY, so the link in the response you receive will also be updated." That this domain is the store
domain in the Mayar account (the host of the invoice link) is **unverified**.

## 4. Environment variables

| Key             | Purpose                         | Development value (`apps/backend/.env.example`) | Test value (`apps/backend/.env.test`) | Production value (`.env.example`) |
| --------------- | ------------------------------- | ----------------------------------------------- | ------------------------------------- | --------------------------------- |
| `MAYAR_API_URL` | Base URL of the Headless API V2 | `https://api.mayar.io/hl/v2`                    | `https://mayar.test/hl/v2`            | `https://api.mayar.id/hl/v2`      |
| `MAYAR_API_KEY` | API key, scope Read & Write     | empty                                           | `test-key`                            | `change-me`                       |

- The old template code used the same two names (seen in the old template code (4aace4f),
  `apps/backend/.env.example` and `apps/backend/src/config/modules.ts`).
- The comment for `apps/backend/.env.example` can be: "Mayar sandbox. Get a key at
  https://web.mayar.io/api-keys (scope: Read & Write)." This text is seen in the old template code
  (4aace4f).
- `mayarClientOptions(env)` in `client.ts` returns:

```ts
export function mayarClientOptions(env: Record<string, string | undefined>) {
  return {
    apiUrl: env.MAYAR_API_URL || MAYAR_SANDBOX_URL,
    apiKey: env.MAYAR_API_KEY || "",
  }
}
```

- `constants.ts` has all the constants of the provider:

```ts
export const MAYAR_PROVIDER_ID = "pp_mayar_mayar"
export const MAYAR_SANDBOX_URL = "https://api.mayar.io/hl/v2"
export const MAYAR_REQUEST_TIMEOUT_MS = 10_000
export const MAYAR_INVOICE_LIFETIME_MS = 24 * 60 * 60 * 1000
export const MAYAR_INVOICE_DESCRIPTION = "Order payment"
export const MAYAR_MAX_SESSIONS_PER_RUN = 40
```

- Mayar has no webhook secret. Thus there is no third key.
- The test host `https://mayar.test` with the path `/hl/v2` matches the old fetch mock (seen in the
  old template code (4aace4f), `integration-tests/helpers/mayar-mock.ts`).

## 5. Base URLs and authentication

| Environment | Base URL                     | Dashboard             | API keys                      |
| ----------- | ---------------------------- | --------------------- | ----------------------------- |
| Sandbox     | `https://api.mayar.io/hl/v2` | https://web.mayar.io/ | https://web.mayar.io/api-keys |
| Production  | `https://api.mayar.id/hl/v2` | https://web.mayar.id/ | https://web.mayar.id/api-keys |

- Use a sandbox key with `api.mayar.io` and a production key with `api.mayar.id` (migration guide,
  section 2). What happens with a key on the wrong host is **unverified**.
- Send these headers with each request:

```http
Authorization: Bearer <MAYAR_API_KEY>
Content-Type: application/json
Accept: application/json
```

- The old client sent exactly these three headers (seen in the old template code (4aace4f),
  `client.unit.spec.ts`). `Content-Type` on a `GET` request did no harm in the tests. Its effect
  on the real API is **unverified**.
- Remove a trailing slash from `apiUrl` before you add a path (seen in the old template code
  (4aace4f)).
- Each V2 response has this envelope: `{ "statusCode": <number>, "messages": "<text>", "data": ... }`.
  Some write endpoints return `message` (singular) in place of `messages`.
- The body `statusCode` is the real status. The migration guide says: "some V2 write endpoints
  return HTTP 200 with a non-200 statusCode in the body ... Treat the body statusCode as
  authoritative."

The client rule (seen in the old template code (4aace4f), `client.ts`):

1. If `apiKey` is empty, throw before the call. Do not call Mayar.
2. Read the body as text. Parse it as JSON.
3. `status` = the body `statusCode` if it is a number, else the HTTP status.
4. The call failed if the body is not a JSON object, or the HTTP status is not 2xx, or `status` is
   400 or more.
5. For a failed call, the error text is the body `messages`, else the body `message`, else the raw
   text. Put the method, the path, `status` and the error text in the error message. Do not put the
   API key in the message.
6. A network failure or a timeout has no status. Put the cause in the message.

### The client

`client.ts` exports the class `MayarClient`, the error class `MayarApiError` and the function
`mayarClientOptions(env)`. The names are the names of the old code (seen in the old template code
(4aace4f), `client.ts`).

```ts
export class MayarApiError extends Error {
  status?: number // the status of rule 3; absent for a network failure
}

export class MayarClient {
  constructor(options: { apiUrl: string; apiKey: string })
  createInvoice(
    input: MayarInvoiceInput
  ): Promise<{ id: string; link: string; transactionId?: string; expiredAt?: number }>
  getInvoice(invoiceId: string): Promise<MayarInvoice> // the `data` object of the detail response
  closeInvoice(invoiceId: string): Promise<void>
}
```

- `types.ts` has `MayarInvoiceInput` (the request body of [6. Create a hosted payment](#6-create-a-hosted-payment))
  and `MayarInvoice` (the `data` object of [7. Payment status](#7-payment-status)), as in the old
  `types.ts` (seen in the old template code (4aace4f)).
- Each method throws a `MayarApiError` for a failed call. The message texts are in
  [15. Example JSON for test mocks](#15-example-json-for-test-mocks).
- `getInvoice` throws a `MayarApiError` when the response has no `data` object.
- The rule `messages === "success"` applies only to `closeInvoice`. The other methods use rules 1 to
  6 only.
- Each call uses `signal: AbortSignal.timeout(MAYAR_REQUEST_TIMEOUT_MS)`.
- The README asks for "the HTTP status" in the error message. For Mayar, use the status of rule 3,
  because the body `statusCode` is the real status.

Error statuses (status code pages and endpoint pages):

| Status | Meaning                                                                               |
| ------ | ------------------------------------------------------------------------------------- |
| 400    | Validation error or an operation that is not valid                                    |
| 401    | The API key is absent or not valid, or the resource belongs to another account        |
| 404    | The resource does not exist                                                           |
| 409    | Conflict, for example the resource already exists, or the transaction is already paid |
| 429    | Rate limit, or a duplicate create request. See [12. Rate limits](#12-rate-limits).    |
| 500    | Server error                                                                          |

## 6. Create a hosted payment

The hosted payment is a Mayar invoice. One invoice is one payment page for one customer.

Request:

```http
POST {MAYAR_API_URL}/invoices/create
```

```json
{
  "name": "Budi Santoso",
  "email": "buyer@example.com",
  "mobile": "081234567890",
  "description": "Order payment",
  "redirectUrl": "https://shop.example.com/checkout/return",
  "expiredAt": "2026-10-19T08:00:00.000Z",
  "items": [{ "quantity": 1, "rate": 95000, "description": "Order payment" }],
  "extraData": { "session_id": "payses_01J..." }
}
```

The fields:

| Field         | Rule                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `name`        | Required. `${first_name} ${last_name}`, trimmed. `last_name` can be empty.                                            |
| `email`       | Required. `data.customer.email`.                                                                                      |
| `mobile`      | Required. `data.customer.phone`, converted. See the list below.                                                       |
| `description` | Send it always. The V2 create page marks it as optional. The migration guide says: "`description` is still required". |
| `redirectUrl` | `${storefrontUrl}/checkout/return`. See the list below.                                                               |
| `expiredAt`   | ISO 8601 in UTC. Now plus 24 hours. See [10. Expiry, cancellation and update](#10-expiry-cancellation-and-update).    |
| `items`       | One item: `quantity` 1, `rate` = the amount in whole rupiah, `description` = the same text as `description`.          |
| `extraData`   | `{ "session_id": "<input.data.session_id>" }`. Use string values only.                                                |

- Do not send `tax`, `paymentMethod` or `cashtag`. `paymentMethod` limits the payment code that the
  API returns. The hosted page always shows the methods of the dashboard settings.
- `mobile`: the storefront sends E.164, for example `+6281234567890`. The examples of the Mayar
  documentation use the local format, for example `081234567890`. Replace a leading `+62` with
  `0`. Keep each other value as it is. Mayar accepts `+62` or not: **unverified**.
- If `name`, `email` or `mobile` is empty after the conversion, throw a `MedusaError` of the type
  `INVALID_DATA` before the call. The old code had the same check (seen in the old template code
  (4aace4f), `initiate.unit.spec.ts`).
- `description` and `items[0].description` are `MAYAR_INVOICE_DESCRIPTION` ("Order payment").

Checks before the call, in this order. Each check throws a `MedusaError` of the type
`INVALID_DATA`, and no check calls Mayar:

1. `currency_code` is `idr` (case ignored).
2. `data.session_id` is a non-empty string. The webhook cannot find the session without it.
3. The amount is an integer greater than zero (`Number.isInteger(amount) && amount > 0`). A Medusa
   amount in rupiah has no decimals, so do not round.
4. `name`, `email` and `mobile` are not empty.

Checks after the call. Each check throws a `MedusaError` of the type `UNEXPECTED_STATE`:

- The client throws a `MayarApiError`. Put its message in the `MedusaError` message.
- `link` does not start with `https://`.
- `redirectUrl`: the V1 create page lists it as required: "URL where the customer will be
  redirected after completing the payment." The V2 create page does not list it. The migration
  guide says that `redirectUrl` "behave[s] as in V1". The invoice list response has a field
  `redirectUrl`. That V2 create accepts and uses `redirectUrl` is **unverified**. Check it in the
  sandbox first (see [13. Sandbox tests](#13-sandbox-tests)).
- That Mayar adds query parameters to the redirect URL is **unverified**. The return page ignores
  them.
- `extraData`: the V2 create page says "Additional custom data attached to the invoice". The page
  lists the error `"extraData Validation Error"` but does not give the rule. A flat object with
  string values worked in the old tests (seen in the old template code (4aace4f)). The real rule is
  **unverified**.

Response (V2 create page):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "6f8c19ff-5b97-4792-aa89-d2a12797b356",
    "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "link": "https://testingmayar.myr.id/invoices/ycfyxbj2h3",
    "expiredAt": 1784479403000,
    "extraData": { "noCustomer": "827hiueqy271hj", "idProd": "contoh aja" }
  }
}
```

- `data.link` is the payment URL: "Invoice URL that can be accessed by the customer." It is a full
  `https` URL in the examples.
- `data.id` is the invoice id (a UUID). It is the gateway payment id.
- `data.expiredAt` is a time in milliseconds.
- If `data.id` or `data.link` is absent or empty, treat the call as failed (seen in the old
  template code (4aace4f), `client.ts`).

The return value of `initiatePayment`:

```ts
return {
  id: invoice.id,
  data: {
    invoice_id: invoice.id,
    payment_url: invoice.link,
    amount, // whole rupiah, a number
    session_id: input.data.session_id,
    expired_at: expiredAt, // the ISO string that the request sent
  },
}
```

The gateway payment id key is `invoice_id`. Do not return a `status`.

Errors of the create endpoint (V2 create page):

| Status | Body `messages`                                                         |
| ------ | ----------------------------------------------------------------------- |
| 400    | `Validation Error`, `extraData Validation Error`                        |
| 400    | `Invoice total must be greater than zero`                               |
| 404    | `Customer not found and failed to create new customer`                  |
| 409    | `already exist`                                                         |
| 429    | `Duplicate request detected. Please wait 1 minute before trying again.` |

### Checkout label

The locale keys of the README section "Checkout label":

| File      | `checkout.paymentProviders.pp_mayar_mayar` | `checkout.paymentHints.pp_mayar_mayar`                |
| --------- | ------------------------------------------ | ----------------------------------------------------- |
| `en.json` | `Mayar`                                    | `Pay on the Mayar page with a method of your choice.` |
| `id.json` | `Mayar`                                    | `Bayar di halaman Mayar dengan metode pilihan Anda.`  |

The hint names no method, because the dashboard settings select the methods.

## 7. Payment status

Request:

```http
GET {MAYAR_API_URL}/invoices/{invoice_id}
```

Encode the id with `encodeURIComponent` (seen in the old template code (4aace4f)).

Response (V2 detail page, shortened):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "6f8c19ff-5b97-4792-aa89-d2a12797b356",
    "amount": 110000,
    "status": "paid",
    "link": "ibzfrf4880",
    "expiredAt": 1768371411000,
    "transactions": [{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "extraData": null }],
    "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "paymentUrl": "https://testingmayar.myr.id/invoices/ibzfrf4880",
    "paymentLinkId": "6f8c19ff-5b97-4792-aa89-d2a12797b356"
  }
}
```

- `data.status` is the invoice status. The detail page gives the examples `paid`, `unpaid` and
  `closed`. The list page gives `paid`, `closed` and `active`. No page gives the full list.
- A status for an expired invoice is **unverified**. Do not depend on it. Compare `data.expiredAt`
  with the current time.
- `data.amount` is an integer in the documentation. The old code also accepted a string such as
  `"95000"` or `"95000.00"`, and compared `Number(amount)` (seen in the old template code
  (4aace4f), `invoice.ts`). That Mayar sends a string is **unverified**. Keep the `Number()`
  conversion.
- In the detail response, `link` is only the slug. The full URL is `paymentUrl`. Use `link` only
  from the create response.

The map to Medusa:

| Mayar `data.status`                               | `authorizePayment`                                | `getPaymentStatus` |
| ------------------------------------------------- | ------------------------------------------------- | ------------------ |
| `paid` (case and spaces ignored), amount is equal | return `captured`                                 | `captured`         |
| `paid`, amount is different                       | throw `PAYMENT_AUTHORIZATION_ERROR`, log an error | `pending`          |
| `closed`                                          | throw `PAYMENT_AUTHORIZATION_ERROR`               | `canceled`         |
| each other value, and `expiredAt` is in the past  | throw `PAYMENT_AUTHORIZATION_ERROR`               | `canceled`         |
| each other value (`unpaid`, `active`, ...)        | throw `PAYMENT_AUTHORIZATION_ERROR`               | `pending`          |
| the API call fails                                | throw `PAYMENT_AUTHORIZATION_ERROR`               | `pending`          |

- Accept only `paid` as paid: `status.trim().toLowerCase() === "paid"`. The old code did the same,
  "because the Mayar documentation gives no full list of the status values" (seen in the old template
  code (4aace4f), `invoice.ts`).
- Compare `Number(data.amount)` of the API with `data.amount` of the session. Both are whole rupiah.
  A value that is not a finite number is a different amount.
- The invoice is expired when its expiry time is in the past. The expiry time is `data.expiredAt`
  of the API (milliseconds) if it is a number. Else it is `Date.parse(session expired_at)`. If
  neither is a number, the invoice is not expired.
- The messages of `authorizePayment` are in the message table of
  [15. Example JSON for test mocks](#15-example-json-for-test-mocks).

The cases with no `invoice_id` in the session data, or a failed API call:

| Method             | No `invoice_id`                                         | The API call fails                                       |
| ------------------ | ------------------------------------------------------- | -------------------------------------------------------- |
| `authorizePayment` | Throw `PAYMENT_AUTHORIZATION_ERROR`. Do not call Mayar. | Throw `PAYMENT_AUTHORIZATION_ERROR`.                     |
| `getPaymentStatus` | Return `pending`. Do not call Mayar.                    | Return `pending`.                                        |
| `retrievePayment`  | Throw `INVALID_DATA`. Do not call Mayar.                | Throw `UNEXPECTED_STATE` with the message of the client. |
| `isSessionPaid`    | Return `false`. Do not call Mayar.                      | Throw. The job skips the session for this run.           |

- `retrievePayment` returns `{ data: { ...input.data, gateway_status: <data.status> } }`.

## 8. Webhook

The Mayar webhook has no signature. No Mayar page describes a signature, a secret, a token or a
special header. The register endpoint takes an optional object `webhookConfig`, and the page does
not describe its content. Thus use the rule of the README for a gateway with no signature: read only
the invoice id from the body, then get the invoice again from the API.

The request: `POST` with `Content-Type: application/json` (webhook guide).

Events (webhook guide):

| Event                                      | Use                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `payment.received`                         | "triggered after the customer makes a payment". Process it.            |
| `payment.reminder`                         | The customer did not complete the payment after 29 minutes. Ignore it. |
| `shipper.status`, `membership.*` (4 kinds) | Not for invoices. Ignore them.                                         |

The body of `payment.received` (the webhook history page, `payload`, shortened):

```json
{
  "event": "payment.received",
  "data": {
    "id": "c3d4e5f6-a7b8-4901-c234-56789abcdef0",
    "transactionId": "c3d4e5f6-a7b8-4901-c234-56789abcdef0",
    "status": "SUCCESS",
    "transactionStatus": "paid",
    "customerEmail": "budi.santoso@example.com",
    "amount": 150000,
    "productId": "7c9d2e1f-3a4b-4c5d-8e6f-1a2b3c4d5e6f",
    "productType": "ebook"
  }
}
```

`getWebhookActionAndData(payload)`:

1. Read `payload.data`. If it is not an object, or `event` is not `payment.received`, return
   `NOT_SUPPORTED`. Do not call Mayar.
2. Read `data.productId`. If it is not a non-empty string, return `NOT_SUPPORTED`. Do not call
   Mayar.
3. Call `GET /invoices/{productId}`. If the call fails, write an error to the log and return
   `NOT_SUPPORTED`.
4. If the invoice status is not `paid`, return `NOT_SUPPORTED`. Use the rule of
   [7. Payment status](#7-payment-status): `status.trim().toLowerCase() === "paid"`. Do not check
   the expiry here.
5. Find the session id in the invoice: first `data.extraData.session_id`, then
   `extraData.session_id` of each item of `data.transactions`, in order. Use the first non-empty
   string.
6. If there is no session id, write a warning to the log and return `NOT_SUPPORTED`. The
   recovery job completes the cart.
7. If `Number(invoice.amount)` is not a finite number, write an error to the log and return
   `NOT_SUPPORTED`.
8. Return
   `{ action: PaymentActions.SUCCESSFUL, data: { session_id, amount: Number(invoice.amount) } }`.
   The amount is already whole rupiah.

Steps 1 to 6 and 8 are the old code (seen in the old template code (4aace4f), `service.ts` and
`webhook.unit.spec.ts`). Step 7 is new.

In these steps, `payload.data` is the parsed body, and `data` is the key `data` inside the body.
Thus the invoice id is `payload.data.data.productId`.

Code steps 1 to 8 only. Do not code the transaction fallback of the list below. Add it only if the
sandbox test 2 of [13. Sandbox tests](#13-sandbox-tests) shows no `extraData` in the invoice
detail. Then write the result in this document first.

Facts that are **unverified**:

- `data.productId` of a `payment.received` event for an invoice is the invoice id. Support: in the
  history example, `productId` is equal to `paymentLinkId`, and the detail page says
  `paymentLinkId` is "usually the same as invoice ID". The old sandbox check did not run (item F).
- The invoice detail returns the `extraData` of the create request, at the top level or on a
  transaction. In the V2 detail example, `transactions[].extraData` is `null`, and there is no
  top-level `extraData`. The old sandbox check did not run (items B and D). If the invoice detail
  does not return `extraData`, use `GET /hl/v2/transactions/{data.id}`. Its response has
  `extraData` and `paymentLink.id` (transaction detail page). Then this fallback is also
  **unverified**.
- The retry policy of Mayar for a failed delivery. The history record has a field `nextDelivery`,
  and `POST /hl/v2/webhooks/retry` sends a delivery again. No page gives the number of attempts.
  Medusa answers HTTP 200 at once, so a retry is rare.

Do not trust the fields `status`, `transactionStatus` and `amount` of the body. A person who knows
the URL can send a false body. Only the API response counts.

## 9. Refund

- Mayar has no refund API. No page of the Headless API describes a refund.
- `refundPayment` writes a warning to the log and returns `{ data: input.data }`. It does not call
  Mayar. The old code did the same (seen in the old template code (4aace4f), `service.ts`): "Medusa
  recorded a refund of <amount> for the Mayar invoice <invoice_id>. Mayar has no refund API. Return
  the money in the Mayar dashboard."
- Thus there is no `refund_ids` key for Mayar.
- A refund in the Mayar dashboard is **unverified**. The documentation does not describe one. The
  owner can always send the money to the customer by bank transfer.
- Partial refunds: Medusa records them. Mayar does nothing.
- The README unit test "`refundPayment` calls the refund API ... and adds the refund id to
  `refund_ids`" does not apply. In its place, test that `refundPayment` writes the warning, returns
  `input.data` with no change, and makes no `fetch` call.

## 10. Expiry, cancellation and update

Expiry:

- Send `expiredAt` = now plus 24 hours, as an ISO string in UTC. The old code used 24 hours
  (seen in the old template code (4aace4f), `INVOICE_LIFETIME_MS`). The recovery job checks
  sessions for 48 hours, so an invoice expires before the job stops.
- The payment duration of the dashboard (10 minutes to 1 month) applies to the payment code after
  the customer selects a method. How it works with `expiredAt` of the invoice is **unverified**.

Close an invoice (`cancelPayment` and `deletePayment`):

```http
POST {MAYAR_API_URL}/products/{invoice_id}/closed
```

- No body. The migration guide says: "Invoices are payment links, so the generic product action
  endpoint applies to them too." The actions are `active`, `closed` and `unlisted`. `open` and
  `close` are aliases.
- Success: `{ "statusCode": 200, "messages": "success" }`.
- Failure with HTTP 200: `{ "statusCode": 200, "messages": "failed" }`. Accept only
  `messages === "success"` (or `message === "success"`) as a success. The old client did this
  (seen in the old template code (4aace4f), `client.ts`).
- 404 `{ "statusCode": 404, "messages": "Product not found" }`.
- If the session data has no `invoice_id`, do not call Mayar.
- A failure does not throw. Write a warning to the log: an open invoice expires.
- The status of a closed invoice is `closed` (the old mock and the list example). That the close
  call sets exactly `closed` is **unverified** (old sandbox check item E).

Update (`updatePayment`):

- Close the old invoice as above. Then create a new invoice for `input.amount`, as
  `initiatePayment` does. Return `{ data: { ...input.data, <new invoice data> } }`. The old code did
  this (seen in the old template code (4aace4f), `close.unit.spec.ts`).
- Create the new invoice also when the close fails.
- Use the same create function as `initiatePayment`, with all its checks (currency, session id,
  amount, customer). The customer comes from `input.data.customer`, and the session id from
  `input.data.session_id`. The amount is `input.amount`.
- If the create fails, throw a `MedusaError` of the type `UNEXPECTED_STATE`, as `initiatePayment`
  does.
- The merged object is the "new data" of the README. It keeps `customer` and `session_id`, and
  replaces `invoice_id`, `payment_url`, `amount` and `expired_at`.
- Mayar has an edit endpoint, `POST /hl/v2/invoices/{id}/update`. Do not use it. It returns 409
  "Transaction already paid. Cannot edit invoice." for a paid invoice, and its id rule is not
  clear. See [14. Traps](#14-traps).

## 11. Amount and currency

- Mayar uses IDR only. No page names another currency, and no request has a currency field.
- Amounts are whole rupiah, as integers: the examples show `"rate": 11000` and `"amount": 110000`.
  The Medusa amount and the Mayar amount are in the same unit. There is no conversion.
- `rate = MathBN.convert(input.amount).toNumber()`. Do not divide and do not multiply.
- The invoice total is the sum of `quantity × rate`, plus `tax`. With one item of quantity 1 and no
  tax, the total is `rate`.
- The total must be more than zero: "Invoice total must be greater than zero".
- Fees: the create page says "The setting to charge admin fee and channel fee to the customer does
  not apply to the Invoice feature." Thus the invoice `amount` stays equal to the cart total.
- The webhook `amount` can include fees for other products: the history example of a
  `payment.reminder` has `isAdminFeeBorneByCustomer: true` and `amount: 107135`. Do not compare
  with the webhook amount. Use the invoice detail.
- `initiatePayment` throws `INVALID_DATA` for a currency that is not `idr`.

## 12. Rate limits

- 50 requests for each minute for each API key (rate limit page). All requests with the same key
  share the quota.
- A request over the limit gets HTTP 429 with a header `Retry-After`.
- A request with no Bearer token has a smaller limit.
- Duplicate create: the create endpoint returns 429 with "Duplicate request detected. Please wait 1
  minute before trying again." The page does not say which fields make two requests equal. This is
  **unverified**. Each session has a different `session_id` in `extraData`, so two sessions do not
  send equal bodies.
- `maxSessionsPerRun` of the recovery adapter: `MAYAR_MAX_SESSIONS_PER_RUN` (40). The old code used 40, with the comment "Mayar
  permits 50 requests for each minute" (seen in the old template code (4aace4f),
  `recovery/check-paid-carts.ts`). The other 10 requests stay free for the return page and the
  webhook.

## 13. Sandbox tests

Do these tests with a sandbox key and `MAYAR_API_URL=https://api.mayar.io/hl/v2`. Each one answers
an **unverified** fact. Write the answers in this document.

1. Create one invoice with `curl` and the body of [6. Create a hosted payment](#6-create-a-hosted-payment),
   with `redirectUrl` set to `http://localhost:3000/checkout/return`. Record the response. Check
   that `data.link` is a full `https` URL.
2. Get the invoice with `GET /invoices/{id}`. Record the `status` and the place of `extraData`.
3. Open `data.link` in a browser. Pay with a sandbox method. How to pay in the sandbox is
   **unverified**. The migration guide names `POST /hl/v2/payments/simulate` ("sandbox only"), but
   no page gives its body.
4. Check that the browser goes to `redirectUrl` after the payment.
5. Get the invoice again. Check that `status` is `paid` and `amount` is the same number.
6. Read `GET /webhooks/new-history?limit=10`. Record the `payload` of the `payment.received`
   event. Check that `data.productId` is the invoice id.
7. Create a second invoice. Close it with `POST /products/{id}/closed`. Get it. Record the status.
8. Create an invoice with a short `expiredAt` (for example 5 minutes). Wait. Get it. Record the
   status after the expiry.
9. Send `mobile` as `+6281234567890`. Record if Mayar accepts it.

Then do the order test of the README, steps 23 to 26 of the procedure.

## 14. Traps

- **No webhook signature.** Never trust the body. `getWebhookActionAndData` gets the invoice again
  from the API. See [8. Webhook](#8-webhook).
- **HTTP 200 with an error.** The body `statusCode` is the real status. The close endpoint can
  answer HTTP 200 with `"messages": "failed"`. A create can answer HTTP 200 with
  `"statusCode": 404` (seen in the old template code (4aace4f), `client.unit.spec.ts`).
- **`messages` or `message`.** Read both keys.
- **A different amount.** The paid amount can be different from the session amount, for example
  if somebody edits the invoice in the Mayar dashboard. `authorizePayment`
  keeps throwing `PAYMENT_AUTHORIZATION_ERROR` for a different amount, and writes an error to the
  log with the invoice id, the paid amount and `data.amount`.
- **API V1 is dead.** V1 stopped on 1 October 2026. Use only `/hl/v2` paths. The V1 paths are
  `/invoice/create` (singular) and `GET /invoice/close/{id}`. They do not work.
- **`redirectUrl` on V2.** The V2 create page does not list it. If the sandbox test shows that
  Mayar ignores it, the customer does not come back to the store. Then the webhook and the
  recovery job are the only paths. Write the result in this document.
- **`link` in the detail is a slug.** Use `data.link` of the create response, or `paymentUrl` of
  the detail.
- **Edit invoice id.** The edit page says the API reads the invoice id from the body and ignores
  the path. The migration guide says the opposite. Do not use the edit endpoint.
- **New API key after a domain change.** If the owner changes the store domain or subdomain in
  Mayar, create a new API key. The invoice links then use the new domain.
- **One webhook URL for each account.** The register endpoint takes one `urlHook`. If the Mayar
  account of the client also serves another system, that system loses its webhook. One URL for each
  account is **unverified**.
- **Sandbox and production keys.** Use a sandbox key only with `api.mayar.io` and a production key
  only with `api.mayar.id`. Keep `MAYAR_API_URL` and `MAYAR_API_KEY` from the same environment.
- **Differences from the old code.** The old code at `4aace4f` does not obey the current README in
  these places:
  - `initiatePayment` returned `status: "pending"`. Return no status.
  - The session data had no `session_id`. Return it.
  - The customer came from `data.customer.name`, `.email` and `.mobile`. The storefront now sends
    `first_name`, `last_name`, `email` and `phone`.
  - The old code used `context.customer` when `data.customer` was absent. The README does not ask
    for this. Throw `INVALID_DATA`.
  - `authorizePayment` let an API error pass through. Throw `PAYMENT_AUTHORIZATION_ERROR`.
  - `retrievePayment` used the key `mayar_status`. Use `gateway_status`.
  - The class was `MayarPaymentProviderService`. Use `MayarProviderService`.
  - The recovery code was in `apps/backend/src/recovery/dependencies.ts`. Use
    `apps/backend/src/modules/mayar/recovery.ts` with `mayarRecoveryAdapter`.
  - The tests replaced the client of the service (`(service as any).client_ = client`). The README
    asks for a mock of `global.fetch`.
- **The recovery adapter.** `isSessionPaid(data)` calls `GET /invoices/{data.invoice_id}` and
  returns `true` only for the status `paid`. It does not compare the amount: `authorizePayment`
  does. `paymentReference(data)` returns `data.invoice_id` if it is a string, else `undefined`. For
  no `invoice_id` and a failed call, see [7. Payment status](#7-payment-status).
- **Production on the sandbox URL.** `mayarClientOptions(env)` uses the sandbox URL when
  `MAYAR_API_URL` is empty. Always set `MAYAR_API_URL=https://api.mayar.id/hl/v2` in the
  production `.env`. A production key on the sandbox URL makes each call fail, and checkout shows
  an error.
- **Unverified facts and the README procedure.** Step 3 of the README procedure asks for a sandbox
  answer before you write the code that uses the fact. If you have no sandbox key, write the code
  with the decisions of this document. Then do [13. Sandbox tests](#13-sandbox-tests) before the
  first production deploy.

## 15. Example JSON for test mocks

The `statusCode` in each body is the same as the HTTP status, unless the case says otherwise. The
ids come from the old tests (seen in the old template code (4aace4f),
`__tests__/client.unit.spec.ts`, `__tests__/webhook.unit.spec.ts`, `__tests__/helpers.ts`).

Create, success (HTTP 200):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "inv_1",
    "transactionId": "trx_1",
    "link": "https://store.myr.id/invoices/abc",
    "expiredAt": 1790985600000
  }
}
```

Create, success with no link (HTTP 200). The client must treat it as a failure:

```json
{ "statusCode": 200, "data": { "id": "inv_1" } }
```

Create, validation error (HTTP 400):

```json
{ "statusCode": 400, "messages": "Validation Error" }
```

Create, duplicate request (HTTP 429). The error text is in `message`:

```json
{
  "statusCode": 429,
  "message": "Duplicate request detected. Please wait 1 minute before trying again."
}
```

Create, error in the body with HTTP 200:

```json
{ "statusCode": 404, "messages": "Customer not found" }
```

Gateway down (HTTP 502). The body is not JSON:

```text
<html>Bad Gateway</html>
```

Invoice detail, unpaid (HTTP 200):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "inv_1",
    "amount": 95000,
    "status": "unpaid",
    "paymentUrl": "https://store.myr.id/invoices/abc",
    "transactions": []
  }
}
```

Invoice detail, paid, session id on a transaction (HTTP 200):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "inv_1",
    "status": "paid",
    "amount": 95000,
    "transactions": [{ "id": "trx_1", "extraData": { "session_id": "payses_1" } }]
  }
}
```

Invoice detail, paid, session id at the top level, amount as a string (HTTP 200):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "inv_1",
    "status": "paid",
    "amount": "95000",
    "extraData": { "session_id": "payses_1" }
  }
}
```

Invoice detail, paid with a different amount (HTTP 200):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": { "id": "inv_1", "status": "paid", "amount": 1 }
}
```

Invoice detail, paid with no session id (HTTP 200):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": { "id": "inv_1", "status": "paid", "amount": 95000 }
}
```

Invoice detail, closed (HTTP 200):

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": { "id": "inv_1", "status": "closed", "amount": 95000 }
}
```

Invoice detail, unpaid and expired (HTTP 200). `expiredAt` is 2026-10-02T00:00:00.000Z. Use a
fake clock after this time:

```json
{
  "statusCode": 200,
  "messages": "success",
  "data": { "id": "inv_1", "status": "unpaid", "amount": 95000, "expiredAt": 1790899200000 }
}
```

Invoice detail, not found (HTTP 404):

```json
{ "statusCode": 404, "messages": "Not Found" }
```

Bad API key (HTTP 401):

```json
{ "statusCode": 401, "messages": "Unauthorized" }
```

Close, success (HTTP 200):

```json
{ "statusCode": 200, "messages": "success" }
```

Close, failed with HTTP 200:

```json
{ "statusCode": 200, "messages": "failed" }
```

Gateway down (HTTP 503, the answer of the old mock):

```json
{ "statusCode": 503, "messages": "Service Unavailable" }
```

Webhook body, `payment.received` (the `data` of the webhook payload):

```json
{
  "event": "payment.received",
  "data": {
    "id": "trx_1",
    "status": "SUCCESS",
    "transactionStatus": "paid",
    "amount": 95000,
    "productId": "inv_1",
    "productType": "invoice",
    "customerEmail": "buyer@example.com"
  }
}
```

Webhook body, an event to ignore:

```json
{ "event": "payment.reminder", "data": { "id": "trx_1", "productId": "inv_1" } }
```

Webhook bodies with no invoice id. Each one returns `NOT_SUPPORTED` with no call to Mayar:

```json
[
  { "event": "payment.received" },
  { "event": "payment.received", "data": { "id": "trx_1" } },
  { "event": "payment.received", "data": { "productId": 5 } }
]
```

The fetch mock of the HTTP integration test (seen in the old template code (4aace4f),
`integration-tests/helpers/mayar-mock.ts`) handles these routes on `https://mayar.test`:

| Method and path                   | Answer                                                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /hl/v2/invoices/create`     | Stores an invoice `inv_<n>` with `status: "unpaid"`, the sum of `quantity × rate`, and `extraData`. Returns the create success body with `link` `https://mayar.test/pay/inv_<n>`. |
| `GET /hl/v2/invoices/:id`         | The detail body, with `transactions: [{ id: "trx_<id>", extraData }]`. 404 for an unknown id.                                                                                     |
| `POST /hl/v2/products/:id/closed` | Sets `status: "closed"`. Returns the close success body. 404 for an unknown id.                                                                                                   |
| each other path                   | 404 `{ "statusCode": 404, "messages": "No mock for <method> <path>" }`                                                                                                            |
| each path when the mock is down   | 503 `{ "statusCode": 503, "messages": "Service Unavailable" }`                                                                                                                    |

- The detail body of the mock has `id`, `amount`, `status`, `expiredAt` and `transactions`. Store
  `expiredAt` as `Date.parse(body.expiredAt)` of the create request. The old mock had no
  `expiredAt`.
- The number `<n>` starts at 1 for each call of `installMayarMock()`, because each call makes a new
  `Map`.

The API of the mock helper (seen in the old template code (4aace4f), plus `expiredAt`):

```ts
export type MockInvoice = {
  id: string
  amount: number
  status: "unpaid" | "paid" | "closed"
  expiredAt?: number
  extraData?: Record<string, unknown>
}

export type MayarMock = {
  invoices: Map<string, MockInvoice>
  requests: { method: string; path: string }[]
  setInvoiceStatus(id: string, status: MockInvoice["status"]): void
  setInvoiceAmount(id: string, amount: number): void
  setDown(down: boolean): void // true: each call gets the 503 answer
  restore(): void
}

export function installMayarMock(): MayarMock
```

The customer of the HTTP integration test:

- Mayar refuses a session with no customer. The helper `createCartWithPaymentSession` already sends
  `data: { customer }` with this value, so the Mayar test needs no new parameter:

```json
{
  "customer": {
    "first_name": "Budi",
    "last_name": "Santoso",
    "email": "buyer@example.com",
    "phone": "+6281234567890"
  }
}
```

- The provider then sends `"name": "Budi Santoso"` and `"mobile": "081234567890"` to Mayar.

Unit tests that replace README cases:

- In place of "`NOT_SUPPORTED` for a bad signature": a body that says `paid`, while the API says
  `unpaid`, gives `NOT_SUPPORTED`. A body with no `productId` gives `NOT_SUPPORTED` and makes no
  `fetch` call.
- In place of the refund case: see [9. Refund](#9-refund).

The messages. Tests can match them exactly. `<...>` is a value. The texts with the mark "old" are
seen in the old template code (4aace4f).

| Place                                    | Type or log level                             | Message                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateOptions`                        | `INVALID_DATA`                                | `The apiUrl option of mayar is required.` (old)                                                                                                    |
| `validateOptions`                        | `INVALID_DATA`                                | `The storefrontUrl option of mayar is required.` (old)                                                                                             |
| create, currency                         | `INVALID_DATA`                                | `Mayar accepts only IDR. The currency of the payment is <currency_code>.` (old)                                                                    |
| create, session id                       | `INVALID_DATA`                                | `The Mayar payment needs the session id.`                                                                                                          |
| create, amount                           | `INVALID_DATA`                                | `The Mayar payment needs an amount that is a whole number greater than zero. The amount is <amount>.`                                              |
| create, customer                         | `INVALID_DATA`                                | `The Mayar payment needs the <name / email address / mobile number> of the customer.` (old)                                                        |
| create, API failure                      | `UNEXPECTED_STATE`                            | `Mayar did not create the invoice. <message of the MayarApiError>`                                                                                 |
| create, link not `https`                 | `UNEXPECTED_STATE`                            | `Mayar did not create the invoice. The payment URL does not start with https://.`                                                                  |
| no `invoice_id` (authorize and retrieve) | `PAYMENT_AUTHORIZATION_ERROR`, `INVALID_DATA` | `The payment session has no Mayar invoice id.` (old)                                                                                               |
| authorize, not paid, closed or expired   | `PAYMENT_AUTHORIZATION_ERROR`                 | `The payment for the Mayar invoice <invoice_id> is not confirmed.` (old)                                                                           |
| authorize, different amount              | `PAYMENT_AUTHORIZATION_ERROR`                 | `The payment for the Mayar invoice <invoice_id> is not confirmed.` (old)                                                                           |
| authorize, different amount              | `logger.error`                                | `The Mayar invoice <invoice_id> is paid with the amount <paid>, but the payment session <session_id> expects <amount>.` (old)                      |
| authorize, API failure                   | `PAYMENT_AUTHORIZATION_ERROR`                 | `The payment for the Mayar invoice <invoice_id> is not confirmed. Cause: <message of the MayarApiError>`                                           |
| retrieve, API failure                    | `UNEXPECTED_STATE`                            | `Mayar did not return the invoice <invoice_id>. <message of the MayarApiError>`                                                                    |
| webhook, API failure                     | `logger.error`                                | `The Mayar webhook for the invoice <invoice_id> was not confirmed. Cause: <cause>` (old)                                                           |
| webhook, no session id                   | `logger.warn`                                 | `The paid Mayar invoice <invoice_id> has no session id. The check-paid-carts job completes the cart.` (old)                                        |
| webhook, amount not a number             | `logger.error`                                | `The paid Mayar invoice <invoice_id> has an amount that is not a number: <amount>.`                                                                |
| cancel, delete, update: close fails      | `logger.warn`                                 | `Mayar did not close the invoice <invoice_id>. Cause: <cause>` (old)                                                                               |
| refund                                   | `logger.warn`                                 | `Medusa recorded a refund of <amount> for the Mayar invoice <invoice_id>. Mayar has no refund API. Return the money in the Mayar dashboard.` (old) |
| client, empty key                        | `MayarApiError`                               | `The Mayar API key is empty. Set MAYAR_API_KEY in apps/backend/.env.` (old)                                                                        |
| client, failed call                      | `MayarApiError`                               | `The Mayar request <METHOD> <path> failed. Status: <status>. Response: <error text>` (old)                                                         |
| client, network failure                  | `MayarApiError`                               | `The Mayar request <METHOD> <path> failed. Cause: <cause>` (old)                                                                                   |
| client, create with no id or link        | `MayarApiError`                               | `The Mayar request POST /invoices/create returned no invoice id or no link.` (old)                                                                 |
| client, detail with no `data`            | `MayarApiError`                               | `The Mayar request GET /invoices/<invoice_id> returned no invoice.`                                                                                |

`<path>` in the client messages is the path after the base URL, with the plain id, for example
`/invoices/inv_9` or `/products/inv_1/closed` (old).
