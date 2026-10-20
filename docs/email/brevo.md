# Brevo email provider

Checked on: 2026-10-20

This document gives the facts of Brevo for the email provider of this template. Read
[README.md](README.md) first. The README gives the contract and the procedures. This document gives
only the Brevo part.

| Item              | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| `<slug>`          | `brevo`                                                      |
| `<Name>`          | `Brevo` (class `BrevoNotificationProviderService`)           |
| `<PROVIDER>`      | `BREVO` (key `BREVO_API_KEY`)                                |
| Module path       | `apps/backend/src/modules/brevo`                             |
| SMTP host         | `smtp-relay.brevo.com`                                       |
| SMTP ports        | `587` (STARTTLS), `2525` (second port), `465` (implicit TLS) |
| SMTP user name    | The SMTP login of the dashboard                              |
| SMTP password     | An SMTP key. It is not the API key.                          |
| HTTP API endpoint | `POST https://api.brevo.com/v3/smtp/email`                   |

The template had a Brevo HTTP API provider before the `smtp` provider. Revision `7a1603c` has its
files. Read a file of it with `git show 7a1603c:<path>`, for example
`git show 7a1603c:apps/backend/src/modules/brevo/service.ts`. A fact with the mark "seen in the old
template code (7a1603c)" comes from that code, from its tests, or from the old `docs/deployment.md`.
It does not come from the Brevo documentation.

## 1. Sources

Official Brevo developer documentation. Each page also has a Markdown copy: add `.md` to the URL.

- Documentation index: https://developers.brevo.com/llms.txt
- SMTP relay integration (credentials, ports, fields):
  https://developers.brevo.com/docs/smtp-integration
- Node.js example of the SMTP relay (Nodemailer): https://developers.brevo.com/docs/node-smtp-relay-example
- Connect Brevo SMTP to Supabase (port names, SMTP key):
  https://developers.brevo.com/docs/supabase-smtp-integration
- Send a transactional email (API reference): https://developers.brevo.com/reference/send-transac-email
- Send a transactional email (guide): https://developers.brevo.com/docs/send-a-transactional-email
- Key concepts (base URL, error body, status codes): https://developers.brevo.com/docs/how-it-works
- API key authentication: https://developers.brevo.com/docs/api-key-authentication
- IP security and authorization: https://developers.brevo.com/docs/ip-security
- Rate limits: https://developers.brevo.com/docs/api-limits
- Rate limit headers: https://developers.brevo.com/docs/limit-headers
- Sandbox mode: https://developers.brevo.com/docs/using-sandbox-mode

Official Brevo help center:

- Send transactional emails using Brevo SMTP (SMTP login):
  https://help.brevo.com/hc/en-us/articles/7924908994450
- Which SMTP port should I use: https://help.brevo.com/hc/en-us/articles/10905415650322
- Create and manage your SMTP keys: https://help.brevo.com/hc/en-us/articles/7959631848850
- Troubleshooting, issues with Brevo SMTP (error codes):
  https://help.brevo.com/hc/en-us/articles/115000188150
- Limits of the Free plan: https://help.brevo.com/hc/en-us/articles/208580669
- Authenticate your domain (Brevo code, DKIM, DMARC):
  https://help.brevo.com/hc/en-us/articles/12163873383186
- Set up your domain in Brevo (the new domain flow):
  https://help.brevo.com/hc/en-us/articles/35337929909778
- FAQs about domain authentication: https://help.brevo.com/hc/en-us/articles/17286219877778
- Merge multiple SPF records: https://help.brevo.com/hc/en-us/articles/4414335084434
- Create a new sender: https://help.brevo.com/hc/en-us/articles/208836149
- Why the URL of a link is different (click tracking):
  https://help.brevo.com/hc/en-us/articles/209421325
- Anonymize the tracking of opens and clicks (transactional tracking settings):
  https://help.brevo.com/hc/en-us/articles/11643306229906
- Email tracking pixels and the CNIL recommendation (per-contact consent):
  https://help.brevo.com/hc/en-us/articles/37113920427922
- Manage your transactional logs: https://help.brevo.com/hc/en-us/articles/360021533839

The help center can refuse a request from a script with HTTP 403. Then read the article as JSON:
`https://help.brevo.com/api/v2/help_center/en-us/articles/<id>.json`. The field `body` has the HTML.

### Where the sources do not agree

