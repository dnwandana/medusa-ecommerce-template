# Resend email provider

Checked on: 2026-10-20

This document gives the facts of Resend for the email provider of this template. Read
[README.md](README.md) first. The README gives the contract, the environment keys and the
procedures. This document gives only the Resend part.

| Item           | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| `<slug>`       | `resend` (module folder, `static identifier`, and provider `id`)    |
| `<Name>`       | `Resend` (class `ResendNotificationProviderService`)                |
| `<PROVIDER>`   | `RESEND` (key `RESEND_API_KEY`)                                     |
| Module path    | `apps/backend/src/modules/resend`                                   |
| SMTP host      | `smtp.resend.com`                                                   |
| SMTP user name | `resend`                                                            |
| SMTP password  | A Resend API key (`re_...`)                                         |
| HTTP API send  | `POST https://api.resend.com/emails`                                |
| Test sender    | `onboarding@resend.dev`. It sends only to the account owner.        |
| Sandbox mode   | None. A new account can send to any address from a verified domain. |

The domain terms in this document:

- `<email domain>`: the domain that you verify in Resend, for example `mail.example.com`.
  `EMAIL_FROM` uses it.
- `<root domain>`: the registered domain that holds the DNS zone, for example `example.com`.
- `<domain>` in the README: the store domain of `docs/deployment.md`. It can be the same as
  `<root domain>`.

## 1. Sources

Official Resend documentation. Each page also has a Markdown copy: add `.md` to the URL.

- Documentation index: https://resend.com/docs/llms.txt
- Send emails with SMTP: https://resend.com/docs/send-with-smtp
- Send emails using Nodemailer with SMTP: https://resend.com/docs/send-with-nodemailer-smtp
- Create an API key: https://resend.com/docs/create-an-api-key
- Manage API keys: https://resend.com/docs/dashboard/api-keys/introduction
- Create API key (the `permission` values):
  https://resend.com/docs/api-reference/api-keys/create-api-key
- Add and verify a domain: https://resend.com/docs/add-a-domain
- Verified Domains: https://resend.com/docs/dashboard/domains/introduction
- Managing Domains (statuses, SPF and DKIM records):
  https://resend.com/docs/dashboard/domains/manage-domains
- DNS guide for Cloudflare (record names): https://resend.com/docs/guides/dns/cloudflare
- How to avoid conflicts with your MX records:
  https://resend.com/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records
- Implementing DMARC: https://resend.com/docs/dashboard/domains/dmarc
- Choosing a Region: https://resend.com/docs/dashboard/domains/regions
- Configure TLS: https://resend.com/docs/dashboard/domains/tls
- Open and Click Tracking: https://resend.com/docs/dashboard/domains/tracking
- Update Domain: https://resend.com/docs/api-reference/domains/update-domain
- API introduction (base URL, authentication, `User-Agent`, rate limit):
  https://resend.com/docs/api-reference/introduction
- Send Email: https://resend.com/docs/api-reference/emails/send-email
- Errors: https://resend.com/docs/api-reference/errors
- Pagination (the only official example of a full error body):
  https://resend.com/docs/api-reference/pagination
- 403 Error with Error Code 1010: https://resend.com/docs/knowledge-base/403-error-1010
- 403 Error Using resend.dev Domain:
  https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
- 403 Error Using Verified Domain: https://resend.com/docs/knowledge-base/403-error-domain-mismatch
- Usage Limits: https://resend.com/docs/api-reference/rate-limit
- What are Resend account quotas and limits?:
  https://resend.com/docs/knowledge-base/account-quotas-and-limits
- What is Resend Pricing: https://resend.com/docs/knowledge-base/what-is-resend-pricing
- Does Resend require production approval?:
  https://resend.com/docs/knowledge-base/does-resend-require-production-approval
