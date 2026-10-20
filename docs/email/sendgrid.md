# SendGrid email provider

Checked on: 2026-10-20

This document gives the facts of Twilio SendGrid for this template. Read [README.md](README.md)
first. The README gives the contract, the env keys, and the procedures. This document gives only
the SendGrid part.

| Item               | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| `<slug>`           | `sendgrid`                                                                  |
| `<Name>`           | `Sendgrid` (class `SendgridNotificationProviderService`)                    |
| `<PROVIDER>`       | `SENDGRID`                                                                  |
| Module path        | `apps/backend/src/modules/sendgrid`                                         |
| Provider id        | `sendgrid` (`static identifier` and `id` in `notificationModule(env)`)      |
| Main secret key    | `SENDGRID_API_KEY`                                                          |
| SMTP host          | `smtp.sendgrid.net`                                                         |
| SMTP port          | `587`. Second port: `2525`. STARTTLS on both is **unverified** (section 5). |
| HTTP API send call | `POST https://api.sendgrid.com/v3/mail/send`                                |
| Dashboard          | https://app.sendgrid.com                                                    |

## 1. Sources

Official Twilio SendGrid documentation. Each page also has a Markdown copy: add `.md` to the URL.

- Integrating with the SMTP API (host, ports, user name, SMTP rate limits):
  https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api
- How to send an email with SMTP (Telnet test, `apikey`, port 587):
  https://www.twilio.com/docs/sendgrid/for-developers/sending-email/getting-started-smtp
- SMTP errors and troubleshooting:
  https://www.twilio.com/docs/sendgrid/for-developers/sending-email/smtp-errors-and-troubleshooting
- TLS: https://www.twilio.com/docs/sendgrid/concepts/security/tls
- Configure domain authentication:
  https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication
- Troubleshooting sender authentication:
  https://www.twilio.com/docs/sendgrid/ui/account-and-settings/troubleshooting-sender-authentication
- Sender Identity: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity
- Authenticate a single sender:
  https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification
- How to set up link branding:
  https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-link-branding
- API Keys (create, permissions, test):
  https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys
- Upgrade your plan (free trial):
  https://www.twilio.com/docs/sendgrid/ui/account-and-settings/upgrading-your-plan
- Two-factor authentication:
  https://www.twilio.com/docs/sendgrid/ui/account-and-settings/two-factor-authentication
- Mail Send API overview (base URLs, limitations):
  https://www.twilio.com/docs/sendgrid/api-reference/mail-send
- Mail Send reference (request schema, responses):
  https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
- Mail Send errors: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/errors
- v3 Mail Send FAQ (request rate):
  https://www.twilio.com/docs/sendgrid/for-developers/sending-email/v3-mail-send-faq
- Getting started with the SendGrid API (curl send, message size):
  https://www.twilio.com/docs/sendgrid/for-developers/sending-email/api-getting-started
- v3 API authentication:
  https://www.twilio.com/docs/sendgrid/api-reference/how-to-use-the-sendgrid-v3-api/authentication
- v3 API responses (status codes):
  https://www.twilio.com/docs/sendgrid/api-reference/how-to-use-the-sendgrid-v3-api/responses
- v3 API errors:
  https://www.twilio.com/docs/sendgrid/api-reference/how-to-use-the-sendgrid-v3-api/errors
- v3 API rate limits:
  https://www.twilio.com/docs/sendgrid/api-reference/how-to-use-the-sendgrid-v3-api/rate-limits
- X-Message-ID (glossary): https://www.twilio.com/docs/sendgrid/glossary/x-message-id
- SendGrid message ID (glossary): https://www.twilio.com/docs/sendgrid/glossary/message-id
- Sandbox Mode: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sandbox-mode
- Tracking settings: https://www.twilio.com/docs/sendgrid/ui/account-and-settings/tracking
- Email Activity Feed:
  https://www.twilio.com/docs/sendgrid/ui/analytics-and-reporting/email-activity-feed

## 2. Check before you change the config

Check these pages again before you change the config. Providers change.

- Open each page of section 1. Compare the host, the ports, and the API fields with this document.
- Open the page "Upgrade your plan". Check the free trial and its limits again.
- Open the Mail Send reference. Compare the request schema and the responses with section 7.

## 3. Account setup

1. Sign up at https://signup.sendgrid.com/.
2. Set up two-factor authentication. The page "Upgrade your plan" names it as a step to unlock the
   account.

