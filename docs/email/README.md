# Email providers

This document gives the contract of the email provider in this template. It also gives the
procedure to set up a provider for a client project.

The template sends every email over SMTP with the `smtp` notification provider
(`apps/backend/src/modules/smtp/`). To change the provider, a client changes only the env values.
The code does not change. In development, the backend sends every email to Mailpit
(`docker-compose.local.yml`).

A client writes an HTTP API provider only when its server cannot open an SMTP port of the
provider. See [Write an HTTP API provider](#write-an-http-api-provider).

Each provider has its own document with the facts of the provider. See
[Provider docs](#provider-docs). This document does not describe a provider.

The terms in this document:

- `<slug>`: the name of the provider in lowercase, for example `resend` or `amazon-ses`. An HTTP
  API provider uses it as its module folder, as its `static identifier`, and as its `id` in
  `notificationModule(env)`.
- `<Name>`: the slug in PascalCase, for example `Resend` or `AmazonSes`. The class of an HTTP API
  provider is `<Name>NotificationProviderService`.
- `<PROVIDER>`: the prefix of the env keys of an HTTP API provider, in upper case, for example
  `RESEND` or `AWS_SES`.

Where a provider doc gives a rule that is different from this document, the provider doc applies.
The provider doc gives the reason for each difference. A provider doc cannot change these rules:

- No log line and no error message contains a secret or an email address.
- The provider sends only the six fields of [What the template sends](#what-the-template-sends).
- The templates in `apps/backend/src/email/templates/` do not change.
- Development sends every email to Mailpit.

## What the template sends

Each email has six fields. `renderEmail(template, data)` in `apps/backend/src/email/render.ts`
makes four of them: the subject, the HTML, the plain text, and the Reply-To. The provider adds the
recipient and the sender. Thus a provider only sends.

| Field      | Source                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Recipient  | `notification.to`. Each email has one recipient.                                                         |
| Subject    | `renderEmail` calls `renderTemplate(template, data)` in `apps/backend/src/email/templates/index.ts`.     |
| HTML       | `renderTemplate(template, data)`. The same call returns the subject and the HTML.                        |
| Plain text | `renderEmail` calls `htmlToText(html)` in `apps/backend/src/email/text.ts`. A link becomes `label: URL`. |
| Sender     | `EMAIL_FROM` and `EMAIL_FROM_NAME`. Without `EMAIL_FROM_NAME`, the sender is the address only.           |
| Reply-To   | The store contact email, if it is set. See [Sender address and Reply-To](#sender-address-and-reply-to).  |

`send()` in `apps/backend/src/modules/smtp/service.ts` does these steps in this order:

1. It checks the recipient. Without a recipient, it throws `INVALID_DATA` and sends nothing.
2. It calls `renderEmail`. An unknown template name throws, so a bad template sends nothing.
3. It sends the email through one Nodemailer transport.
4. It returns `{ id: <message id> }`.

Other facts:

- The email has no attachment, no tag, no custom header, and no tracking setting.
- The transport has no pool. Each send opens its own connection and closes it.
- The connection, greeting, and socket timeouts are 10 seconds each (`SMTP_TIMEOUT_MS` in
  `apps/backend/src/modules/smtp/options.ts`).
- A failed send writes one error line and throws `UNEXPECTED_STATE`. The line names the template,
  the Nodemailer error code, and the SMTP response code. It never contains the recipient, the SMTP
  user, or the SMTP password.
- The `templates` object in `apps/backend/src/email/templates/index.ts` lists the template names.

## Environment keys

`notificationModule(env)` in `apps/backend/src/config/modules.ts` reads the seven keys. It is the
only place that reads them. Medusa permits only one provider for each channel, so the function
selects one provider for the `email` channel:

- `SMTP_HOST` is empty: the `email-log` provider (`apps/backend/src/modules/email-log/`) gets the
  `email` channel. It sends nothing. `apps/backend/.env.test` uses this rule.
- `SMTP_HOST` has a value: the `smtp` provider gets the `email` channel. `EMAIL_FROM` is then
  required, and the start stops without it.

The local provider (`@medusajs/medusa/notification-local`) keeps the `feed` channel in the two
cases.

The `email-log` provider calls `renderEmail` for each email. Thus a bad template or incomplete data
fails as it fails with SMTP. The provider writes these lines to the log:

- One line with the template name and the subject. The line never contains the recipient.
- The plain text of the email, only when `NODE_ENV` is not `production`. The `magic-link` and
  `password-reset` texts contain a sign-in link, and a production log must not contain it.

| Key               | Meaning                                                                                            | Mailpit value (`apps/backend/.env.example`) | Production value (`.env`)                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `SMTP_HOST`       | The host of the SMTP server.                                                                       | `localhost`                                 | The SMTP host of section 5 of the provider doc. Not `localhost`.                        |
| `SMTP_PORT`       | The SMTP port. An empty value or a value out of the range 1 to 65535 stops the start.              | `1025`                                      | The port of section 5 of the provider doc, usually `587` or `465`.                      |
| `SMTP_SECURE`     | `true` for implicit TLS. `false` for STARTTLS, or for no TLS. Only the text `true` counts as true. | `false`                                     | `true` for an implicit TLS port, for example `465`. `false` for a STARTTLS port.        |
| `SMTP_USER`       | The SMTP user name. An empty value means no authentication.                                        | empty                                       | The user name of section 5 of the provider doc.                                         |
| `SMTP_PASSWORD`   | The SMTP password. Set both `SMTP_USER` and `SMTP_PASSWORD`, or neither.                           | empty                                       | The SMTP password of section 5 of the provider doc. It is not always the main API key.  |
| `EMAIL_FROM`      | The sender address. Required when `SMTP_HOST` has a value.                                         | `no-reply@everyday.com`                     | An address on the domain that the provider verified.                                    |
| `EMAIL_FROM_NAME` | The sender name. Optional.                                                                         | `Everyday`                                  | The Medusa store name. See [Sender address and Reply-To](#sender-address-and-reply-to). |

`apps/backend/src/modules/smtp/options.ts` applies these rules:

- `SMTP_PORT=465` with `SMTP_SECURE=false` stops the start. Port 465 uses implicit TLS.
- Set `SMTP_SECURE=true` for each other implicit TLS port, for example `2465`. The code does not
  check these ports. With `false`, each send waits for the 10-second timeout and fails.
- When `SMTP_USER` has a value and `SMTP_SECURE` is `false`, the transport requires STARTTLS. The
  password never goes over a plain connection.
- Mailpit has no user name, so the transport uses no TLS for it.

`STORE_OWNER_EMAIL` is not a provider key. It gives the recipient of the owner emails when the
store contact email is empty.

Add each new key to these five places:

1. `apps/backend/.env.example`: the development value. Keep a secret empty.
2. `apps/backend/.env.test`: the value for the tests. This file loads before `.env`.
3. `.env.example` at the repository root: the production value. Write `change-me` for a secret.
4. The table in the section "Environment file" of `docs/deployment.md`.
5. The `x-medusa-environment` anchor of `docker-compose.yml`, as `<KEY>: ${<KEY>}`. The services
   `medusa-server` and `medusa-worker` both read the anchor.

The keys of an HTTP API provider have a different rule. See [Env keys](#env-keys).

## DNS records

The provider authenticates the domain of `EMAIL_FROM` with DNS records. Section 4 of the provider
doc gives the exact records: the number, the type, the host, and the value of each record. This
section gives only the purpose of each record and the rules for all providers. These records are
not the A records of the section "DNS records" in `docs/deployment.md`.

| Record | What it does                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------- |
| SPF    | It names the servers that can send email for a domain. The receiver checks the Return-Path domain. |
| DKIM   | It publishes a public key. The receiver uses it to verify the signature that the provider adds.    |
| DMARC  | It tells the receiver what to do with an email that has no aligned SPF pass and no DKIM pass.      |

The records are different for each provider. Do not expect a fixed set of records. For example:

- SendGrid gives four records. Its SPF record is a CNAME record on `em<number>.<domain>`.
- Resend puts the SPF records on `send.<email domain>`.
- Amazon SES uses three DKIM CNAME records. The custom MAIL FROM domain adds an MX record and a TXT
  record on `bounce.<domain>`.
- Cloudflare adds the records itself and locks the records on `cf-bounce.<domain>`.
- Brevo shows the values only in its dashboard.

Rules for all providers:

- A name must have only one SPF record. If the name already has an SPF record, add the value of
  the provider to that record. Do not add a second SPF record on the same name.
- An SPF record on a subdomain of the provider does not change the SPF record of the domain.
- A domain has only one DMARC record, on `_dmarc.<domain>`. If the domain already has one, keep it.

If the domain has no DMARC record, use this start value. Replace `<address>` with an address that
reads the reports.

```text
v=DMARC1; p=none; rua=mailto:<address>
```

`p=none` only asks for reports. It does not block an email.

## Sender address and Reply-To

`renderEmail` sets the Reply-To from `data.store.contact_email`. It removes the spaces at the start
and at the end. If the value is empty, the email has no Reply-To, and a reply goes to `EMAIL_FROM`.

`data.store` comes from `readStoreForEmail` in `apps/backend/src/lib/store-for-email.ts`. The
contact email is the store contact email in Medusa Admin (**Settings → Store**). Every
email uses it, also the owner emails and `password-reset`.

A no-reply `EMAIL_FROM` works only when the store contact email is set. Without the contact email,
a reply from a customer goes to the no-reply address, and nobody reads it.

`EMAIL_FROM_NAME` and the Medusa store name (**Settings → Store**) must be the same text. The inbox
shows `EMAIL_FROM_NAME`. The email wordmark and the footer show the store name.

## Tracking

Turn off click tracking and open tracking in the provider dashboard before the first send. The
template sends no tracking setting, so the dashboard setting applies to each email.

- Click tracking changes each link to a redirect link on a host of the provider. The magic link
  then does not open the store URL directly.
- Open tracking adds a hidden image to each email. The template does not use the result.

Section 9 of the provider doc tells how to turn off each kind of tracking. It also tells if the
provider has no tracking.

## SMTP port check

Do this check on the production server, not on your computer. A VPS host can block a port that
your computer can open.

1. Open a connection to the SMTP port. The output must show a successful connection.

```bash
nc -vz <SMTP_HOST> <SMTP_PORT>
```

2. For an implicit TLS port (`SMTP_SECURE=true`), start a TLS session on the port.

```bash
openssl s_client -connect <SMTP_HOST>:465
```

3. For a STARTTLS port (`SMTP_SECURE=false`), start a STARTTLS session on the port.

```bash
openssl s_client -starttls smtp -connect <SMTP_HOST>:587
```

4. Make sure that the output of step 2 or step 3 shows `Verify return code: 0 (ok)`.
5. Press `Ctrl+C` to close the connection.

Use the port of `SMTP_PORT` in step 2 or step 3, if it is not `465` or `587`.

Some VPS hosts block the ports 25, 465, and 587 on new accounts. If a command waits until a
timeout, or if the connection fails, do one of these steps:

- Use the second port of the provider. [Provider docs](#provider-docs) and section 5 of the
  provider doc give it. Then do the check again. Some providers have no second port.
- Ask the host to open the port.
- Write an HTTP API provider. See [Write an HTTP API provider](#write-an-http-api-provider).

## Set up a provider over SMTP

Do the steps in this order. Each step is one action.

1. Open the provider doc in `docs/email/`. See [Provider docs](#provider-docs).
2. Open each page in the section "1. Sources" of the provider doc. Compare its facts with the doc.
3. If a page and the doc are different, change the doc and its `Checked on` date. The page is
   correct.
4. Make an account at the provider. Use the section "3. Account setup" of the provider doc.
5. Add the DNS records of the section "4. Domain setup" to the domain of `EMAIL_FROM`.
6. Wait until the provider dashboard shows that the domain is verified.
7. Make the SMTP password of the section "5. SMTP" of the provider doc.
8. Turn off click tracking and open tracking. Use the section "9. Tracking and dashboard
   settings".
9. Do the [SMTP port check](#smtp-port-check) on the production server.
10. Put the values of the section "6. Environment values" in `.env` on the server.
11. Do the check of the section "Check the environment file" in `docs/deployment.md`.
12. Do the deploy of `docs/deployment.md`. The services read `.env` only when they start.
13. Sign in to the store with a magic link.
14. Make sure that the link in the sign-in email opens `https://<domain>`.
15. Place one order in the store.
16. Make sure that the `order-placed` email and the `new-order-owner` email arrive.
17. Find the emails in the delivery log of the provider. Use the section "10. Test send".

If a send fails, the backend log has one line of this format. The part `Response code` is there
only when the server sent a reply code.

```text
SMTP did not send the "<template>" email. Code: <code>. Response code: <number>.
```

- `Code: EAUTH`: the server refused `SMTP_USER` or `SMTP_PASSWORD`. Compare the two values with
  section 5 of the provider doc.
- `Code: ETIMEDOUT`: the server did not answer in 10 seconds. Do the
  [SMTP port check](#smtp-port-check). Then check `SMTP_SECURE`.
- `Code: ECONNECTION` or `Code: ESOCKET`: the connection failed or closed. Do the
  [SMTP port check](#smtp-port-check).
- `Code: unknown.`: Nodemailer gave no error code. Use the response code, if the line has one.
- A response code from 400 to 499: the server refused the email for a temporary cause or for a
  rule of the provider. Some examples:
  - `403`: SendGrid. `EMAIL_FROM` has no verified Sender Identity. **Unverified** over SMTP. See
    [sendgrid.md](sendgrid.md) section 11.
  - `450`: Brevo. The transactional platform of the account is not active.
  - `451`: Cloudflare. The server deferred the email.
  - `454`: Amazon SES. A sending quota is used, or a temporary authentication failure occurred.
- A response code from 500 to 599: the server refused the email.

The `smtp` provider does not try a failed send again. The sections "5. SMTP" and "11. Traps" of
the provider doc give the cause of each reply code that the provider documents.

A failed send of the sign-in email makes the magic link request return an HTTP 500 error. The
magic link route then writes a second error line:

```text
The magic link email failed. Cause: Failed to send notification with id <notification id>:
SMTP did not send the "magic-link" email. Code: <code>. Response code: <number>.
```

- The Medusa notification module adds the first part of the cause, with the notification id.
- The rest of the cause is the message of the provider. It has no address and no secret.
- The route also replaces the email address with `<email>` and the sign-in token with `<token>`.

A failed send of another email writes the error line of the provider, and the order continues.

## Write an HTTP API provider

Write an HTTP API provider only when the server cannot open any SMTP port of the provider, and the
host does not open one. The `smtp` provider stays the default of the template.

### Module

- Put the provider in `apps/backend/src/modules/<slug>/`:
  - `index.ts`:
    `export default ModuleProvider(Modules.NOTIFICATION, { services: [<Name>NotificationProviderService] })`.
  - `service.ts`: the class `<Name>NotificationProviderService`. It extends
    `AbstractNotificationProviderService` and has `static identifier = "<slug>"`. Export it as the
    default export.
  - `__tests__/service.unit.spec.ts`: the unit tests.
- Import `AbstractNotificationProviderService`, `MedusaError`, `ModuleProvider`, and `Modules` from
  `@medusajs/framework/utils`. Import `Logger`, `ProviderSendNotificationDTO`, and
  `ProviderSendNotificationResultsDTO` from `@medusajs/framework/types`.
- The reference provider is `apps/backend/src/modules/smtp/`. Copy its structure.
- The constructor takes `({ logger }, options)`. Medusa gives the `options` object of the
  registration. The service reads only its options, never `process.env`.
- Add a static `validateOptions(options)`. Make it throw `INVALID_DATA` when the API key or the
  sender address is empty. The message names the option, never its value. Use the pattern of the
  `smtp` module (`apps/backend/src/modules/smtp/options.ts`):

```text
The <option> option of <slug> is required.
```

- The `resend` provider, for example, throws `The apiKey option of resend is required.` and
  `The from option of resend is required.`

### send()

`send()` keeps the order of the `smtp` provider:

1. Check `notification.to`. If it is empty, throw `INVALID_DATA` with the message
   `` `The "${template}" email has no recipient.` ``. Send no request.
2. Call `renderEmail(template, notification.data)` from `../../email/render`. It returns
   `{ subject, html, text, replyTo }`. It throws for an unknown template, so no request goes out.
   `replyTo` is not there when the store contact email is empty. See
   [Sender address and Reply-To](#sender-address-and-reply-to).
3. Make the sender from the `from` and `fromName` options.
4. Send one request with the global `fetch`. Give it `signal: AbortSignal.timeout(10000)`.
5. Return `{ id: <message id> }`. The section "7. HTTP API: send one email" of the provider doc
   gives the response field.

Do not render the email in the provider. `renderEmail` is the only place that makes the subject,
the HTML, the text, and the Reply-To.

The request body has only the six fields of [What the template sends](#what-the-template-sends),
in the format of section 7 of the provider doc.

A 2xx response is a successful send. If the response has no message id, `send()` returns
`{ id: undefined }`. The `id` of `ProviderSendNotificationResultsDTO` is optional. A 2xx body
that is not JSON also gives `{ id: undefined }`.

Amazon SES is the exception. Its doc uses `@aws-sdk/client-sesv2` in place of `fetch`, because
the SES API needs AWS Signature Version 4.

Error rule:

- A response status that is not 2xx fails the send. A network error and a timeout also fail the
  send.
- Write one line with `this.logger_.error`. Then throw a `MedusaError` of the type
  `UNEXPECTED_STATE` with the same message.
- The message names the template, the HTTP status, and the error code of the provider. Section 7
  of the provider doc gives the field of the error code.
- The message never contains the recipient, the API key, or the raw response body. The body can
  contain the recipient.

Read the body of an error response with `response.text()`. Then call `JSON.parse` on the text in
a `try` block. A gateway error page is often HTML, not JSON.

The message for each case:

| Case                                       | Message                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| An error status with an error code         | `<Name> did not send the "<template>" email. Status: <status>. Code: <code>.`  |
| An error status, a body that is not JSON   | `<Name> did not send the "<template>" email. Status: <status>. Code: unknown.` |
| An error status, a body with no error code | `<Name> did not send the "<template>" email. Status: <status>. Code: unknown.` |
| A network error or a timeout               | `<Name> did not send the "<template>" email. Code: <error.name>.`              |

- A network error has no HTTP status. Thus its message has no `Status:` part.
- `<error.name>` is the `name` of the thrown error. For example: `Code: TimeoutError.` for the
  timeout of `AbortSignal.timeout`, or `Code: AbortError.` for an aborted request. If the error
  has no `name`, write `Code: unknown.`
- The `smtp` provider also writes `Code: unknown.` when it has no error code.

Examples:

```text
Resend did not send the "order-placed" email. Status: 403. Code: validation_error.
```

The `smtp` provider writes lines of the same form. They have no `Status:` part, because SMTP has
no HTTP status:

```text
SMTP did not send the "magic-link" email. Code: EAUTH. Response code: 535.
SMTP did not send the "magic-link" email. Code: ETIMEDOUT.
```

### Registration

Register the provider in `notificationModule(env)` in `apps/backend/src/config/modules.ts`:

- When `<PROVIDER>_API_KEY` has a value, the HTTP API provider gets the `email` channel. The SMTP
  keys then have no effect.
- When `<PROVIDER>_API_KEY` is empty, the `smtp` rule of [Environment keys](#environment-keys)
  applies. Development then keeps Mailpit, and the tests keep the `email-log` provider.
- The provider reuses `EMAIL_FROM` and `EMAIL_FROM_NAME`. Do not add sender keys for the provider.

Put the new condition at the start of the function. The rest of the function does not change:

```ts
function notificationModule(env: Env): ModuleEntry {
  const apiKey = env.<PROVIDER>_API_KEY
  if (apiKey) {
    if (!env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is required when <PROVIDER>_API_KEY has a value.")
    }
    return {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: { name: LOCAL_NOTIFICATION_NAME, channels: ["feed"] },
          },
          {
            resolve: "./src/modules/<slug>",
            id: "<slug>",
            options: {
              channels: ["email"],
              apiKey,
              from: env.EMAIL_FROM,
              fromName: env.EMAIL_FROM_NAME || undefined,
            },
          },
        ],
      },
    }
  }

  const host = env.SMTP_HOST
  // The SMTP rule continues here with no change.
}
```

A provider doc can name a different main secret key, for example the AWS keys of Amazon SES. Use
that key in the condition in place of `<PROVIDER>_API_KEY`.

### Env keys

The section "6. Environment values" of the provider doc names the keys of the provider. One of
them selects the provider: `<PROVIDER>_API_KEY`, or the main secret key of the provider doc. For
example: `RESEND_API_KEY`, `SENDGRID_API_KEY`, `BREVO_API_KEY`, `CLOUDFLARE_API_TOKEN`, or
`AWS_SES_ACCESS_KEY_ID`.

A value in this key selects the provider, also the value `change-me`. Thus the keys of an HTTP
API provider do not follow the `change-me` rule of [Environment keys](#environment-keys). Add each
key of the provider in this way:

1. `apps/backend/.env.example`: an empty value. Add a comment that names the dashboard page of the
   key.
2. `apps/backend/.env.test`: an empty value. The tests then keep the `email-log` provider, also
   when `apps/backend/.env` has a key.
3. `.env.example` at the repository root: an empty value, never `change-me`. A key that is not a
   secret can have its fixed value, for example `AWS_SES_REGION=ap-southeast-1`.
4. The `x-medusa-environment` anchor of `docker-compose.yml`, as `<KEY>: ${<KEY>:-}`. The `:-`
   gives an empty value when `.env` has no line for the key.
5. The table in the section "Environment file" of `docs/deployment.md`: add the keys only in a
   project that uses the HTTP API provider in production. The env check of that document requires
   a value for each key of the table.

Keep the SMTP keys in `.env` with their values, also when the HTTP API provider sends the email.
The SMTP keys then have no effect. The env check of `docs/deployment.md` still passes, because it
requires a value for each `SMTP_` key and a `SMTP_HOST` that is not `localhost`. To go back to
SMTP, make the key that selects the provider empty, and do the deploy again.

Do not put the API key in `apps/backend/.env`. Development sends every email to Mailpit.

### Tests

- Put the tests in `apps/backend/src/modules/<slug>/__tests__/service.unit.spec.ts`. Jest finds
  the files that match `**/src/**/__tests__/**/*.unit.spec.[jt]s` (`apps/backend/jest.config.js`).
- Create the service directly: `new <Name>NotificationProviderService({ logger } as any, options)`.
- Replace `global.fetch` with a `jest.fn()` in `beforeEach`. Give each call a response object with
  `ok`, `status`, and `text()`.
- If the provider reads a response header, also give `headers` to each response object, for
  example `headers: new Headers({ "x-message-id": "abc" })`. SendGrid reads the message id from
  the header `X-Message-Id`.
- Use the JSON of the section "12. Example JSON for test mocks" of the provider doc.
- Test at least these cases:
  - The identifier is `<slug>`.
  - The request has the URL, the authentication, and the six fields of section 7 of the provider
    doc. The plain text part has the links.
  - The request has the Reply-To when the store contact email is set, and no Reply-To when it is
    empty.
  - `send()` returns the message id of the response.
  - `send()` makes no request without a recipient, and no request for an unknown template.
  - An error status writes one log line and throws `UNEXPECTED_STATE`. The line has the status
    and the error code.
  - An error status with a body that is not JSON gives `Code: unknown.`
  - A network error writes one log line and throws `UNEXPECTED_STATE`. The line has no `Status:`
    part.
  - A 2xx response without a message id returns `{ id: undefined }`.
  - No log line contains the recipient or the API key.
  - `validateOptions` throws for an empty API key and for an empty sender address.
- Add cases to the `describe` "buildModules: notification module" in
  `apps/backend/src/config/__tests__/modules.unit.spec.ts`:
  - `<PROVIDER>_API_KEY` has a value: the provider `<slug>` has the `email` channel.
  - `<PROVIDER>_API_KEY` is empty: the existing SMTP cases do not change.
  - `<PROVIDER>_API_KEY` has a value and `EMAIL_FROM` is empty: the function throws.

### Procedure

Do the steps in this order. Each step is one action.

1. Open the provider doc. Read the sections 7, 8, 11, and 12.
2. Do the steps 2 and 3 of [Set up a provider over SMTP](#set-up-a-provider-over-smtp).
3. Write the unit tests in `apps/backend/src/modules/<slug>/__tests__/service.unit.spec.ts`.
4. Run the unit tests and see them fail:
   `pnpm --filter @store/backend test:unit src/modules/<slug>`.
5. Write `service.ts`.
6. Write `index.ts`.
7. Run the unit tests and see them pass.
8. Register the provider in `notificationModule(env)`.
9. Add the cases to `apps/backend/src/config/__tests__/modules.unit.spec.ts`.
10. Run `pnpm --filter @store/backend test:unit src/config`.
11. Add the env keys. Use the rule of [Env keys](#env-keys).
12. Run `pnpm lint`.
13. Run `pnpm format:check`.
14. Do the steps 4 to 6 and step 8 of [Set up a provider over SMTP](#set-up-a-provider-over-smtp).
15. Make the API key. Use the section of the provider doc that makes the key.
16. Put the keys of the section "6. Environment values" of the provider doc in `.env` on the server.
17. Do the steps 11 to 17 of [Set up a provider over SMTP](#set-up-a-provider-over-smtp).

## Final checklist

Do each check before you report success.

- [ ] The provider dashboard shows the domain as verified. Section 4 of the provider doc names the
      status.
- [ ] The domain has a DMARC record on `_dmarc.<domain>`.
- [ ] Click tracking and open tracking are off.
- [ ] The [SMTP port check](#smtp-port-check) passes on the production server. An HTTP API
      provider skips this check.
- [ ] `EMAIL_FROM` is an address on the verified domain.
- [ ] `EMAIL_FROM_NAME` and the Medusa store name are the same text.
- [ ] The magic link in the sign-in email opens the store URL `https://<domain>`.
- [ ] The Reply-To of an order email is the store contact email. Open the source of the email in
      the mail client to see it.
- [ ] The plain text part of the email has the links.
- [ ] The `order-placed` email and the `new-order-owner` email arrived.
- [ ] No secret is in `.env.example`, `apps/backend/.env.example`, or `apps/backend/.env.test`.
- [ ] No log line of the provider contains a secret or an email address.
- [ ] An HTTP API provider: the unit tests, `pnpm lint`, and `pnpm format:check` pass.
- [ ] An HTTP API provider: each env key follows the rule of [Env keys](#env-keys). The key that
      selects the provider is empty in `.env.example` and in `apps/backend/.env.test`.
- [ ] An HTTP API provider: with an empty `<PROVIDER>_API_KEY`, development sends to Mailpit.

## Provider docs

Each doc starts with the line `Checked on: <YYYY-MM-DD>`. Then it has these 12 sections, in this
order:

1. Sources
2. Check before you change the config
3. Account setup
4. Domain setup
5. SMTP
6. Environment values
7. HTTP API: send one email
8. Limits
9. Tracking and dashboard settings
10. Test send
11. Traps
12. Example JSON for test mocks

A fact that the official documentation does not state clearly has the mark **unverified**.

| Doc                            | Provider                 | SMTP host                           | Notes                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [amazon-ses.md](amazon-ses.md) | Amazon SES               | `email-smtp.<region>.amazonaws.com` | Ports `587` and `2587` (STARTTLS), `465` and `2465` (implicit TLS). Asia Pacific (Jakarta) `ap-southeast-3` has no SMTP endpoint, so the doc uses `ap-southeast-1`. SMTP credentials, not AWS keys. A new account is in the sandbox. |
| [brevo.md](brevo.md)           | Brevo                    | `smtp-relay.brevo.com`              | Port `587` (STARTTLS), second port `2525`, port `465` (implicit TLS). STARTTLS on `2525` is **unverified** in the docs. A live `openssl` test passed. The password is an SMTP key.                                                   |
| [cloudflare.md](cloudflare.md) | Cloudflare Email Service | `smtp.mx.cloudflare.net`            | Port `465` only (implicit TLS). No second port. Needs the Workers Paid plan.                                                                                                                                                         |
| [resend.md](resend.md)         | Resend                   | `smtp.resend.com`                   | Ports `587` and `2587` (STARTTLS), `465` and `2465` (implicit TLS).                                                                                                                                                                  |
| [sendgrid.md](sendgrid.md)     | SendGrid                 | `smtp.sendgrid.net`                 | Port `587`, second port `2525`, port `465` (implicit TLS). STARTTLS on `587` and `2525` is **unverified**. The user name is `apikey`.                                                                                                |

- Set `SMTP_SECURE=true` for port `2465` (Amazon SES and Resend). Port `2465` also uses implicit
  TLS, but the code checks only port `465`. With `false`, each send waits for the timeout and
  fails.
- Do step 3 of the [SMTP port check](#smtp-port-check) before you use a port with **unverified**
  STARTTLS. If the output shows no TLS session, do not use the port.