- Attachments (the size limit of one email): https://resend.com/docs/dashboard/emails/attachments
- Email Suppressions: https://resend.com/docs/dashboard/emails/email-suppressions
- Send Test Emails: https://resend.com/docs/dashboard/emails/send-test-emails
- What email addresses to use for testing?:
  https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing
- View and manage emails (the email events): https://resend.com/docs/dashboard/emails/manage-emails
- Logs: https://resend.com/docs/dashboard/logs/introduction

## 2. Check before you change the config

Check these pages again before you change the config. Providers change.

- Open each page of section 1. Compare the host, the ports, the limits and the fields of this
  document with the page.
- Open the **Records** tab of your domain. Use the records that it shows, not the examples of
  section 4.
- If Resend adds a sandbox mode or a production approval, add the steps to section 3.

## 3. Account setup

1. Sign up at https://resend.com/signup.

The other steps follow the order of the README procedure:

- The domain is the next step. See section 4.
- The API key comes after the domain, because the key can be limited to a verified domain. See
  section 5. The SMTP password and the HTTP API key are the same kind of key.

Facts about the account:

- Resend has no sandbox mode and no production approval. A free account can send to any address
  from a verified domain at once.
- Without a verified domain, the account can send only from the test domain `resend.dev`.
  The sender `onboarding@resend.dev` sends only to the email address of the Resend account.
  An email to any other address fails with HTTP 403. See section 11.
- The free plan has a quota of 100 emails each day and 3,000 emails each month. It has 3 verified
  domains. See section 8.
- Resend keeps the email data and the logs for 30 days on all plans except Enterprise.

## 4. Domain setup