This section does not make the API key. The procedure "Make the API key" in section 5 makes it.
SMTP and the HTTP API use the same key. Make it one time only.

The free trial:

- A new account gets a free trial of 60 days. The trial starts on the day of the sign-up.
- During the trial, the Email API sends up to 100 emails each day. The page "Upgrade your plan"
  uses the term "Email API" for the API and for SMTP. **Unverified:** whether the 100 emails also
  count the SMTP sends. Plan for it.
- After 60 days, the account stops sending until you upgrade the plan.
- The trial is available one time only. An upgrade ends the trial at once.
- Before an upgrade, set up two-factor authentication and domain authentication, and add a payment
  method. Accounts made before 2020-09-17 skip these steps.
- To upgrade, go to **Settings → Account Details → Your Products**. Under **Email API**, click
  **Change Plan**.
- SendGrid has no sandbox account and no test domain. A trial account sends real email to any
  recipient. **Unverified:** that a trial account has no recipient limit. No page states one.
- The Mail Send API has a sandbox mode for one request (`mail_settings.sandbox_mode`). See
  section 10. The template does not use it.

## 4. Domain setup

Authenticate the domain of `EMAIL_FROM`. SendGrid sends only from an address that matches a
verified Sender Identity. See section 11.

1. Go to **Settings → Sender Authentication** (https://app.sendgrid.com/settings/sender_auth).
2. In **Domain Authentication**, click **Get Started**.
3. Select your DNS host in **Which Domain Name Server (DNS) host do you use?**.
4. Set **Would you also like to brand the links for this domain?** to **No**. The template turns
   off click tracking, so it does not need link branding.
5. Click **Next**.
6. In **Domain You Send From**, type the domain of `EMAIL_FROM`, for example `example.com`. Type
   no `www` and no `http://`.
7. Open **Advanced Settings**. Keep **Use automated security** on.
8. Click **Next**. The page **Install DNS Records** shows four records.
9. Add the four records at your DNS host.
10. Click **Verify**.

The records with automated security on (example from the page "Configure domain authentication";
your values are different):

| Type    | Host                        | Value                                           | Purpose |
| ------- | --------------------------- | ----------------------------------------------- | ------- |
| `CNAME` | `em[0000].example.com`      | `[u00000000].[wl000].sendgrid.net`              | SPF     |
| `CNAME` | `s1._domainkey.example.com` | `s1.domainkey.[u00000000].[wl000].sendgrid.net` | DKIM    |
| `CNAME` | `s2._domainkey.example.com` | `s2.domainkey.[u00000000].[wl000].sendgrid.net` | DKIM    |
| `TXT`   | `_dmarc.example.com`        | `v=DMARC1; p=none;`                             | DMARC   |

- The SPF record is on the subdomain `em[0000]`, not on the root domain. Do not change the SPF
  record of the root domain for SendGrid.
- A domain has only one DMARC record. If `_dmarc` already has a record, keep it. Do not add the
  SendGrid DMARC record.
- If `_dmarc` has no record, add the README start value (`v=DMARC1; p=none; rua=mailto:<address>`)
  in place of the SendGrid value. It also has `p=none`. **Unverified:** that **Verify** accepts a
  DMARC value that is not the exact SendGrid text.
- The domain passes when the domain shows as verified on **Settings → Sender Authentication**.
  SendGrid then shows the records. **Unverified:** the exact label of the verified state.
- Turn off **Use automated security** only if your DNS host refuses an underscore in a `CNAME`
  record. Then SendGrid gives one `MX` record and three `TXT` records (SPF, DKIM, DMARC). You must
  then change these records yourself when the SendGrid setup changes.
- If the DKIM selector `s1` or `s2` is already in use, set **Use a custom DKIM selector** in step 7.
- Verification can take up to 48 hours. If only some records verify, wait. Then check each record
  for a typing error.
- Some DNS hosts add the domain to the host name. Type only the part before the domain, for
  example `em123`, not `em123.example.com`. Else the record becomes
  `em123.example.com.example.com` and fails.
- A subdomain does not get the authentication of its parent domain. Authenticate the exact domain
  of `EMAIL_FROM`. For `orders@mail.example.com`, authenticate `mail.example.com`.
- When the domain of `EMAIL_FROM` matches an authenticated domain exactly, SendGrid counts each
  address on that domain as a verified sender.

**Single Sender Verification** verifies one address with a confirmation email and no DNS. SendGrid
says that it "works for testing only". Do not use it in production.

## 5. SMTP

| Item      | Value                                                                       |
| --------- | --------------------------------------------------------------------------- |
| Host      | `smtp.sendgrid.net`. Do not use an IP address. The IP addresses change.     |
| Port 587  | STARTTLS. `SMTP_SECURE=false`. SendGrid recommends this port.               |
| Port 2525 | STARTTLS. `SMTP_SECURE=false`. The second port.                             |
| Port 25   | STARTTLS. `SMTP_SECURE=false`. Many hosts block it. Do not use it.          |
| Port 465  | Implicit TLS ("SSL connection"). `SMTP_SECURE=true`.                        |
| User name | The literal text `apikey`. It is not the account user name and not the key. |
| Password  | An API key with the **Mail Send** permission. See "Make the API key" below. |

- The SMTP page says "an unencrypted or a TLS connection" for the ports 25, 2525, and 587. It does
  not use the word STARTTLS. **Unverified:** that ports 2525 and 587 offer STARTTLS. The template
  requires STARTTLS when `SMTP_USER` has a value. Do the STARTTLS check of the README section
  "SMTP port check" on the server.
- One SMTP connection sends up to 5,000 messages. The template opens one connection for each
  email, so this limit does not apply.
- A successful send ends with `250 Ok: queued as <id>`. The `smtp` provider returns the
  `Message-ID` header of Nodemailer as the id. The SendGrid message ID in the Activity Feed is a
  different value.
- The SMTP response `403 You are not authorized to send from that email address` means that
  `EMAIL_FROM` has no verified Sender Identity. See section 11.
- The SMTP response `550 Unauthenticated Senders Not Allowed` means that the connection sent the
  email before the login. Check that `SMTP_USER` and `SMTP_PASSWORD` both have a value.

### Make the API key

The SMTP password and `SENDGRID_API_KEY` are this key.

1. Go to **Settings → API Keys** (https://app.sendgrid.com/settings/api_keys).
2. Click **Create API Key**.
3. Type a name in **API Key Name**, for example `store-email`.
4. Select **Custom Access**.
5. Give the permission **Mail Send** full access. Give no other permission.
6. Click **Create & View**.
7. Click the key to copy it. The console shows the key only one time.

- The SMTP page asks for "at least 'Mail' permissions". The Telnet page asks for full access
  "Mail Send" permissions. **Mail Send** full access satisfies both.
- If you lose the key, delete it. Then make a new key. SendGrid cannot show a key again.

## 6. Environment values

The SMTP values for the production `.env`:

| Key               | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| `SMTP_HOST`       | `smtp.sendgrid.net`                                                       |
| `SMTP_PORT`       | `587`. If the server blocks it, `2525`.                                   |
| `SMTP_SECURE`     | `false` (for `587` and `2525`). `true` only for `465`.                    |
| `SMTP_USER`       | `apikey`                                                                  |
| `SMTP_PASSWORD`   | The API key of section 5, with no space and no line break.                |
| `EMAIL_FROM`      | An address on the authenticated domain, for example `orders@example.com`. |
| `EMAIL_FROM_NAME` | The Medusa store name, for example `Everyday`.                            |

- Paste the API key on one line. A space or a line break in the key stops the login.
- **Unverified:** that each API key starts with `SG.`. The SMTP page uses `SG.someactualkey` as an
  example.

An HTTP API provider adds one key, `SENDGRID_API_KEY`. It reuses `EMAIL_FROM` and `EMAIL_FROM_NAME`.
When `SENDGRID_API_KEY` has a value, the `sendgrid` provider takes the `email` channel. Else the
SMTP rule of the README applies, so development keeps Mailpit.

| Place                                            | `SENDGRID_API_KEY` value                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `apps/backend/.env.example`                      | empty. The comment names **Settings → API Keys**.                           |
| `apps/backend/.env.test`                         | empty                                                                       |
| `.env.example` (repository root)                 | empty, never `change-me`                                                    |
| `docker-compose.yml`, `x-medusa-environment`     | `SENDGRID_API_KEY: ${SENDGRID_API_KEY:-}`                                   |
| `docs/deployment.md`, section "Environment file" | One row, only in a project that uses the `sendgrid` provider in production. |

The README section [Env keys](README.md#env-keys) gives the reasons:

- Any value selects the `sendgrid` provider, also `change-me`. Thus the key is empty in the three
  env files.
- The `:-` gives an empty value when `.env` has no line for the key.
- The env check of `docs/deployment.md` requires a value for each key of its table. Thus only a
  project that uses the `sendgrid` provider in production adds the row.

The row for the table in `docs/deployment.md` (Key, Purpose, Value):

```text
| `SENDGRID_API_KEY` | The SendGrid API key. A value sends the email over the SendGrid HTTP API, not SMTP. | The key from docs/email/sendgrid.md, section 5. |
```

- The HTTP API provider uses the same API key as SMTP: **Mail Send** full access.
- Do not write a placeholder such as `change-me` in `SENDGRID_API_KEY` in `.env`. Any value turns
  on the HTTP API provider, so a placeholder makes each send fail with HTTP `401`.
- To go back to SMTP, make `SENDGRID_API_KEY` empty and do the deploy again.
- With the HTTP API provider, the SMTP keys have no effect (README, "Registration"). Keep the SMTP
  keys in `.env` with their values. The env check of `docs/deployment.md` then still passes.
- The provider needs no base URL key. The base URL is `https://api.sendgrid.com` for each account
  of the global region. See section 7.

## 7. HTTP API: send one email

Base URL and authentication:

- Call `POST https://api.sendgrid.com/v3/mail/send`.
- The EU base URL `https://api.eu.sendgrid.com` is only for EU regional subusers (Pro plan or
  higher). The template uses the global base URL.
- Send the header `Authorization: Bearer <SENDGRID_API_KEY>`. SendGrid accepts no Basic
  authentication.
- Send the header `Content-Type: application/json`. The body is JSON in UTF-8.
- Send the header `Accept: application/json`. The page "Responses" lists HTTP 406 for a request
  with no `Accept` header. **Unverified:** that Mail Send gives 406 without it. The official curl
  examples send no `Accept` header.

The request body for the six fields:

| Template field | JSON field                                               | Rule                                                                           |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Recipient      | `personalizations[0].to[0].email`                        | One personalization with one `to` object. Required.                            |
| Subject        | `subject`                                                | At least one character. Required.                                              |
| Plain text     | `content[0]` = `{ "type": "text/plain", "value": text }` | `text/plain` must be first. At least one character.                            |
| HTML           | `content[1]` = `{ "type": "text/html", "value": html }`  | `text/html` must be second.                                                    |
| Sender         | `from.email` and `from.name`                             | `from.email` is required. Send `name` only when `EMAIL_FROM_NAME` has a value. |
| Reply-To       | `reply_to.email`                                         | Send `reply_to` only when the store contact email is set.                      |

```json
{
  "personalizations": [{ "to": [{ "email": "customer@example.com" }] }],
  "from": { "email": "orders@example.com", "name": "Everyday" },
  "reply_to": { "email": "help@example.com" },
  "subject": "Sign in to Everyday",
  "content": [
    { "type": "text/plain", "value": "Sign in: https://example.com/auth/verify?token=abc" },
    {
      "type": "text/html",
      "value": "<p><a href=\"https://example.com/auth/verify?token=abc\">Sign in</a></p>"
    }
  ]
}
```

- SendGrid refuses `text/html` before `text/plain` with HTTP 400. The page "Mail Send errors"
  cites RFC 1341, section 7.2.
- Do not send `reply_to` and `reply_to_list` together. SendGrid refuses the request.
- Do not send a `name` on the recipient. The template has no recipient name.
- Do not send other fields, for example `tracking_settings`, `mail_settings`, or `headers`. The
  README permits only the six fields.

The response:

- Success is HTTP `202 Accepted`. Use the README rule: each 2xx status is a success
  (`response.ok`). The reference defines no body for `202`. Do not read the body of a success.
- The message id is in the response header `X-Message-Id`. The glossary writes it as
  `X-Message-ID`. A header name is not case-sensitive, so read
  `response.headers.get("x-message-id")`.
- Return `{ id: <X-Message-Id value> }`. **Unverified:** that each `202` response has the header.
  If the header is absent, return `{ id: undefined }`, as the README says.

The error format:

- An error response has a JSON body with an `errors` array. Each item has `message` (string),
  `field` (string or null), and an optional `help` (object). The body can also have an `id`.
- Read the body with `response.text()`, then try `JSON.parse`. A gateway error page is not JSON.
- SendGrid has no error code field. For the part `Code: <code>` of the README error message, use
  `errors[0].field`. Write `Code: unknown.` in these cases:
  - The body is not JSON.
  - `errors` is absent or empty.
  - `errors[0].field` is null, the text `"null"`, or absent.
- A network error or a timeout has no HTTP status. Write `Code: <error.name>.` with no `Status:`
  part, for example `Code: TimeoutError.` See the message table of the README.
- Do not put `errors[].message` in the error message. A message can contain an email address,
  for example in a sender error.

| Status | Meaning                                                                                    |
| ------ | ------------------------------------------------------------------------------------------ |
| `400`  | Bad request body. `errors[]` names each bad field.                                         |
| `401`  | Wrong or absent API key (`"authorization required"`).                                      |
| `403`  | `from` does not match a verified Sender Identity, or a temporary block after bad requests. |
| `413`  | The request is too large (`"content too large"`).                                          |
| `429`  | Rate limit. See section 8.                                                                 |
| `500`  | SendGrid server error.                                                                     |

## 8. Limits

| Limit                             | Value                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Free trial                        | 100 emails each day, for 60 days. See section 3.                                                    |
| Paid plans                        | **Unverified.** The docs link to https://sendgrid.com/pricing and give no quota.                    |
| Mail Send request rate            | Up to 10,000 requests each second (v3 Mail Send FAQ).                                               |
| Recipients for each request       | 1,000 (`to`, `cc`, and `bcc` together). The template sends 1.                                       |
| Message size                      | Below 30 MB on the Mail Send overview. 20 MB on "Getting started with the SendGrid API". Use 20 MB. |
| SMTP messages for each connection | 5,000                                                                                               |
| SMTP concurrent connections       | 10,000 from one server                                                                              |

- Each v3 response has the headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
  `X-RateLimit-Reset`. After the limit, the API returns HTTP `429` until the reset time.
- Many bad requests in a short time cause a temporary block of some minutes (HTTP `403` on the
  API, `550` on SMTP).
- The template emails are far below these limits. The free trial limit of 100 emails each day is
  the only limit that a small store can reach.

## 9. Tracking and dashboard settings

SendGrid has click tracking, open tracking, subscription tracking, and Google Analytics tracking.
Turn off each one.

1. Go to **Settings → Tracking** (https://app.sendgrid.com/settings/tracking).
2. Click **Click Tracking**.
3. Set **Setting State** to **Disabled**.
4. Clear **Also enable click tracking in plain text emails**.
5. Click **Save**.
6. Click **Open Tracking**.
7. Set **Setting State** to **Disabled**.
8. Click **Save**.
9. Do steps 6 to 8 for **Subscription Tracking** and **Google Analytics Tracking**.

- Click tracking rewrites each link in the email. The link then points to a SendGrid server or to
  a branded link domain. The magic link then does not open the store URL directly.
- With **Also enable click tracking in plain text emails**, click tracking also changes the links
  in the plain text part. The plain text of the template has each link as `label: URL`.
- Open tracking adds a transparent image of one pixel to the end of the HTML part.
- Subscription tracking adds an unsubscribe link to the end of each email. The template emails are
  transactional and must not have it.
- **Unverified:** the default state of each setting on a new account. Check each setting.
- **Settings → Mail Settings** has other settings, for example **Footer** and **Legacy Email
  Template**. Both change the email. Keep them off.

## 10. Test send

Test the API key and the sender before you change the env:

1. Run this command on the server. Replace the key and the two addresses.

```bash
curl -i --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header 'Authorization: Bearer <SENDGRID_API_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"personalizations":[{"to":[{"email":"<your inbox>"}]}],"from":{"email":"<EMAIL_FROM>"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

2. Make sure that the output shows `HTTP/2 202` or `HTTP/1.1 202 Accepted`.
3. Make sure that the output has an `x-message-id` header.
4. Open your inbox. Find the email "Test". Also look in the spam folder.

Test SMTP with the template:

1. Set the SMTP values of section 6 in `.env`.
2. Do the steps 11 and 12 of the README procedure
   [Set up a provider over SMTP](README.md#set-up-a-provider-over-smtp). A plain restart does not
   read the changed `.env`.
3. Sign in on the storefront with your email address.
4. Open the sign-in email. Click the link.
5. Make sure that the browser opens the store URL, not a SendGrid URL.

Find the delivery log:

1. Open the dashboard. Click **Activity** (https://app.sendgrid.com/email_activity).
2. Type the recipient in **To email address**.
3. Click **Search**.
4. Click the message. The panel shows the events, for example **Processed**, **Delivered**,
   **Dropped**, **Bounced**, or **Blocked**.

- **Dropped** means that SendGrid did not try to send. The recipient is on a suppression list,
  for example after a bounce or a spam report.
- The feed keeps the events for up to 30 days only with the Email Activity history add-on.
  **Unverified:** how many days the feed keeps the events without the add-on.
- A Mail Send request with `mail_settings.sandbox_mode.enable: true` returns `200` and sends no
  email. It shows no event in the Activity Feed and uses no credit. It checks only the request
  body.

## 11. Traps

- **Sender Identity.** SendGrid refuses an email when `from` does not match a verified Sender
  Identity. The API returns HTTP `403`. SMTP returns the response code `403` (section 5).
  Authenticate the exact domain of `EMAIL_FROM` (section 4).
  - Over SMTP, the backend log line then ends with `Response code: 403.` The README list of SMTP
    failures names this `403` in the codes from 400 to 499.
  - **Unverified:** that Nodemailer reports this reply as `Response code: 403.` The code `403` is
    not a standard SMTP reply code. The SendGrid page "SMTP errors and troubleshooting" lists it.
- **The SMTP user name.** `SMTP_USER` is the text `apikey`. It is not the account user name and not
  the key.
- **The API key permission.** A key with no **Mail Send** permission cannot send. Use **Custom
  Access** with **Mail Send** full access (section 5, "Make the API key").
- **The key shows one time only.** If you lose the key, delete it and make a new key.
- **The free trial ends after 60 days.** Then the account stops sending, and every order email
  fails. Upgrade the plan before the store opens.
- **The free trial sends 100 emails each day.** A busy day of orders can pass this limit.
- **A subdomain is not authenticated.** Authenticate the exact domain of `EMAIL_FROM`.
- **The DNS host adds the domain.** Type only the host part of each record (section 4).
- **Click tracking changes the magic link.** Turn it off, also for plain text (section 9).
- **The order of `content`.** `text/plain` comes first, `text/html` second. Else HTTP 400.
- **Unicode in `from`.** The Mail Send overview says: "Unicode encoding is not supported for the
  `from` field." This limit is on the HTTP API only.
  - SMTP: Nodemailer encodes a sender name that is not ASCII. The README rule applies:
    `EMAIL_FROM_NAME` is the same text as the store name.
  - HTTP API: **Unverified:** whether the limit includes `from.name`. If the store name is not
    ASCII, do one test send. If SendGrid returns HTTP `400` for `from`, use an ASCII
    `EMAIL_FROM_NAME`. This rule wins over the README rule, because else every send fails.
- **Port 465 needs `SMTP_SECURE=true`.** The template stops the start with port 465 and
  `SMTP_SECURE=false`.
- **The message ID is different in each place.** The `X-Message-Id` header, the `Message-ID`
  header, and the SendGrid message ID in the Activity Feed (`sg_message_id` in the Event Webhook)
  are three values.

## 12. Example JSON for test mocks

A success response. `fetch` gets status `202`, the header `x-message-id`, and an empty body. The
header value is an example. **Unverified:** the exact format of the value.

The message id is in a header. Thus each mock response needs `headers`, in addition to the `ok`,
`status`, and `text()` of the README. Give `headers` also to the error mocks. For example:
`{ ok: true, status: 202, headers: new Headers({ "x-message-id": "XBg2anf2TqCy6WXKQFhieQ" }), text: async () => "" }`.

In the README test case "The request has the URL, the authentication, and the six fields", check
these three request headers:

- `Authorization: Bearer <apiKey>`
- `Content-Type: application/json`
- `Accept: application/json`

```json
{
  "status": 202,
  "headers": {
    "x-message-id": "XBg2anf2TqCy6WXKQFhieQ"
  },
  "body": ""
}
```

An error response for a bad API key (HTTP `401`). The body comes from the Mail Send reference.

```json
{
  "errors": [
    {
      "message": "authorization required",
      "field": null
    }
  ]
}
```

An error response for a bad body (HTTP `400`). The message comes from the page "Mail Send
errors".

```json
{
  "errors": [
    {
      "message": "The content value must be a string at least one character in length.",
      "field": "content.0.value"
    }
  ]
}
```

- **Unverified:** the exact `field` value in a real `400` response. A real item can also have
  `help`, which the reference types as an object. The provider does not read `help`.
- The reference examples write `"field": "null"` as a string. Accept a `null` value and a string
  value.