- The page "SMTP relay integration" calls the ports `587` and `2525` "non-encrypted". The help
  article "Which SMTP port should I use" says that port `587` gives TLS. The Supabase page says
  "`587` (STARTTLS)". Thus `587` starts without TLS and then uses STARTTLS.
- The Supabase page says that the SMTP user name is "your Brevo account login email". The help
  center says that the SMTP login depends on the age of the account. This document uses the help
  center. See [5. SMTP](#5-smtp).
- The pages give three names for the log page: **Transactional > Logs**,
  **Transactional > Emails > Logs**, and **Transactional > Email logs**. This document uses
  **Transactional > Logs**, from the article "Manage your transactional logs".

## 2. Check before you change the config

Check these facts again before you change `.env` or write code. The Brevo dashboard changes often.

- Open each page of section 1. Compare the host, the ports, and the credentials with
  [5. SMTP](#5-smtp).
- Compare the fields of the API reference with [7. HTTP API: send one email](#7-http-api-send-one-email).
- Find the click tracking switch for transactional email. The path in
  [9. Tracking and dashboard settings](#9-tracking-and-dashboard-settings) is **unverified**.
- Read the daily limit of the plan of the client. See [8. Limits](#8-limits).
- If a page and this document are different, change this document and its `Checked on` date.

## 3. Account setup

This section makes the account. [4. Domain setup](#4-domain-setup) adds the domain.
[5. SMTP](#5-smtp) makes the SMTP key. Do the sections in the order of
[Set up a provider over SMTP](README.md#set-up-a-provider-over-smtp).

1. Make a Brevo account at https://onboarding.brevo.com/account/register.
2. Create a support ticket from the account. Ask Brevo to activate the transactional platform. The
   help center says: "If you've never sent transactional emails from your account, contact our
   support team by creating a ticket from your account to request activation."
3. Open the account dropdown, then **Security > Authorized IPs**.
4. Look at the state of **Block unknown IP addresses**.
5. If it is on, add each public address of the production server. Add the IPv4 address. Also add
   the IPv6 address if the server has one.

- Without the activation of step 2, each send fails with
  `450 Your SMTP account is not yet activated`. **Unverified:** a dashboard page that shows the
  activation status before the first send.
- **Unverified:** the default state of **Block unknown IP addresses**. The page "IP security"
  says: "Add your server IPs to the authorized list before enabling this feature."
- Only the account owner, or a user with the SMTP permission, can open the **SMTP & API** page.

An HTTP API provider needs an API key in place of the SMTP key:

1. Open the account dropdown, then **Settings > SMTP & API**. The direct link is
   https://app.brevo.com/settings/keys/api.
2. Open the **API keys** tab.
3. Click **Generate a new API key**.
4. Enter a name for the key.
5. Click **Generate**.
6. Copy the key into a password manager. Brevo shows it only one time. This key is
   `BREVO_API_KEY`.

## 4. Domain setup

Authenticate the domain of `EMAIL_FROM`. Brevo cannot authenticate a domain of a free email
service, for example `gmail.com`.

1. Open the account dropdown, then **Settings > Senders, Domains, IPs > Domains**.
2. Click **Add a domain**.
3. Enter the domain of `EMAIL_FROM`, without `https://` and without `www`.
4. Select the manual method if the domain already has a DMARC record. The automatic method asks to
   replace it with the DMARC record of Brevo.
5. Add the records that Brevo shows at the DNS host of the domain. Copy the names and the values
   from the Brevo page. Brevo gives no fixed values in its documentation.
6. Click **Authenticate domain** on the records page.
7. Wait until the domain status is **Authenticated**. DNS changes can take up to 48 hours.

Brevo shows its own set of records, with values for each account. Brevo documents no fixed values.
Thus this section gives the names and the types of the records, not the values. Add each record
that the Brevo records page shows. [DNS records](README.md#dns-records) of the README gives the
purpose of each record.

Brevo has two domain flows. The help center says that the new flow "is being gradually rolled out
and is only available to some accounts".

The records of the old flow (article "Authenticate your domain"):

| Name        | Type             | Purpose                                         |
| ----------- | ---------------- | ----------------------------------------------- |
| Brevo code  | TXT              | Shows that you own the domain.                  |
| DKIM record | 1 TXT or 2 CNAME | Signs each email.                               |
| DMARC       | TXT              | Tells the receiver what to do with a bad email. |

The records of the new flow (article "Set up your domain in Brevo"):

| Name                     | Type  | When                                                                        |
| ------------------------ | ----- | --------------------------------------------------------------------------- |
| DKIM 1 record            | CNAME | Always. Brevo rotates the DKIM key between DKIM 1 and DKIM 2.               |
| DKIM 2 record            | CNAME | Always.                                                                     |
| DMARC record             | TXT   | Always.                                                                     |
| Branded record           | CNAME | Optional on a shared IP. It gives SPF alignment and the return-path.        |
| Redirection Record       | CNAME | With a branded subdomain. It puts the click tracking links on your domain.  |
| Image Redirection Record | CNAME | With a branded subdomain. It puts the image links on your domain.           |
| A record                 | A     | Only with a dedicated IP.                                                   |
| NS record 1 and 2        | NS    | Only in place of the records above, when the sending domain is a subdomain. |

In the new flow, skip the branded subdomain on a shared IP. The help center marks it "Optional" for
a shared IP. The template does not need its tracking links. Then the records page shows no Branded
record, no Redirection Record, and no Image Redirection Record.

SPF:

- Neither flow asks for an SPF TXT record on the domain of `EMAIL_FROM`. Thus the Brevo dashboard
  shows the Brevo code, DKIM, and DMARC, not SPF.
- The [Final checklist](README.md#final-checklist) of the README asks for the verified status of
  the domain. For Brevo, check that the dashboard shows the domain as **Authenticated**. That
  status covers DKIM and DMARC.
- Add an SPF record for Brevo only if the Brevo records page shows one.
- The article "Merge multiple SPF records" shows this Brevo SPF value as an example:
  `v=spf1 include:spf.brevo.com mx ~all`. **Unverified:** if Brevo needs it when the domain has no
  branded subdomain.
- If you add the Brevo value, merge it into the one SPF record of the domain. See
  [DNS records](README.md#dns-records).

DMARC: use the start value of [DNS records](README.md#dns-records) in the README, or the DMARC
record that Brevo shows. Keep only one DMARC record.

Sender: when the domain is authenticated, Brevo verifies each sender on that domain automatically
(article "Create a new sender"). Without an authenticated domain, Brevo sends a 6-digit code to the
sender address. A sender with no verification cannot send transactional email.

## 5. SMTP

| Setting        | Value                                                                              |
| -------------- | ---------------------------------------------------------------------------------- |
| Host           | `smtp-relay.brevo.com`                                                             |
| Port           | `587`: STARTTLS. Brevo recommends it as the first port. `SMTP_SECURE=false`.       |
| Second port    | `2525`: for a host that blocks `587`. `SMTP_SECURE=false`. STARTTLS: see below.    |
| Third port     | `465`: implicit TLS ("SSL"). `SMTP_SECURE=true`.                                   |
| User name      | The **Login** field on the **SMTP** tab of **Settings > SMTP & API**.              |
| Password       | An SMTP key from the same tab. It is not the API key and not the account password. |
| Authentication | Required. The template sends `AUTH` when `SMTP_USER` has a value.                  |

The user name (help center, "Send transactional emails using Brevo SMTP"):

- The SMTP login is "either your Brevo account login email address or an automatically generated
  address in the format `[ID]@smtp-brevo.com`". The age of the account decides the format.
- "Changing your account's login email does not change your SMTP login."
- Always copy the **Login** field. Do not type the account email from memory.
- Do not use `smtp-relay.brevo.com` as the user name. The troubleshooting article names this
  mistake as a usual cause of the error 535.

The password:

- The page "SMTP relay integration" says: "Use an SMTP key, not an API key, for SMTP relay
  connections."
- The **Standard** key has 64 characters. The **Short** key has 15 characters. Use the short key
  only for a client that cuts long passwords. The template gives the key to Nodemailer with no
  change.
- An SMTP key "is deactivated if it hasn't sent a successful email in 90 days". This rule applies
  also with **No expiration**.

Make the SMTP key. Do the steps in this order.

1. Open the account dropdown, then **Settings > SMTP & API**. The direct link is
   https://app.brevo.com/settings/keys/smtp.
2. Open the **SMTP** tab.
3. Copy the value of the **Login** field. This is `SMTP_USER`.
4. Click **Generate a new SMTP key**.
5. Enter the verification code that Brevo sends to your device.
6. Enter a name for the key, for example `store-production`.
7. Select the variant **Standard** (64 characters).
8. Select **No expiration**, or an expiry date. Write the expiry date in the notes of the client.
9. Click **Generate**.
10. Copy the full key into a password manager. Brevo shows the full key only one time. This key is
    `SMTP_PASSWORD`.

About `2525`:

- With `SMTP_USER` set and `SMTP_SECURE=false`, the transport requires STARTTLS.
- **Unverified:** the Brevo documentation does not say that `2525` offers STARTTLS.
- On 2026-10-20, step 3 of the [SMTP port check](README.md#smtp-port-check) with `:2525` in place
  of `:587` opened a TLSv1.3 session with `Verification: OK`. This is a test, not a source.
- Do the same check on the production server before you use `2525`. If it shows no TLS session,
  do not use `2525`.

SMTP replies from Brevo (troubleshooting article):

| Reply                                             | Cause                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `535 5.7.8 Authentication failed`                 | A bad SMTP login or SMTP key, a space in the key, or the API key in place of the key. |
| `525 5.7.1 Unauthorized IP address`               | **Block unknown IP addresses** is on, and the server IP is not authorized.            |
| `450 Your SMTP account is not yet activated`      | The transactional platform of the account is not active. Create a support ticket.     |
| `450 Your sending platform is currently disabled` | Brevo suspended the platform, for example after a bot attack on a form.               |

The backend log line shows the number as `Response code: <number>`. See
[Set up a provider over SMTP](README.md#set-up-a-provider-over-smtp).

## 6. Environment values

SMTP values for `.env` on the production server:

| Key               | Brevo value                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| `SMTP_HOST`       | `smtp-relay.brevo.com`                                                 |
| `SMTP_PORT`       | `587`. The second port is `2525`. See [5. SMTP](#5-smtp).              |
| `SMTP_SECURE`     | `false` for `587` and `2525`. `true` only for `465`.                   |
| `SMTP_USER`       | The **Login** field, for example `[ID]@smtp-brevo.com`.                |
| `SMTP_PASSWORD`   | The SMTP key.                                                          |
| `EMAIL_FROM`      | An address on the authenticated domain, for example `orders@<domain>`. |
| `EMAIL_FROM_NAME` | The Medusa store name. Keep it at 70 characters or fewer.              |

```text
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<the SMTP login>
SMTP_PASSWORD=<the SMTP key>
EMAIL_FROM=orders@<domain>
EMAIL_FROM_NAME=<the store name>
```

Do not put the SMTP login in `EMAIL_FROM`. The troubleshooting article says: "It must not be used
in the From field of your emails."

The API reference gives a maximum of 70 characters for `sender.name`. The code does not check the
length, and the provider does not cut the name. Check the length when you write `.env`.
**Unverified:** what Brevo does with a longer name, over SMTP and over the API.

An HTTP API provider adds one key:

| Key             | Brevo value                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `BREVO_API_KEY` | The API key of [3. Account setup](#3-account-setup). It is not the SMTP key. |

When `BREVO_API_KEY` has a value, the Brevo provider gets the `email` channel, and the SMTP keys
have no effect. The provider reuses `EMAIL_FROM` and `EMAIL_FROM_NAME`. The old provider read
`BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME` (seen in the old template code (7a1603c),
`apps/backend/src/config/modules.ts`). Do not add these keys again.

Add `BREVO_API_KEY` with the rule of [Env keys](README.md#env-keys) of the README:

- Keep it empty in `apps/backend/.env.example`, in `apps/backend/.env.test`, and in the root
  `.env.example`. Never write `change-me`, because any value selects the provider.
- In `docker-compose.yml`, write `BREVO_API_KEY: ${BREVO_API_KEY:-}`.
- Add it to the table of `docs/deployment.md` only in a project that uses the Brevo HTTP API
  provider in production.
- Keep the SMTP keys in `.env` with their values. The env check of `docs/deployment.md` then still
  passes.

## 7. HTTP API: send one email

### Request

- Method and URL: `POST https://api.brevo.com/v3/smtp/email`. The base URL of the API is
  `https://api.brevo.com/v3/`.
- Authentication: the header `api-key: <BREVO_API_KEY>`. The API also accepts an OAuth 2.0 bearer
  token. Do not use it.
- Other headers: `content-type: application/json` and `accept: application/json`. The old provider
  sent exactly these three headers (seen in the old template code (7a1603c), `service.ts`).
- Timeout: `signal: AbortSignal.timeout(10000)`. The old provider used the same 10 seconds (seen in
  the old template code (7a1603c), `REQUEST_TIMEOUT_MS`).

The body has only the six fields of [What the template sends](README.md#what-the-template-sends):

| Template field | Brevo field   | Value                                                                   |
| -------------- | ------------- | ----------------------------------------------------------------------- |
| Recipient      | `to`          | `[{ "email": notification.to }]`. Send no `name`.                       |
| Subject        | `subject`     | The subject of `renderTemplate`.                                        |
| HTML           | `htmlContent` | The HTML of `renderTemplate`.                                           |
| Plain text     | `textContent` | The result of `htmlToText(html)`.                                       |
| Sender         | `sender`      | `{ "email": from, "name": fromName }`. Leave out `name` without a name. |
| Reply-To       | `replyTo`     | `{ "email": <contact email> }`. Leave out the field without a contact.  |

```json
{
  "sender": { "email": "orders@everyday.id", "name": "Everyday" },
  "to": [{ "email": "buyer@example.com" }],
  "subject": "Reset your password",
  "htmlContent": "<!doctype html><html><body><p>Reset your password</p></body></html>",
  "textContent": "Reset your password",
  "replyTo": { "email": "hello@everyday.id" }
}
```

- `sender`, `subject`, and `htmlContent` are required when the body has no `templateId`.
- `sender.name` and `replyTo.name` have at most 70 characters.
- Do not send `templateId`, `params`, `tags`, `headers`, `cc`, `bcc`, `attachment`, `scheduledAt`,
  or `messageVersions`.
- The old provider left out `sender.name` and `replyTo` in the same cases (seen in the old template
  code (7a1603c), `service.unit.spec.ts`).

### Response

- Success: HTTP `201` with the body `{ "messageId": "<...>" }`. Return `{ id: body.messageId }`.
- The value of `messageId` has the angle brackets, for example
  `<201798300811.5787683@relay.domain.com>`. Keep them.
- The API reference marks `messageId` as optional. A `201` without it is a successful send. Return
  `{ id: undefined }`.
- A 2xx body that is not JSON is also a successful send. Return `{ id: undefined }`. The old
  provider did the same with `parseJson` (seen in the old template code (7a1603c), `service.ts`).
- HTTP `202` is the response for a scheduled email. The provider sends no `scheduledAt`, so it does
  not get `202`.

### Errors

The error body is JSON with two fields:

```json
{ "code": "invalid_parameter", "message": "Invalid email address" }
```

- Use `code` as the error code of the log line and of the `MedusaError`. See the error rule of
  [send()](README.md#send).
- If the body is not JSON, or `code` is not a string, write `Code: unknown.` The `smtp` provider
  uses the same word for an absent code.
- Do not write `message` to the log. It can contain the recipient address.
- Some values of `code` have spaces, for example `api-key not found` or
  `DMARC policy requires domain authentication`. Write the value as it is.

The messages of the Brevo provider:

| Case                       | Message                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| Error status               | `Brevo did not send the "<template>" email. Status: <status>. Code: <code>.`  |
| Error status, no `code`    | `Brevo did not send the "<template>" email. Status: <status>. Code: unknown.` |
| Network error or timeout   | `Brevo did not send the "<template>" email. Code: <error.name>.`              |
| `validateOptions`, no key  | `The apiKey option of brevo is required.`                                     |
| `validateOptions`, no from | `The from option of brevo is required.`                                       |

- A network error has no status. Thus its message has no `Status:` part. For a timeout,
  `error.name` is `TimeoutError`.
- The `validateOptions` messages follow the messages of `validateSmtpOptions` in
  `apps/backend/src/modules/smtp/options.ts`.

The status codes (page "Key concepts"):

| Status | Meaning                                                 |
| ------ | ------------------------------------------------------- |
| `400`  | A bad request. The body gives `code`.                   |
| `401`  | The API key is wrong or absent.                         |
| `402`  | The account needs an activation or more credits.        |
| `403`  | The account has no permission for this request.         |
| `406`  | The `content-type` is not `application/json`.           |
| `429`  | The rate limit is exceeded. See [8. Limits](#8-limits). |

The usual values of `code`: `invalid_parameter`, `missing_parameter`, `out_of_range`,
`unauthorized`, `not_enough_credits`, `duplicate_request`, `account_under_validation`,
`permission_denied`.

**Unverified:** the body of a `401`. The old test used `{ "message": "Key not found" }` with no
`code` (seen in the old template code (7a1603c), `service.unit.spec.ts`). Thus the provider must
work without `code`.

## 8. Limits

The Free plan (help center, "Limits of the Free plan"):

- 300 emails each day. The limit resets each day. Unused emails do not go to the next day.
- After the daily limit, Brevo holds up to 1,000 more transactional emails in a retry queue.
  "Emails beyond this queue are not delivered."
- The Free plan has one user, the account owner.
- "Emails sent from the Free plan always include the Sent with Brevo sticker." **Unverified:** if
  this applies to a transactional email with your own HTML.

When the credits of the account are used, Brevo pauses the SMTP emails in a queue. Open
**Transactional > Real time**, then **Usage and plan**, then the **Email queue** section to see it.

API rate limits for `POST /v3/smtp/email` (page "Rate limits"):

| Tier                                   | Limit                                           |
| -------------------------------------- | ----------------------------------------------- |
| General (all plans, also Free)         | 3,600,000 requests each hour, 1,000 each second |
| Advanced (Professional and Enterprise) | 7,200,000 requests each hour, 2,000 each second |
| Extended (Enterprise)                  | 6,000 requests each second                      |

- Above the limit, the API returns HTTP `429`. The header `x-sib-ratelimit-reset` gives the wait in
  seconds. The template sends one email for each event, so it does not get near the limit.
- **Unverified:** a rate limit of the SMTP relay. No source gives one.

## 9. Tracking and dashboard settings

Brevo tracks opens and clicks of transactional email by default. The help center says: "By
default, we track the opens and clicks for each recipient." Brevo tracks a click with "link
redirection". Thus the magic link opens a Brevo host first. See [Tracking](README.md#tracking).

Turn off click tracking for all transactional email:

1. Sign in to the Brevo dashboard.
2. Open the account dropdown, then **Settings > Automations > Transactional emails > Tracking**.
3. If this page does not exist, open **Transactional**, then **Settings**, then **Tracking**.
4. Turn off click tracking.
5. Turn off open tracking.
6. Click **Save**.
7. Sign in to the store with a magic link.
8. Make sure that the link in the email opens the store URL.

**Unverified:** the path and the name of the switch.

- The help center gives the path of step 2 only for the option **Anonymous email tracking**. It does
  not name a click tracking switch on that page.
- The path of step 3 and step 4 is seen in the old template code (7a1603c), `docs/deployment.md`,
  section "Brevo click tracking".
- If you find no switch, ask Brevo support to turn off click tracking for transactional email. Do
  not sell before the magic link opens the store URL.

Brevo has no switch for one message:

- The API reference has no field that turns off tracking for one email.
- The field `contactPixelTrackingConsent: false` on a recipient only anonymises the open and click
  events. It applies only when the account has per-contact tracking consent. The provider does not
  send it.
- The option **Anonymous email tracking** also only hides the recipient in the events. It does not
  stop the link redirection.
- The old provider had the same rule (seen in the old template code (7a1603c), `docs/deployment.md`:
  "Brevo has no switch for one message").

A branded subdomain (new domain flow) puts the click tracking links on your own domain. It does not
stop the redirection.

Other dashboard settings:

- **Security > Authorized IPs**: see the steps 3 to 5 of [3. Account setup](#3-account-setup).
- Transactional webhooks: the template does not use them.
- The retention of the logs: the default keeps the logs with no limit.

## 10. Test send

Over SMTP:

1. Do the steps 13 and 14 of [Set up a provider over SMTP](README.md#set-up-a-provider-over-smtp).
2. Open **Transactional > Logs** in the Brevo dashboard.
3. Filter the logs by the recipient address.
4. Click the eye icon next to the log entry.
5. Make sure that the history shows **Sent** and then **Delivered**.

The log details also show the email preview and the links that the recipient clicked. Each email
that goes over SMTP or the API has a log entry.

The events of the log: **Sent**, **Delivered**, **Opened**, **Clicked**, **Soft Bounce**,
**Hard Bounce**, **Invalid Email**, **Deferred**, **Spam**, **Unsubscribed**, **Blocked**,
**Error**.

Over the HTTP API, check the API key first. The response is HTTP `200` with the account details:

```bash
curl https://api.brevo.com/v3/account -H "api-key: $BREVO_API_KEY"
```

Then send one email to your own address. Replace the values in angle brackets:

```bash
curl --request POST https://api.brevo.com/v3/smtp/email \
  --header "api-key: $BREVO_API_KEY" \
  --header "content-type: application/json" \
  --header "accept: application/json" \
  --data '{"sender":{"email":"<EMAIL_FROM>","name":"<EMAIL_FROM_NAME>"},"to":[{"email":"<your address>"}],"subject":"Brevo test","htmlContent":"<p>Brevo test</p>","textContent":"Brevo test"}'
```

The response is HTTP `201` with `messageId`. Find the email in **Transactional > Logs**.

Sandbox mode: add `"headers": {"X-Sib-Sandbox": "drop"}` to the body of the `curl` command. Brevo
then checks the request and returns `201` with a `messageId`. It sends no email and writes no log
entry. Use it only in a manual `curl` command. The provider sends no custom header.

## 11. Traps

- The SMTP key is not the API key. The SMTP relay accepts only an SMTP key. The API accepts only an
  API key. The API key in the examples of the documentation starts with `xkeysib-`.
  **Unverified:** the prefix of an SMTP key.
- The SMTP login is not always the account email. An account can have a login of the format
  `[ID]@smtp-brevo.com`. Copy the **Login** field. A wrong login gives the error 535.
- The SMTP login is not a sender address. Do not put it in `EMAIL_FROM`.
- Click tracking changes the magic link. Turn it off before the first sale. See
  [9. Tracking and dashboard settings](#9-tracking-and-dashboard-settings).
- A new account can need a support ticket to activate the transactional platform. Without it, each
  send fails with the error 450.
- **Block unknown IP addresses** blocks the production server until you authorize its IP. The SMTP
  relay replies with the error 525. The API rejects the request.
- Brevo deactivates an SMTP key after 90 days with no successful email. A shop with no order for
  90 days loses its email. Reactivate the key on the **SMTP** tab.
- An SMTP key with an expiry date stops on that date. Brevo sends a reminder 3 days before.
- Brevo shows an SMTP key and an API key only one time. If you lose a key, make a new one.
- The Free plan sends 300 emails each day. On a busy day, the sign-in emails stop after the retry
  queue is full.
- Brevo blocks a recipient that marked an email as spam, that unsubscribed, or that gave a hard
  bounce. The send succeeds, and the log shows **Blocked**. The email does not arrive.
- The page "SMTP relay integration" calls `587` "non-encrypted". It means no implicit TLS. Keep
  `SMTP_SECURE=false` for `587`.
- The Supabase page of Brevo says that the SMTP user is the account login email. This is not true
  for all accounts. Use the **Login** field.
- The old provider is not a model for all rules. Its differences are in
  [Tests](README.md#tests) of the README. For example, it wrote the raw error body to the log (seen
  in the old template code (7a1603c), `describeErrorBody` in `service.ts`).

## 12. Example JSON for test mocks

Give each mock response `ok`, `status`, and `text()`, as in [Tests](README.md#tests) of the README.

Success, HTTP `201` (seen in the old template code (7a1603c), `service.unit.spec.ts`):

```json
{ "messageId": "<abc@smtp-relay.mailin.fr>" }
```

Success, HTTP `201`, from the guide "Send a transactional email":

```json
{ "messageId": "<201798300811.5787683@relay.domain.com>" }
```

Error, HTTP `400` (seen in the old template code (7a1603c), `service.unit.spec.ts`). The log line
must show `Status: 400. Code: invalid_parameter.`:

```json
{ "code": "invalid_parameter", "message": "sender is not valid" }
```

Error, HTTP `401` with no `code` (seen in the old template code (7a1603c), `service.unit.spec.ts`).
The log line must show `Status: 401. Code: unknown.`:

```json
{ "message": "Key not found" }
```

Error, HTTP `502` with a body that is not JSON (seen in the old template code (7a1603c),
`service.unit.spec.ts`). The log line must show `Status: 502. Code: unknown.`:

```text
<html>Bad Gateway</html>
```

The mock helper of the old test:

```ts
const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }) as any
```
