# Cloudflare email provider

Checked on: 2026-10-20

This document gives the facts of Cloudflare Email Service for this template. Read
[README.md](README.md) first. The README gives the contract, the procedures and the checklist. This
document gives only the Cloudflare part. Cloudflare calls the sending part of Email Service "Email
Sending".

| Item                    | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `<slug>`                | `cloudflare`                                                     |
| `<Name>`                | `Cloudflare` (class `CloudflareNotificationProviderService`)     |
| `<PROVIDER>`            | `CLOUDFLARE`                                                     |
| Module path             | `apps/backend/src/modules/cloudflare`                            |
| SMTP host and port      | `smtp.mx.cloudflare.net`, port `465` only (implicit TLS)         |
| SMTP user name          | The literal text `api_token`                                     |
| SMTP password           | A Cloudflare API token with the permission "Email Sending: Edit" |
| Plan                    | Workers Paid, for any recipient                                  |
| HTTP API main key       | `CLOUDFLARE_API_TOKEN` (not `CLOUDFLARE_API_KEY`, see section 6) |
| Open and click tracking | None in the documentation (see section 9)                        |

## 1. Sources

Official Cloudflare documentation. Each page also has a Markdown copy: add `index.md` to the URL.

- Documentation index: https://developers.cloudflare.com/email-service/llms.txt
- Overview (plans): https://developers.cloudflare.com/email-service/
- Send emails (get started): https://developers.cloudflare.com/email-service/get-started/send-emails/
- SMTP: https://developers.cloudflare.com/email-service/api/send-emails/smtp/
- Send email over SMTP (Nodemailer example):
  https://developers.cloudflare.com/email-service/examples/email-sending/smtp/
- REST API: https://developers.cloudflare.com/email-service/api/send-emails/rest-api/
- API reference, "Send an email":
  https://developers.cloudflare.com/api/resources/email_sending/methods/send/
- Specify recipients (named sender, `reply_to`):
  https://developers.cloudflare.com/email-service/examples/email-sending/recipients/
- Email headers: https://developers.cloudflare.com/email-service/reference/headers/
- Domain configuration: https://developers.cloudflare.com/email-service/configuration/domains/
- Configure subdomains: https://developers.cloudflare.com/email-service/configuration/subdomains/
- Email routing rules and addresses (verified destination addresses):
  https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/
- Limits: https://developers.cloudflare.com/email-service/platform/limits/
- Pricing: https://developers.cloudflare.com/email-service/platform/pricing/
- Workers pricing (Workers Paid plan): https://developers.cloudflare.com/workers/platform/pricing/
- Email lifecycle: https://developers.cloudflare.com/email-service/concepts/email-lifecycle/
- Suppression lists: https://developers.cloudflare.com/email-service/concepts/suppressions/
- Activity log: https://developers.cloudflare.com/email-service/observability/logs/
- Metrics and analytics:
  https://developers.cloudflare.com/email-service/observability/metrics-analytics/
- Event subscriptions: https://developers.cloudflare.com/email-service/reference/event-subscriptions/
- Troubleshooting: https://developers.cloudflare.com/email-service/reference/troubleshooting/
- FAQ: https://developers.cloudflare.com/email-service/reference/faq/
- Changelog: https://developers.cloudflare.com/email-service/platform/changelog/
- Create API token: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- Account API tokens:
  https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/
- Find account and zone IDs:
  https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/
- Set up a primary zone (Full setup): https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
- Proxy status: https://developers.cloudflare.com/dns/proxy-status/

## 2. Check before you change the config

Check these facts again before you change `.env` or write code. Email Sending is in beta, so the
facts can change.

1. Open each page of section 1. Compare the "Last updated" date with the date at the top of this
   document.
2. On the SMTP page, read the endpoint table. If Cloudflare adds a second port, update section 5 and
   section 11.
3. On the overview page and the pricing page, read the plan rule. If Email Sending becomes
   available on Workers Free, update section 3 and section 11.