1. Open the **Domains** page (https://resend.com/domains).
2. Click **Add Domain**.
3. Enter the `<email domain>`. Resend recommends a subdomain, for example `mail.<root domain>`.
4. Choose the region. Resend recommends the region that is nearest to most recipients.
5. Keep the default Return-Path subdomain `send`, unless `send.<email domain>` already has
   records.
6. Open the **Records** tab of the domain.
7. Add each record of the **Records** tab to the DNS zone of the `<root domain>`. Copy each value
   exactly.
8. Wait for the status `verified`.
9. Add the DMARC record of the README section [DNS records](README.md#dns-records) on
   `_dmarc.<root domain>`, for example `_dmarc.example.com`.

Two facts of this domain setup add to the README section "DNS records":

- Resend puts the SPF records on `send.<email domain>`, not on the domain of `EMAIL_FROM`. The
  reason: these records set the Return-Path of the bounces. The **Records** tab usually shows four
  records: two SPF records, one DKIM record and one DMARC record.
- The DMARC record goes on the `<root domain>`. The Resend page "Implementing DMARC" shows only
  `_dmarc.example.com`. **Unverified** in the Resend docs: a receiver uses the DMARC record of the
  root domain for a subdomain with no DMARC record. The DMARC standard (RFC 7489) states this rule.

Facts about the steps:

- Step 3: `EMAIL_FROM` must use the exact `<email domain>`, with the subdomain. If you verify
  `mail.example.com`, use `orders@mail.example.com`, not `orders@example.com`.
- Step 4: Resend has four regions: `us-east-1`, `eu-west-1`, `sa-east-1` and `ap-northeast-1`
  (Tokyo). The store is in Indonesia, so Tokyo is the nearest region. To change the region later,
  you must delete the domain and add it again. The DNS records then change.
- Step 5: some new domains get a CNAME record on the Return-Path subdomain. A CNAME record cannot be
  on the same name as another record. If `send.<email domain>` has records, enter another
  subdomain, for example `bounce`.
- Step 7: the typical records are below. Some domains created after August 2026 get CNAME records
  in place of the MX and the TXT records on `send`. Always use the records of the **Records** tab.

| Type | Name                | Value (example)                                             |
| ---- | ------------------- | ----------------------------------------------------------- |
| MX   | `send`              | `feedback-smtp.<region>.amazonses.com`, priority `10` (SPF) |
| TXT  | `send`              | `v=spf1 include:amazonses.com ~all` (SPF)                   |
| TXT  | `resend._domainkey` | `p=<public key>` (DKIM)                                     |

- The names in the table are relative to the `<email domain>`. For `mail.example.com`, the names
  are `send.mail` and `resend._domainkey.mail` in the DNS zone of `example.com`.
- The SPF records on `send.<email domain>` do not change an SPF record that the `<root domain>`
  already has. The README rule "one SPF record" still applies to each name.
- The MX record on `send.<email domain>` does not change the MX records of the `<root domain>`.
  The inbox of the domain keeps working.
- Cloudflare DNS: set each CNAME record to **DNS only** (grey cloud). A proxied record stops the
  verification. The **Sign in to Cloudflare** button on the **Domains** page adds the records for
  you.
- Step 8: the verification usually takes 15 minutes. DNS changes can take up to 72 hours. After 72
  hours, click **Restart verification**. The status `failed` means that Resend did not find the
  records in 72 hours.
- Do not turn on **Receiving** for the domain. With **Receiving**, Resend receives all the email to
  that domain. The template does not use it.

## 5. SMTP

| Item      | Value                                   |
| --------- | --------------------------------------- |
| Host      | `smtp.resend.com`                       |
| User name | `resend`                                |
| Password  | A Resend API key. It starts with `re_`. |

Try the ports in this order. Use the first port that passes the
[SMTP port check](README.md#smtp-port-check) on the server.

| Order | Port   | TLS mode     | `SMTP_SECURE` | Note                                         |
| ----- | ------ | ------------ | ------------- | -------------------------------------------- |
| 1     | `587`  | STARTTLS     | `false`       | The main port.                               |
| 2     | `465`  | Implicit TLS | `true`        | The other usual port.                        |
| 3     | `2587` | STARTTLS     | `false`       | A second port of the README provider table.  |
| 4     | `2465` | Implicit TLS | `true`        | A second port of the README provider table.  |
| none  | `25`   | STARTTLS     | `false`       | Do not use it. Many VPS hosts block port 25. |

Make the API key. Use it as the SMTP password, or as `RESEND_API_KEY` for an HTTP API provider.

1. Open the **API keys** page (https://resend.com/api-keys).
2. Click **Create API Key**.
3. Enter a name, for example `<store name> production`. The limit is 50 characters.
4. Select the permission **Sending access**.
5. Select the `<email domain>` of section 4. The key then sends only from that domain.
6. Click the button that confirms the form. **Unverified:** the label of this button.
7. Copy the key at once. Resend shows the key only one time.
8. Over SMTP, put the key in `SMTP_PASSWORD`. For an HTTP API provider, put it in
   `RESEND_API_KEY`.

Facts about SMTP:

- **Unverified:** the SMTP page does not name the permission that SMTP needs. The page "Create API
  key" says that **Sending access** "can only send emails".
- If the SMTP login fails, the backend log shows `Code: EAUTH.` Then make a key with **Full
  access**, put it in `SMTP_PASSWORD`, and tell the owner. A Full access key can also change the
  account. Delete it when a key with less access works. **Unverified:** the response code of
  this error. The usual SMTP code for a failed login is `535`.
- The docs do not say why the ports `2465` and `2587` exist. **Unverified:** they are for hosts
  that block the usual ports.
- The rate limit of SMTP is the same as the rate limit of the API. See section 8.
- An email sent over SMTP shows in the **Emails** page (https://resend.com/emails).
- Resend has no SMTP server logs for you. Ask Resend support for help with an SMTP error.
- The `smtp` provider returns the `messageId` of Nodemailer. **Unverified:** whether the
  **Emails** page shows this value. Find the email on the **Emails** page by the recipient, the
  subject and the time. The page shows these fields for each email.

SMTP reply codes:

- The Resend docs do not list the SMTP reply codes. No official map from a code to a cause exists.
- The README list of SMTP failures in [Set up a provider over SMTP](README.md#set-up-a-provider-over-smtp)
  gives the general meaning of the codes from 400 to 599.
- If the backend log shows a response code from 500 to 599, check these causes in this order:
  1. `EMAIL_FROM` is `onboarding@resend.dev`, or it is on the `resend.dev` domain.
  2. The domain of `EMAIL_FROM` is not the verified `<email domain>`.
  3. The domain status is not `verified` on the **Domains** page.
  4. The quota of section 8 is used.
- **Unverified:** that each of these causes gives a code from 500 to 599 over SMTP. The HTTP API
  gives HTTP 403 for the first three causes and HTTP 429 for the quota.

## 6. Environment values

Over SMTP, the template needs the seven keys of the README section
[Environment keys](README.md#environment-keys):

| Key               | Resend value                                                             |
| ----------------- | ------------------------------------------------------------------------ |
| `SMTP_HOST`       | `smtp.resend.com`                                                        |
| `SMTP_PORT`       | `587`. If the server cannot open it, the next port of section 5.         |
| `SMTP_SECURE`     | The `SMTP_SECURE` value of the port in section 5. `false` for `587`.     |
| `SMTP_USER`       | `resend`                                                                 |
| `SMTP_PASSWORD`   | The API key of section 5 (`re_...`).                                     |
| `EMAIL_FROM`      | An address on the `<email domain>`, for example `orders@<email domain>`. |
| `EMAIL_FROM_NAME` | The Medusa store name.                                                   |

- With port `2587`, set `SMTP_SECURE=false`. With port `2465`, set `SMTP_SECURE=true`.
- `SMTP_PASSWORD` is the same API key as the HTTP API key. Resend has no separate SMTP password.

An HTTP API provider adds one key:

| Key              | Meaning                                                          | `apps/backend/.env.example` | `apps/backend/.env.test` | Root `.env.example` |
| ---------------- | ---------------------------------------------------------------- | --------------------------- | ------------------------ | ------------------- |
| `RESEND_API_KEY` | The API key of section 5. A value selects the `resend` provider. | empty                       | empty                    | empty               |

- When `RESEND_API_KEY` has a value, the `resend` provider gets the `email` channel. The `SMTP_`
  keys then have no effect.
- When `RESEND_API_KEY` is empty, the SMTP rule of the README applies. Development keeps Mailpit,
  and the tests keep the local provider.
- Any value selects the `resend` provider, also `change-me`. Thus the key is empty in the three
  files, never `change-me`. See the README section [Env keys](README.md#env-keys).
- The comment for `RESEND_API_KEY` in `apps/backend/.env.example` names the **API keys** page
  (https://resend.com/api-keys).

The other two places of the README "Env keys" procedure:

- The line for the `x-medusa-environment` anchor of `docker-compose.yml`, below `EMAIL_FROM_NAME`.
  The `:-` gives an empty value when `.env` has no line for the key.

```yaml
RESEND_API_KEY: ${RESEND_API_KEY:-}
```

- The row for the table in the section "Environment file" of `docs/deployment.md`. Add the row
  only in a project that uses the `resend` provider in production. The env check of that document
  requires a value for each key of the table. Copy the column layout of the `SMTP_` rows.

```text
| `RESEND_API_KEY` | The Resend API key. A value sends every email through the Resend HTTP API, and the `SMTP_` keys then have no effect. | The key from `docs/email/resend.md`. |
```

The values in the production `.env` for each mode:

| Mode     | `RESEND_API_KEY` | `SMTP_HOST` and the other `SMTP_` keys                   |
| -------- | ---------------- | -------------------------------------------------------- |
| SMTP     | empty            | The values of the first table of this section.           |
| HTTP API | The API key      | Keep the values of the first table. They have no effect. |

- In SMTP mode, keep `RESEND_API_KEY` empty. Any value selects the `resend` provider.
- In HTTP API mode, keep `SMTP_HOST=smtp.resend.com` and the other SMTP values. The env check of
  `docs/deployment.md` then still passes. To go back to SMTP, make `RESEND_API_KEY` empty and do
  the deploy again.
- The `resend` provider uses `EMAIL_FROM` and `EMAIL_FROM_NAME`, as the `smtp` provider does.
- The base URL is a constant in the code: `https://api.resend.com`. The tests replace
  `global.fetch`, so they need no URL key.
- The options of the `resend` provider are `apiKey`, `from` and `fromName`, as in the README
  registration example. `validateOptions` throws `INVALID_DATA` with these messages, in the style
  of the `smtp` provider:
  - `The apiKey option of resend is required.`
  - `The from option of resend is required.`

## 7. HTTP API: send one email

- Base URL: `https://api.resend.com`. The API accepts only HTTPS.
- Request: `POST https://api.resend.com/emails`.
- The API has no version header and no version in the path.

Headers:

| Header          | Value                                |
| --------------- | ------------------------------------ |
| `Authorization` | `Bearer <RESEND_API_KEY>`            |
| `Content-Type`  | `application/json`                   |
| `User-Agent`    | `medusa-store-resend/1.0`. Required. |

- Send `User-Agent` explicitly. Without it, the request fails with HTTP 403 and error code
  `1010`. **Unverified:** whether the global `fetch` of Node 24 sends a `User-Agent` by default.
- Resend accepts any product name and version. The value `medusa-store-resend/1.0` is the choice
  of this template. Add a test that the request has this header.

Body fields for the six fields of the README:

| Template field | Resend field | Value                                                                        |
| -------------- | ------------ | ---------------------------------------------------------------------------- |
| Recipient      | `to`         | The address as a string. The field also takes an array, up to 50 addresses.  |
| Subject        | `subject`    | The subject from `renderTemplate`.                                           |
| HTML           | `html`       | The HTML from `renderTemplate`.                                              |
| Plain text     | `text`       | The text from `htmlToText`.                                                  |
| Sender         | `from`       | `<EMAIL_FROM_NAME> <<EMAIL_FROM>>`. See the sender name rule below.          |
| Reply-To       | `reply_to`   | The store contact email. Leave out the field when there is no contact email. |

- `from`, `to` and `subject` are required. The field is `reply_to`, in snake case.
- Example of `from` with a name: `Everyday <orders@mail.example.com>`.
- Always send `text`. Without `text`, Resend makes a plain text part from the HTML.

The rule for the sender name in the code:

1. If `fromName` is empty, send `from` alone, for example `orders@mail.example.com`.
2. If `fromName` has only letters, digits and spaces, send `<fromName> <<from>>`.
3. Else, put a backslash before each `\` and each `"` in the name.
4. Then send `"<name>" <<from>>`, with the name in double quotes.

- Test cases: the name `Everyday` gives `Everyday <orders@mail.example.com>`. The name
  `Toko "A", Jakarta` gives `"Toko \"A\", Jakarta" <orders@mail.example.com>`.
- **Unverified:** the docs show only a plain name. The quoted form is the rule of RFC 5322. The docs
  do not say that Resend accepts it.

Response:

- HTTP 200 with the body `{ "id": "<uuid>" }`. Return `{ id: body.id }` from `send()`.

Read each response body in the same way. The README fetch mock has only `ok`, `status` and
`text()`.

1. Call `await response.text()`.
2. Call `JSON.parse` on the text inside a `try` block.
3. If `text()` throws or `JSON.parse` throws, use no body.

- For a 2xx response with no body or no string `id`, return `{ id: undefined }`. The README permits
  it.
- Do not read `response.headers` for the content type. The mock has no headers.

Errors:

- An error response has a JSON body with three fields: `name` (the error type), `statusCode` and
  `message`. Only the page "Pagination" shows a full error body. The page "Errors" gives each
  `name` and `message`.
- The error code of the README error rule is `name`. Write the HTTP status and `name` in the
  message, for example `Status: 403. Code: validation_error.`
- If there is no body, or the body has no string `name`, write `Code: unknown.`
- A network error or a timeout has no HTTP status. Write `Code: <error.name>.` with no `Status:`
  part, for example `Code: TimeoutError.` See the message table of the README.
- Do not log `message`. Some messages contain an email address or a domain, for example the 403
  message of the test domain.
- The HTTP 403 with error code `1010` does not come from the Resend API. **Unverified:** its body
  format. No example body is known. The log line for it is `Status: 403. Code: unknown.`, unless
  the body has a string `name`.

The errors that a send can give:

| HTTP | `name`                   | Cause                                                                   |
| ---- | ------------------------ | ----------------------------------------------------------------------- |
| 400  | `validation_error`       | A field is not correct. `message` names the field.                      |
| 401  | `missing_api_key`        | The `Authorization` header is absent.                                   |
| 401  | `validation_error`       | The API key does not exist, was deleted, or is not active.              |
| 403  | `validation_error`       | The sender is `resend.dev` and the recipient is not the account owner.  |
| 403  | `validation_error`       | The domain of `from` is not verified, or it is not the verified domain. |
| 403  | `restricted_api_key`     | The message is "API key is not active".                                 |
| 403  | `suspended_api_key`      | Resend suspended the API key.                                           |
| 403  | unknown (code `1010`)    | The `User-Agent` header is absent.                                      |
| 422  | `missing_required_field` | The body has no `from`, `to` or `subject`.                              |
| 422  | (**unverified**)         | The recipient is on a blocked test domain, for example `example.com`.   |
| 429  | `rate_limit_exceeded`    | More than the rate limit of the team. See section 8.                    |
| 429  | `daily_quota_exceeded`   | The free plan quota of the day is used.                                 |
| 429  | `monthly_quota_exceeded` | The quota of the month is used.                                         |
| 500  | `application_error`      | An error on the Resend side. Try again later.                           |
| 503  | `service_unavailable`    | The API is not available for a short time. Try again later.             |

- The page "Errors" gives two errors with the name `restricted_api_key`. HTTP 403 has the message
  "API key is not active". HTTP 401 has the message "This API key is restricted to only send
  emails". A send never gets the 401 error. Section 9 gives the case of the 401 error.
- The page "Errors" also gives "not active" as a cause of HTTP 401 `validation_error` on the
  sending endpoints. The page does not say when each of the two errors applies.
- The page "What email addresses to use for testing?" gives the 422 status for the blocked test
  domains. **Unverified:** the `name` of that error.

## 8. Limits

- Rate limit: 10 requests each second for each team. All the API keys of the team and SMTP share
  this limit. There is no burst above the limit.
- A request over the rate limit gets HTTP 429 `rate_limit_exceeded`. The response headers
  `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset` and `retry-after` give the state.
- Free plan quota: 100 emails each day and 3,000 emails each month. The day is a UTC calendar day.
  The quota resets at midnight UTC.
- The quota counts the sent and the received emails. Each recipient counts as one email.
- Paid plans have no daily quota. The plan sets the monthly quota. The overage stops at 5 times
  the monthly quota.
- Response headers: `x-resend-daily-quota` (free plan only) and `x-resend-monthly-quota` give the
  used quota.
- Size: one email can be at most 40 MB, with the attachments after Base64 encoding.
- Domains: 3 on the free plan, 10 on Pro.
- Bounce rate: keep it under 4%. Spam rate: keep it under 0.08%. Above these rates, Resend can
  pause the sending of the account.
- The template sends one email for each send, so it uses one request of the rate limit for each
  email. The jobs of the template send one email at a time.

## 9. Tracking and dashboard settings

Resend has open tracking and click tracking for each domain. Both are off by default. Tracking
works only when both of these are true:

- `open_tracking` or `click_tracking` is on for the domain.
- The domain has a verified tracking subdomain, for example `links.mail.example.com`.

Check that tracking is off:

1. Open the **Domains** page (https://resend.com/domains).
2. Click the domain of `EMAIL_FROM`.
3. Open the **Configuration** tab.
4. Find **Enable tracking metrics**. If it shows the button **Configure**, tracking is not set up.
5. Open the **Records** tab. A record with the name **Tracking** means that a tracking subdomain
   exists.

The API gives the exact state. The dashboard labels can change, so use the API when you are not
sure. These calls need a key with **Full access**. A **Sending access** key gets HTTP 401
`restricted_api_key` with the message "This API key is restricted to only send emails".

1. Make a key with **Full access** on the **API keys** page. Use the steps of section 5, with
   **Full access** in step 4.
2. Get the domains. The response gives the `id`, the `open_tracking` and the `click_tracking` of
   each domain.

```bash
curl -sS https://api.resend.com/domains -H "Authorization: Bearer <full access key>"
```

3. Find the object with `"name": "<email domain>"`. Copy its `id`.
4. If `open_tracking` or `click_tracking` is `true`, turn off both.

```bash
curl -sS -X PATCH https://api.resend.com/domains/<id> \
  -H "Authorization: Bearer <full access key>" \
  -H "Content-Type: application/json" \
  -d '{"click_tracking":false,"open_tracking":false}'
```

5. Do step 2 again. Make sure that both values are `false`.
6. Delete the full access key on the **API keys** page.

- The response of step 4 is HTTP 200 with `{"object":"domain","id":"<id>"}`.
- In the dashboard, the tracking settings are on the **Configuration** tab. **Unverified:** the
  name of the control that turns tracking off. The docs show only the steps to turn it on.

Other facts:

- A tracking subdomain cannot be removed. You can only change it. Turn off the two switches.
- Click tracking changes each link to a link on the tracking subdomain. The magic link then goes
  through Resend first.
- Leave **TLS** at the default `opportunistic`. With `enforced`, Resend does not send to a server
  that has no TLS.

## 10. Test send

A test with the HTTP API, from the production server. This test checks the API key and the domain.
It does not check the SMTP port.

```bash
curl -sS -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer <API key>" \
  -H "Content-Type: application/json" \
  -d '{"from":"<EMAIL_FROM>","to":"delivered@resend.dev","subject":"Test","text":"Test"}'
```

- The expected response is HTTP 200 with `{"id":"..."}`.
- `curl` sends a `User-Agent` header by itself.
- `delivered@resend.dev` simulates a delivered email. `bounced@resend.dev`,
  `complained@resend.dev` and `suppressed@resend.dev` simulate the other events.
- A test email counts against the quota.

A test over SMTP:

1. Do the [SMTP port check](README.md#smtp-port-check) of the README on the server.
2. Set the values of section 6 in `.env`.
3. Do the steps 11 and 12 of the README procedure
   [Set up a provider over SMTP](README.md#set-up-a-provider-over-smtp). A plain restart does not
   read the changed `.env`.
4. On the storefront, request a magic link for your own address.
5. Open the email and click the link.
6. Find the email on the **Emails** page by the recipient, the subject and the time.

Where to see the result:

- **Emails** page (https://resend.com/emails): each sent email, with its events. Click an email to
  see the details, the HTML and the plain text.
- The events: `sent`, `delivered`, `delivery_delayed`, `bounced`, `complained`, `suppressed` and
  `failed`. A `delivery_delayed` email gets retries for up to 14 hours. Then it becomes `bounced`.
- **Logs** page (https://resend.com/logs): each API request with its status and its response body.
  Filter by status, for example `429`. The **Logs** page does not show SMTP sessions.
- On an email of the **Emails** page, the menu item **View log** opens the API request of that
  email.
- Resend keeps the emails and the logs for 30 days.

## 11. Traps

- The test sender `onboarding@resend.dev` sends only to the address of the Resend account. Each
  customer email then fails with HTTP 403. Verify a domain and set `EMAIL_FROM` on that domain.
- `EMAIL_FROM` must use the exact verified domain. If you verified `mail.example.com`, the sender
  `orders@example.com` fails with HTTP 403.
- Resend blocks recipients on test domains, for example `example.com` and `test.com`, with HTTP 422. Do not use such addresses for a real test. **Unverified:** whether the `.test` domain of the
  development `EMAIL_FROM` is blocked as a recipient.
- Port `465` needs `SMTP_SECURE=true`, and the start stops without it. Port `2465` also needs
  `SMTP_SECURE=true`, but the code does not check it. With `false`, each send waits for the timeout.
- Many VPS hosts block port 25. Do not use it.
- Resend shows the API key only one time. If you lose it, make a new key and delete the old key.
- A proxied CNAME record on Cloudflare stops the domain verification. Set it to **DNS only**.
- Some new domains get CNAME records in place of TXT and MX records. Copy the records of the
  **Records** tab, not the examples of section 4.
- The rate limit is for the whole team. Another app on the same team uses the same 10 requests
  each second.
- The free plan sends only 100 emails each day. A busy day can stop the order emails until
  midnight UTC.
- Resend skips an address on the suppression list, after a hard bounce or a spam complaint. The
  email then shows the event `suppressed`. Remove the address on the **Suppressions** page
  (https://resend.com/emails/suppressions) to send to it again. **Unverified:** whether the API
  returns HTTP 200 for a suppressed recipient.
- A missing `User-Agent` header in an HTTP API provider gives HTTP 403 with code `1010`, also with
  a correct key.
- To change the region, you must delete the domain. The DNS records then change.

## 12. Example JSON for test mocks

The request body of `POST https://api.resend.com/emails`, with a sender name and a Reply-To:

```json
{
  "from": "Everyday <orders@mail.everyday.test>",
  "to": "customer@everyday.test",
  "subject": "Your sign-in link",
  "html": "<p>Click the link to sign in.</p>",
  "text": "Click the link to sign in.",
  "reply_to": "help@everyday.test"
}
```

`POST /emails`, HTTP 200:

```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

The error bodies below use the shape of the page "Pagination" and the `name` and the `message` of
the page "Errors". The page "Errors" shows "contact support" in the 429 message as a link. The
example below has the plain text.

`POST /emails`, HTTP 403, the sender is `onboarding@resend.dev`:

```json
{
  "name": "validation_error",
  "statusCode": 403,
  "message": "You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."
}
```

`POST /emails`, HTTP 403, the domain of `from` is not verified:

```json
{
  "name": "validation_error",
  "statusCode": 403,
  "message": "The mail.example.com domain is not verified. Please, add and verify your domain."
}
```

`POST /emails`, HTTP 401, no `Authorization` header:

```json
{
  "name": "missing_api_key",
  "statusCode": 401,
  "message": "Missing API Key"
}
```

`POST /emails`, HTTP 422, no `subject`:

```json
{
  "name": "missing_required_field",
  "statusCode": 422,
  "message": "The request body is missing one or more required fields."
}
```

`POST /emails`, HTTP 429, over the rate limit:

```json
{
  "name": "rate_limit_exceeded",
  "statusCode": 429,
  "message": "Too many requests. Please limit the number of requests per second. Or contact support to increase rate limit."
}
```

`POST /emails`, HTTP 429, the daily quota of the free plan is used:

```json
{
  "name": "daily_quota_exceeded",
  "statusCode": 429,
  "message": "You have exceeded your daily email sending quota."
}
```