4. On the REST API page and the API reference, compare the request fields and the response fields
   with section 7.
5. Search the documentation for "tracking". If Cloudflare adds open tracking or click tracking,
   update section 9.

## 3. Account setup

**Warning:** Buy the Workers Paid plan before the first real order. Without it, Email Sending
delivers only to the verified destination addresses of the account. A customer address is not one
of them.

1. Make a Cloudflare account at https://dash.cloudflare.com/.
2. Add the domain of `EMAIL_FROM` to the account as a full setup. Email Service works only with
   Cloudflare DNS ("You must be using Cloudflare DNS to use Email Service"). The steps follow in
   [Move the DNS to Cloudflare](#move-the-dns-to-cloudflare).
3. Buy the Workers Paid plan. The minimum charge is 5 USD for each month. **Unverified:** the menu
   path of the plan page. The Email Service pages do not give it.
4. Make an API token. Use an account API token, because the SMTP page recommends it. It also
   stays valid when the user who made it leaves.
   1. Go to **Manage account** > **Account API tokens**.
   2. Select **Create Token**.
   3. Give the token a name, for example `store-email`.
   4. Add the permission **Email Sending** with the level **Edit**. **Unverified:** the permission
      group of "Email Sending: Edit" in the token form. The token permission reference does not
      list it.
   5. Do not set an expiry date. An expired token stops all email.
   6. Select **Continue to summary**.
   7. Select **Create Token**.
   8. Copy the token. Cloudflare shows the token only one time. An account token starts with
      `cfat_`.
5. Copy the account ID, for an HTTP API provider only. In the dashboard, open **Search**. Enter
   `Copy account ID` and select the result.

### Move the DNS to Cloudflare

**Warning:** Copy every DNS record before you change the nameservers. A missing A record stops the
store. The page "Set up a primary zone" says that the quick scan can miss records.

1. In the dashboard, go to **Domains**.
2. Select **Onboard a domain**.
3. Enter the root domain, for example `<domain>`.
4. Select **Continue**.
5. Select a plan. The Free plan of the zone is enough. The Workers Paid plan is a separate plan.
6. Compare the records that Cloudflare found with the records at the current DNS host.
7. Add each missing record. Look at the A records `<domain>`, `api.<domain>` and
   `assets.<domain>` of the section "DNS records" in `docs/deployment.md`. Also look at the MX
   records and the TXT records.
8. Set the proxy status of each A record to **DNS only** (gray cloud).
9. At the registrar of the domain, replace the nameservers with the two Cloudflare nameservers. The
   zone **Overview** page shows them.
10. Wait until the zone **Overview** page shows that the domain is active.

- With **DNS only**, the browser connects to Caddy directly, as before. Caddy then gets its
  certificates with no change.
- **Proxied** (orange cloud) sends the web traffic through Cloudflare. **Unverified:** that the
  automatic HTTPS of Caddy works behind the Cloudflare proxy. This document does not describe that
  setup.
- **DNS only** shows the IP address of the server to each DNS query (page "Proxy status"). The A
  records at the old DNS host also showed it.

Plan facts (pages "Overview" and "Pricing"):

- Workers Free: Email Sending is not available. You can send only to verified destination addresses
  of the account, from an Email Routing domain. This is free on all plans.
- Workers Paid: 3,000 emails for each month are included. Each 1,000 more emails cost 0.35 USD.
- A send to a verified destination address does not count toward the quota.

You can add a verified destination address in **Compute** > **Email Service** > **Email Routing** >
**Destination Addresses**. Use it only for a test before you buy the plan. **Unverified:** whether
the free send to a verified destination address also works over SMTP. The pages name only the REST
API and the Workers binding.

## 4. Domain setup

Cloudflare adds all the sending DNS records when you onboard the domain. You add no record by
hand. This is different from step 5 of the README procedure. The reason: the onboarding writes and
locks the records. Thus do these steps in place of README step 5. The README section "DNS records"
gives the purpose of each record.

1. In the dashboard, go to **Compute** > **Email Service** > **Email Sending**.
2. Select **Onboard Domain**.
3. Select the domain of `EMAIL_FROM`.
4. Select **Done**.
5. Wait 5 to 15 minutes. DNS changes can take up to 24 hours.
6. Go to **Compute** > **Email Service** > **Email Sending** > **Settings**.
7. Make sure that the **DNS records** section shows each record as **Locked** or **Unlocked**. Both
   states are correct.

The README final checklist has the item "The provider dashboard shows the domain as verified". For
Cloudflare, use the check of step 7.

The sending records (page "Domain configuration"):

| Type | Name                            | Value                                                            |
| ---- | ------------------------------- | ---------------------------------------------------------------- |
| MX   | `cf-bounce.<domain>`            | `route1.mx.cloudflare.net`, `route2...`, `route3...` (3 records) |
| TXT  | `cf-bounce.<domain>`            | `v=spf1 include:_spf.mx.cloudflare.net ~all`                     |
| TXT  | `cf-bounce._domainkey.<domain>` | `v=DKIM1; h=sha256; k=rsa; p=<public key from Cloudflare>`       |
| TXT  | `_dmarc.<domain>`               | The DMARC policy                                                 |

- The SPF record and the MX records are on the subdomain `cf-bounce`, not on the root domain.
  Cloudflare uses `cf-bounce` as the bounce address. Thus the sending needs no change to the SPF
  record of the root domain.
- Keep one SPF record for each name. Two `v=spf1` records on one name break the SPF check.
- The DKIM selector is `cf-bounce`. Email Routing uses a different selector, `cf2024-1`.
- "Email Service ensures proper alignment automatically" (page "Troubleshooting"). Thus DMARC passes
  with these records.
- DMARC: the example on the page is `v=DMARC1; p=reject;`. The README gives the start value
  `p=none`. **Unverified:** which DMARC value Cloudflare adds, what it does with a DMARC record
  that already exists, and whether it locks the `_dmarc` record. Do these steps after the
  onboarding:
  1. Read the record with `dig TXT _dmarc.<domain> +short`.
  2. Find the `_dmarc` record in **Compute** > **Email Service** > **Email Sending** > **Settings**.
  3. If the record is **Unlocked**, set the value of the README in **DNS** > **Records**.
  4. If the record is **Locked**, keep the value of Cloudflare. Email Service aligns SPF and DKIM
     (see the bullet above), so the emails of the template pass DMARC.
  5. With `p=quarantine` or `p=reject`, make sure that each other service that sends as
     `<domain>` passes SPF or DKIM. Else the receivers reject its emails.
- Cloudflare locks the `cf-bounce` records for the lifetime of the domain configuration. Do not try
  to edit them.
- A subdomain, for example `mail.<domain>`, is a separate sending domain. Onboard the exact domain of
  `EMAIL_FROM`.

Check the records from any computer:

```bash
dig MX cf-bounce.<domain> +short
dig TXT cf-bounce.<domain> +short
dig TXT cf-bounce._domainkey.<domain> +short
dig TXT _dmarc.<domain> +short
```

## 5. SMTP

| Setting   | Value                                                            |
| --------- | ---------------------------------------------------------------- |
| Host      | `smtp.mx.cloudflare.net`                                         |
| Port      | `465`                                                            |
| Security  | Implicit TLS (SMTPS). `SMTP_SECURE=true`.                        |
| SMTP AUTH | `PLAIN` or `LOGIN`                                               |
| User name | The literal text `api_token`                                     |
| Password  | A Cloudflare API token with the permission "Email Sending: Edit" |

- Port `465` is the only SMTP port. Cloudflare has no STARTTLS on port `587`. Port `25` is only for
  incoming mail. There is no second port. If the server cannot open port `465`, read section 11.
- The password is the API token of section 3. It is not the Global API Key and not the account
  password.
- The user name is not your email address and not the account ID. It is always `api_token`.
- The `smtp` provider code needs no change. `transportOptions` sets `secure: true` for `SMTP_SECURE=true`.
  `validateSmtpOptions` stops the backend start if port `465` has `SMTP_SECURE=false`.
- The Cloudflare Nodemailer example uses the same options: `host`, `port: 465`, `secure: true`,
  and `auth: { user: "api_token", pass: <token> }`.

The SMTP replies that the `smtp` provider can log as `Response code` (page "SMTP"):

| Code        | Meaning                                                                                 |
| ----------- | --------------------------------------------------------------------------------------- |
| `250 2.0.0` | Cloudflare accepted the message. The reply contains the assigned Message-ID.            |
| `421`       | The service is not available now. Try again later.                                      |
| `451 4.3.0` | Cloudflare accepted the message but deferred it. Try again later. See the note below.   |
| `535 5.7.8` | Authentication failed. Check the user name, the token and its permission.               |
| `550 5.7.1` | Sender denied. The domain of `EMAIL_FROM` is not onboarded on the account of the token. |
| `552 5.3.4` | The message is larger than 5 MiB.                                                       |
| `554`       | The policy rejected the content.                                                        |

- `421` and `451`: the `smtp` provider does not try again. It logs the error and throws.
  **Unverified:** whether Cloudflare delivers a message later after a `451` reply. Before you send
  the email again by hand, look for it in the Activity log (section 10). This prevents a second
  copy.

## 6. Environment values

| Key               | Production value                                                  |
| ----------------- | ----------------------------------------------------------------- |
| `SMTP_HOST`       | `smtp.mx.cloudflare.net`                                          |
| `SMTP_PORT`       | `465`                                                             |
| `SMTP_SECURE`     | `true`                                                            |
| `SMTP_USER`       | `api_token`                                                       |
| `SMTP_PASSWORD`   | The API token of section 3                                        |
| `EMAIL_FROM`      | An address on the onboarded domain, for example `orders@<domain>` |
| `EMAIL_FROM_NAME` | The store name                                                    |

Development keeps the Mailpit values of `apps/backend/.env.example`. Do not put a Cloudflare token
in a committed file.

For an HTTP API provider only, add these two keys:

| Key                     | Value                       | Purpose                                    |
| ----------------------- | --------------------------- | ------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | The API token of section 3  | The bearer token. It selects the provider. |
| `CLOUDFLARE_ACCOUNT_ID` | The account ID of section 3 | The account part of the request URL.       |

- `CLOUDFLARE_API_TOKEN` replaces `<PROVIDER>_API_KEY` of the README. Cloudflare calls the secret an
  "API token", and the Cloudflare examples use the name `CLOUDFLARE_API_TOKEN`.
- The HTTP API provider takes the `email` channel when `CLOUDFLARE_API_TOKEN` has a value. Else the
  `smtp` rule of the README section "Environment keys" applies, so development keeps Mailpit.
- The provider reuses `EMAIL_FROM` and `EMAIL_FROM_NAME`.
- Keep the SMTP values of the first table in the production `.env`. They have no effect while
  `CLOUDFLARE_API_TOKEN` has a value. The env check of `docs/deployment.md` needs a value for each
  key.
- **Unverified:** that one token serves SMTP and the HTTP API. The REST API page says only "a
  token that has permission to send emails". It does not name the permission or the token type.
  Use the account API token of section 3 first. Then use the error code of section 7:
  - `10102`: the token has no permission to send. Add "Email Sending: Edit" to the token.
  - `10103`: wrong token type. Make a user token with the same permission in **My Profile** >
    **API Tokens**. Put it in `CLOUDFLARE_API_TOKEN`. The SMTP password can keep the account token.

The values of the two keys in the five places of the README section "Env keys":

| Place                                 | `CLOUDFLARE_API_TOKEN`                 | `CLOUDFLARE_ACCOUNT_ID`                |
| ------------------------------------- | -------------------------------------- | -------------------------------------- |
| `apps/backend/.env.example`           | empty                                  | empty                                  |
| `apps/backend/.env.test`              | empty                                  | empty                                  |
| `.env.example` at the repository root | empty                                  | empty                                  |
| The table in `docs/deployment.md`     | a row, only with the HTTP API provider | a row, only with the HTTP API provider |
| `x-medusa-environment` anchor         | `${CLOUDFLARE_API_TOKEN:-}`            | `${CLOUDFLARE_ACCOUNT_ID:-}`           |

- Keep `CLOUDFLARE_API_TOKEN` empty in the root `.env.example`, never `change-me`. A value in this
  key selects the provider, also `change-me`.
- The account ID is not a secret, but it has no fixed value. Thus it is also empty.
- Add the two rows to the table of `docs/deployment.md` only in a project that uses the Cloudflare
  HTTP API provider in production.
- The comment of `CLOUDFLARE_API_TOKEN` in `apps/backend/.env.example` names **Manage account** >
  **Account API tokens**. The comment of `CLOUDFLARE_ACCOUNT_ID` names the search command
  `Copy account ID`.

The shape of the entry in `notificationModule(env)`:

```ts
{
  resolve: "./src/modules/cloudflare",
  id: "cloudflare",
  options: {
    channels: ["email"],
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME || undefined,
  },
}
```

- The option names are `apiToken` and `accountId`, not the `apiKey` of the README. The names follow
  the Cloudflare terms, as the env keys do.
- The condition of `notificationModule(env)` checks only `CLOUDFLARE_API_TOKEN`, in place of
  `<PROVIDER>_API_KEY`. It also throws when `EMAIL_FROM` is empty, as in the README.
- `validateOptions` throws `INVALID_DATA` when `accountId`, `apiToken`, or `from` is empty. The
  messages name the option, never its value. Thus an empty `CLOUDFLARE_ACCOUNT_ID` stops the start.

## 7. HTTP API: send one email

Use the global `fetch`. Cloudflare also has a Node SDK, but the README rule is `fetch`.

- Base URL: `https://api.cloudflare.com/client/v4`
- Request: `POST /accounts/{account_id}/email/sending/send`
- Headers:
  - `Authorization: Bearer <CLOUDFLARE_API_TOKEN>`
  - `Content-Type: application/json`
- Timeout: `AbortSignal.timeout(10000)`, as the README says.

The request body for the six fields of the template:

```json
{
  "to": "customer@example.com",
  "from": { "address": "orders@example.com", "name": "Everyday" },
  "subject": "Your order is confirmed",
  "html": "<p>Thank you for your order.</p>",
  "text": "Thank you for your order.",
  "reply_to": "owner@example.com"
}
```

| Template field | Request field | Rule                                                                          |
| -------------- | ------------- | ----------------------------------------------------------------------------- |
| Recipient      | `to`          | One address as a string.                                                      |
| Subject        | `subject`     | A string, up to 998 characters.                                               |
| HTML           | `html`        | The output of `renderTemplate`.                                               |
| Plain text     | `text`        | The output of `htmlToText`.                                                   |
| Sender         | `from`        | `{ "address": ..., "name": ... }` with a name. A plain string without a name. |
| Reply-To       | `reply_to`    | A string. Leave out the field when the store contact email is empty.          |

- The named sender object uses `address`, not `email`. The Workers binding uses `email`. Do not copy
  the Workers examples.
- The field is `reply_to`, not `replyTo`. The `replyTo` name is only for the Workers binding.
- Do not put `From`, `To`, `Subject` or `Reply-To` in a `headers` object. Cloudflare rejects them
  there.
- The API reference does not show the body schema. The field shapes come from the examples on the
  pages "REST API", "Specify recipients" and "Send an email". **Unverified:** whether `reply_to`
  also takes an object with `address` and `name`. Send a string.

The success response is HTTP 200:

- `success` is `true`.
- `result.message_id` is the message id, for example
  `"<aB3xK9mP2qR5sT8uV0wX1yZ4cD6fG7hJ9kL0@example.com>"`. Return it as the `id`.
- `result.delivered`, `result.queued` and `result.permanent_bounces` are arrays of addresses. The
  recipient is in one of them.
- The example on the REST API page has no `message_id`. The API reference lists it as a field that
  is not optional. If `message_id` is absent, return `{ id: undefined }`, as the README says.
  **Unverified:** when a response has no `message_id`.
- If `result.permanent_bounces` is an array that is not empty, the send failed. The template sends
  to one recipient, so do not compare the addresses. Use the README error rule: write one log line
  with `this.logger_.error`, then throw `UNEXPECTED_STATE` with the same message:
  `Cloudflare did not send the "<template>" email. Status: 200. Code: permanent_bounce.` This rule
  is different from the README, which counts each 2xx response as a success. The reason:
  Cloudflare returns HTTP 200 for a recipient that bounced, and the email never arrives.

The error format is the standard Cloudflare API error:

- `success` is `false`, and `result` is `null`.
- `errors` is an array of `{ "code": <number>, "message": <string> }`.
- Put the HTTP status and `errors[0].code` in the log line. The `message` is a fixed text, for
  example `email.sending.error.throttled`. **Unverified:** that the `message` never contains an
  address. Thus log only the `code`.
- Read the body with `response.text()`, then try `JSON.parse`. A gateway error can be an HTML page.
- Use `Code: unknown.` when the body is not JSON, or when `errors` is empty or absent. The `smtp`
  provider uses the same text.
- A 2xx response with `success: false` is a failure. Use the error rule with its status and
  `errors[0].code`. This rule is also different from the README. The reason: the body says that
  the send failed. **Unverified:** whether Cloudflare sends this combination.
- A network error or a timeout has no HTTP status. Thus its line has no `Status:` part, as the
  README says. The timeout of `AbortSignal.timeout` gives `Code: TimeoutError.`

The log line and the error message for each case:

```text
Cloudflare did not send the "<template>" email. Status: 401. Code: 10101.
Cloudflare did not send the "<template>" email. Status: 502. Code: unknown.
Cloudflare did not send the "<template>" email. Status: 200. Code: permanent_bounce.
Cloudflare did not send the "<template>" email. Code: TimeoutError.
```

The error codes (page "REST API"):

| HTTP | Code    | Meaning                                                 |
| ---- | ------- | ------------------------------------------------------- |
| 400  | `10001` | Invalid request format                                  |
| 400  | `10200` | The email is larger than the size limit                 |
| 400  | `10201` | Missing content length                                  |
| 400  | `10202` | Invalid email content                                   |
| 401  | `10101` | Missing or invalid API token                            |
| 401  | `10103` | Wrong token type for this endpoint                      |
| 403  | `10102` | The token has no permission to send                     |
| 403  | `10105` | The account has no Email Sending (no Workers Paid plan) |
| 403  | `10203` | Sending is disabled for this zone or account            |
| 404  | `10000` | Resource not found                                      |
| 429  | `10004` | Rate limit exceeded                                     |
| 500  | `10002` | Internal server error                                   |
| 500  | `10003` | Operation not implemented                               |
| 503  | `10100` | The authentication service is not available             |

- A suppressed recipient gives HTTP 400 when **Drop suppressed recipients** is off (section 9).
  **Unverified:** the error code of this case. The table does not list it.
- **Unverified:** that code `10105` is the exact error for an account without the Workers Paid
  plan. The page says "Account not entitled to use Email Sending".

## 8. Limits

Email Sending, page "Limits":

| Limit                     | Value                                         |
| ------------------------- | --------------------------------------------- |
| Recipients for each email | 50 (`to`, `cc` and `bcc` together)            |
| Subject                   | 998 characters                                |
| Total message size        | 5 MiB, with the attachments                   |
| Header size               | 16 KB, all custom headers together            |
| Domains for each zone     | 30 (Email Routing and Email Sending together) |

SMTP session, page "SMTP":

| Limit                  | Value       |
| ---------------------- | ----------- |
| `RCPT TO` recipients   | 50          |
| `SIZE`                 | 5 MiB       |
| `AUTH` command timeout | 30 seconds  |
| `DATA` command timeout | 300 seconds |

- Daily quota: a new account starts with a small daily quota. Cloudflare increases it with a good
  sending history. **Unverified:** the numbers. The page gives none.
- Rate limit: HTTP 429 with code `10004`. **Unverified:** the number of requests for each second.
  The page gives none.
- A higher limit: use the "Limit Increase Request Form" on the page "Limits".
- Monthly quota of the plan: section 3.
- The template sends one recipient for each email and no attachment. Thus only the daily quota can
  stop it.

## 9. Tracking and dashboard settings

- Open tracking and click tracking: the documentation describes neither. There is no setting to turn
  off. The event subscriptions have no open event and no click event. The pages "Email headers",
  "Activity log" and "Event subscriptions" describe the processing of a message. None of them
  changes a link or adds an image. **Unverified:** no page states that Email Service never changes
  links. Thus check the magic link in the first test email (section 10).
- **Drop suppressed recipients** (each sending domain, off by default). Keep it off. When it is off,
  a suppressed recipient makes the send fail, and the template logs the error. When it is on, SMTP
  can reply `250` with no Message-ID and deliver nothing.
- **Email preview** (each sending domain, on by default for a new domain). Cloudflare keeps a copy
  of each sent email for about seven days. Each user of the dashboard can read the copy in the
  Activity log. The copy contains the customer name, the address and the order. Keep it on for the
  test send. Then let the client decide. Go to **Compute** > **Email Service** > **Email Sending**,
  select the domain, open **Settings**, and toggle **Enable email preview**.
- **Suppressions**: go to **Compute** > **Email Service** > **Email Sending** > **Suppressions**.
  A hard bounce blocks the recipient for 7 days or for always. A spam complaint blocks the recipient
  for always.

## 10. Test send

Do the SMTP port check of the README from the server first.

1. On the server, read the token into a shell variable. The token then stays out of the shell
   history.

   ```bash
   read -rs CF_TOKEN
   ```

2. Write a test message. Use the address of `EMAIL_FROM` and your own inbox.

   ```bash
   cat > mail.txt <<EOF
   From: Everyday <orders@<domain>>
   To: you@example.com
   Subject: Cloudflare SMTP test

   This is a test from the store server.
   EOF
   ```

3. Send the message.

   ```bash
   curl --ssl-reqd --url "smtps://smtp.mx.cloudflare.net:465" \
     --user "api_token:$CF_TOKEN" \
     --mail-from "orders@<domain>" --mail-rcpt "you@example.com" \
     --upload-file mail.txt
   ```

4. Delete the file `mail.txt`.
5. Open the inbox. Make sure that the email arrived.
6. In the dashboard, go to **Compute** > **Email Service** > **Email Sending**. Open the Activity
   log. **Unverified:** the exact tab name in the dashboard. The page "Activity log" does not give
   the menu path.
7. Select the email. Make sure that SPF, DKIM and DMARC show "pass".
8. Make sure that the status is **Delivered**. **Sent** means that Cloudflare accepted the email
   but did not deliver it yet.

The HTTP API test, for an HTTP API provider:

```bash
curl "https://api.cloudflare.com/client/v4/accounts/<account_id>/email/sending/send" \
  --header "Authorization: Bearer $CF_TOKEN" --header "Content-Type: application/json" \
  --data '{"to":"you@example.com","from":"orders@<domain>","subject":"Test","text":"Test"}'
```

After the deploy, do the steps 13 to 17 of "Set up a provider over SMTP" in the README. Then open the
magic link email in the Activity log preview. Make sure that the link is the store URL and not a
Cloudflare URL.

The Activity log statuses: **Sent**, **Delivered**, **Delivery failed** (a bounce), **Rejected**
(a suppressed recipient), and **Failed** (a configuration or authentication problem). The dashboard
shows up to 30 days. The **Analytics** tab shows the counts for 31 days.

## 11. Traps

- **Port 465 is the only SMTP port.** There is no STARTTLS port and no second port. Some VPS hosts
  block port 465 on a new account. Then ask the host to open the port, or write the HTTP API
  provider. The HTTP API uses HTTPS on port 443.
- **The Workers Paid plan is necessary for any customer.** Without it, Cloudflare delivers only to
  the verified destination addresses. A test to your own verified address works, and the first real
  order email fails.
- **The sender domain must be onboarded.** The domain of `EMAIL_FROM` must be on the Email Sending
  page of the account that owns the token. Else SMTP replies `550 5.7.1`. A subdomain needs its own
  onboarding.
- **The domain must use Cloudflare DNS.** A domain with DNS at another host cannot use Email
  Service.
- **The user name is `api_token`.** A different user name gives `535 5.7.8`, also with a correct
  token.
- **`SMTP_SECURE` must be `true`.** The `smtp` provider code stops the backend start with port 465 and
  `SMTP_SECURE=false`.
- **A token with an expiry date stops the email.** Make the token with no expiry. If you set
  **Client IP Address Filtering**, add the IP address of the server.
- **A suppressed recipient fails the whole send.** After a hard bounce, the customer gets no magic
  link for 7 days or more. Remove the entry in **Suppressions** if the address works again.
- **Email Service is for transactional email only** (page "FAQ"). Do not use it for a newsletter.
  **Unverified:** whether Cloudflare counts the `review-request` and `wishlist-alert` emails as
  transactional.
- **The SMTP message id can be different from the Cloudflare Message-ID.** Nodemailer makes its own
  `Message-ID` header, and `info.messageId` returns it. Cloudflare says that it generates the
  `Message-ID` and that the `250` reply contains the "assigned" Message-ID. **Unverified:** whether
  Cloudflare keeps the Nodemailer header. To find an email in the Activity log, use the time and
  the subject.
- **Email Sending and SMTP are in beta** (changelog, 2026-06-08). Do step 2 again before each new
  client.

## 12. Example JSON for test mocks

A success response (from the API reference, with the example values made shorter):

```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "delivered": ["customer@example.com"],
    "message_id": "<aB3xK9mP2qR5sT8uV0wX1yZ4cD6fG7hJ9kL0@example.com>",
    "permanent_bounces": [],
    "queued": []
  }
}
```

A permanent bounce, HTTP 200 (the fields of the API reference, with an empty `delivered` array).
**Unverified:** that Cloudflare returns this exact shape for a bounce.

```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "delivered": [],
    "message_id": "<aB3xK9mP2qR5sT8uV0wX1yZ4cD6fG7hJ9kL0@example.com>",
    "permanent_bounces": ["customer@example.com"],
    "queued": []
  }
}
```

An error response, HTTP 400 (from the page "REST API"):

```json
{
  "success": false,
  "errors": [
    {
      "code": 10001,
      "message": "email.sending.error.invalid_request_schema"
    }
  ],
  "messages": [],
  "result": null
}
```

Add these cases to the test list of the README:

- The request URL contains `CLOUDFLARE_ACCOUNT_ID`, and the header is
  `Authorization: Bearer <token>`.
- With `fromName`, `from` is `{ "address": ..., "name": ... }`. Without it, `from` is a string.
- The body has `reply_to`, not `replyTo`.
- `send()` returns `result.message_id` as the `id`.
- The permanent bounce response writes one log line with `Code: permanent_bounce` and throws
  `UNEXPECTED_STATE`.
- An HTML body with HTTP 502 gives `Code: unknown.`
- `validateOptions` throws for an empty `accountId`.
