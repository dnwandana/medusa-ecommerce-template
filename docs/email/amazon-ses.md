# Amazon SES email provider

Checked on: 2026-10-20

This document gives the facts of Amazon Simple Email Service (Amazon SES) for the email provider of
this template. Read [README.md](README.md) first. The README gives the contract, the environment
keys and the procedures. This document gives only the Amazon SES part.

| Item                          | Value                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `<slug>`                      | `amazon-ses` (module folder, `static identifier`, and provider `id`)                       |
| `<Name>`                      | `AmazonSes` (class `AmazonSesNotificationProviderService`)                                 |
| `<PROVIDER>`                  | `AWS_SES` (keys `AWS_SES_REGION`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`)    |
| Module path                   | `apps/backend/src/modules/amazon-ses`                                                      |
| Key that selects the provider | `AWS_SES_ACCESS_KEY_ID`. It replaces `<PROVIDER>_API_KEY` of the README.                   |
| Region                        | `ap-southeast-1`, Asia Pacific (Singapore). Jakarta has no SMTP endpoint. See section 5.   |
| SMTP host                     | `email-smtp.<region>.amazonaws.com`, for example `email-smtp.ap-southeast-1.amazonaws.com` |
| SMTP user name and password   | SMTP credentials from the SES console. They are not the IAM access key and secret key.     |
| HTTP API send                 | SES API v2 `SendEmail` through `@aws-sdk/client-sesv2`. It is not a `fetch` call.          |
| Sandbox                       | Yes. A new account sends only to verified addresses, and 200 emails in 24 hours.           |

## 1. Sources

Official AWS documentation. Each page of the SES Developer Guide, the SES API v2 Reference, and
the AWS General Reference also has a Markdown copy: replace `.html` with `.md` in the URL.

SES Developer Guide:

- Setting up Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/setting-up.html
- Connecting to an Amazon SES SMTP endpoint:
  https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- Obtaining Amazon SES SMTP credentials:
  https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
- Types of Amazon SES credentials:
  https://docs.aws.amazon.com/ses/latest/dg/send-email-concepts-credentials.html
- Request production access (Moving out of the Amazon SES sandbox):
  https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Managing your Amazon SES sending limits:
  https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html
- Errors related to the sending quotas:
  https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas-errors.html
- Service quotas in Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/quotas.html
- Regions and Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/regions.html
- Creating and verifying identities (domain, Easy DKIM, email address):
  https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- Easy DKIM in Amazon SES:
  https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html
- Authenticating Email with SPF:
  https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html
- Using a custom MAIL FROM domain: https://docs.aws.amazon.com/ses/latest/dg/mail-from.html
- Complying with DMARC:
  https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html
- Amazon SES SMTP issues (SMTP response codes):
  https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-smtp.html
- Sending raw email (encoding of the sender name):
  https://docs.aws.amazon.com/ses/latest/dg/send-email-raw.html
- Identity and access management in Amazon SES (IAM policies):
  https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html
- Using configuration sets: https://docs.aws.amazon.com/ses/latest/dg/using-configuration-sets.html
- Managing configuration sets (default configuration sets):
  https://docs.aws.amazon.com/ses/latest/dg/managing-configuration-sets.html
- Creating event destinations (open and click events):
  https://docs.aws.amazon.com/ses/latest/dg/event-destinations-manage.html
- Open and click tracking FAQ: https://docs.aws.amazon.com/ses/latest/dg/faqs-metrics.html
- Getting started with Virtual Deliverability Manager:
  https://docs.aws.amazon.com/ses/latest/dg/vdm-get-started.html
- Virtual Deliverability Manager settings:
  https://docs.aws.amazon.com/ses/latest/dg/vdm-settings.html
- Sending test emails with the simulator:
  https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html
- Monitoring your sending statistics using the console:
  https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-console.html
- Monitoring your Amazon SES sending activity:
  https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity.html

SES API v2 Reference:

- SendEmail: https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html
- Destination: https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_Destination.html
- Message: https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_Message.html
- Content: https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_Content.html
- Common Error Types: https://docs.aws.amazon.com/ses/latest/APIReference-V2/CommonErrors.html
- TrackingConfigurationOverrides:
  https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_TrackingConfigurationOverrides.html

AWS General Reference and other AWS guides:

- Amazon SES endpoints and quotas (API endpoints, SMTP endpoints, feedback endpoints):
  https://docs.aws.amazon.com/general/latest/gr/ses.html
- AWS Regions in an account (opt-in Regions):
  https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html
- Manage IAM user access keys:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/access-keys-admin-managed.html

AWS SDK for JavaScript v3:

- `SendEmailCommand`:
  https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/SendEmailCommand/
- Handle service client responses:
  https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/the-response-object.html
- Client configuration (`requestHandler`, timeouts, `credentials`):
  https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md
- Error handling (`name`, `$metadata.httpStatusCode`):
  https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/ERROR_HANDLING.md
- npm package: https://www.npmjs.com/package/@aws-sdk/client-sesv2

## 2. Check before you change the config

Check these facts again before you change `.env` or write code. AWS changes the pages often.

- Open the table "SMTP endpoints" of the page "Amazon SES endpoints and quotas". Find the Region of
  section 5. If Asia Pacific (Jakarta) now has an SMTP endpoint, you can use `ap-southeast-3`.
- Open the page "Connecting to an Amazon SES SMTP endpoint". Compare the ports with section 5.
- Open the page "Service quotas in Amazon SES". Compare the quotas with section 8.
- Open the page "Request production access". Compare the steps with section 3.
- Open the page "SendEmail" of the API v2 Reference. Compare the fields with section 7.
- Open the npm page of `@aws-sdk/client-sesv2`. Make sure that the version of `@aws-sdk/client-s3`
  in `apps/backend/package.json` also exists for `@aws-sdk/client-sesv2`. See section 7.

## 3. Account setup

Use one Region for every step of this document. The verified identities, the sandbox status, the
sending quotas, and the SMTP credentials are separate for each Region.

1. Make an AWS account. The page "Setting up Amazon SES" links to the procedure.
2. Open the SES console: https://console.aws.amazon.com/ses/.
3. In the Region selector of the console, select **Asia Pacific (Singapore)** (`ap-southeast-1`).
4. Make the domain identity of section 4.
5. Make an email address identity for each test recipient. See "Verify a test recipient" below.
6. Request production access. See "Request production access" below.
7. For SMTP: make the SMTP credentials of section 5.
8. For an HTTP API provider: make the IAM access key. See "Access key for an HTTP API provider"
   below.

### The sandbox

AWS puts each new account in the SES sandbox. The sandbox status is separate for each Region. In
the sandbox, these rules apply:

- SES sends only to verified email addresses and domains, and to the mailbox simulator.
- SES sends a maximum of 200 emails in 24 hours.
- SES sends a maximum of 1 email each second.

Thus the first order email of a real customer fails in the sandbox. Request production access
before the store opens.

### Verify a test recipient

In the sandbox, each recipient must be a verified identity. Do these steps for each address that
gets a test email:

- The customer address that you use to sign in to the store.
- The store contact email (Medusa Admin, **Settings → Bank transfer**). The owner emails go to it.
- `STORE_OWNER_EMAIL`, if it has a value. The owner emails go to it when the contact email is
  empty.

1. In the navigation pane, under **Configuration**, choose **Identities**.
2. Choose **Create identity**.
3. Select **Email address**.
4. Enter the address.
5. Choose **Create identity**.
6. Open the inbox of the address. Find the email from `no-reply-aws@amazon.com`.
7. Click the link in the email. The link expires after 24 hours.
8. Make sure that the **Identity status** of the address is **Verified**.

### Request production access

1. In the navigation pane, choose **Account dashboard**.
2. In the box "Your Amazon SES account is in the sandbox", choose **View Get set up page**.
3. Choose **Request production access**.
4. Select **Transactional**. The template sends only emails that a customer action starts.
5. In **Website URL**, enter the store URL `https://<domain>`.
6. In **Additional contacts**, enter the owner address. You can enter up to 4 addresses.
7. In **Preferred contact language**, select **English**.
8. Select the box in **Acknowledgement**.
9. Choose **Submit request**.

AWS gives a first answer in 96 hours. AWS can ask for more information, and then the review takes
longer. You cannot change the request while AWS reviews it. Verify the domain of section 4 first.
The page "Request production access" says that a verified domain makes the approval faster.

After production access, SES sends to any recipient. The sender address must still be on a
verified identity.

### Access key for an HTTP API provider

Do these steps only for an HTTP API provider. Do not use the SMTP credentials of section 5 for the
API. Make a different IAM user.

1. Open the IAM console: https://console.aws.amazon.com/iam/.
2. Make an IAM user, for example `store-ses-api`. Do not give it console access.
3. Attach this policy to the user. It permits only the two send actions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

4. In the navigation pane, choose **Users**.
5. Choose the user name.
6. On the **Security credentials** tab, in the **Access keys** section, choose **Create access
   key**.
7. Choose **Other**, then choose **Next**.
8. Choose **Create access key**.
9. Choose **Show**.
10. Copy the access key ID into `AWS_SES_ACCESS_KEY_ID`.
11. Copy the secret access key into `AWS_SES_SECRET_ACCESS_KEY`. This page is the only time that
    AWS shows the secret access key.

## 4. Domain setup

Verify the domain of `EMAIL_FROM` in the Region of section 3. Easy DKIM verifies the domain and
signs each email.

1. In the navigation pane, under **Configuration**, choose **Identities**.
2. Choose **Create identity**.
3. Select **Domain**.
4. Enter the domain without `www.`, for example `example.com`. With `www.`, the verification
   fails.
5. Do not select **Assign a default configuration set**. See section 9.
6. Select **Use a custom MAIL FROM domain**.
7. In **MAIL FROM domain**, enter `bounce`. The MAIL FROM domain is then `bounce.<domain>`.
8. In **Behavior on MX failure**, select **Use default MAIL FROM domain**. See section 11.
9. Under **Advanced DKIM settings**, keep **Easy DKIM** and **RSA_2048_BIT**.
10. Choose **Create identity**.
11. On the identity page, open the **Authentication** tab. Expand **Publish DNS records**.
12. Add each record of the table below to the DNS of the domain.
13. Wait until the **Identity status** is **Verified** and the DKIM configuration is
    **Successful**. DNS changes can take up to 72 hours.

| Name                           | Type  | Value                                           |
| ------------------------------ | ----- | ----------------------------------------------- |
| `<token1>._domainkey.<domain>` | CNAME | `<token1>.<SES DKIM domain>`, from the console  |
| `<token2>._domainkey.<domain>` | CNAME | `<token2>.<SES DKIM domain>`, from the console  |
| `<token3>._domainkey.<domain>` | CNAME | `<token3>.<SES DKIM domain>`, from the console  |
| `bounce.<domain>`              | MX    | `10 feedback-smtp.ap-southeast-1.amazonses.com` |
| `bounce.<domain>`              | TXT   | `"v=spf1 include:amazonses.com ~all"`           |
| `_dmarc.<domain>`              | TXT   | `v=DMARC1; p=none; rua=mailto:<address>`        |

- Copy the three CNAME records from the console. The tokens are different for each identity. The
  DKIM domain changes with the Region.
- Do not add an underscore at the start of a CNAME name. `abc123._domainkey.example.com` is
  correct. `_abc123._domainkey.example.com` is not correct.
- Enter `10` in the priority field of the MX record, if the DNS provider has one.
- `bounce.<domain>` must have exactly one MX record. With more MX records, the MAIL FROM setup
  fails.
- The MX value contains the Region. Use the Region of section 3.
- The SPF record goes on `bounce.<domain>`, the custom MAIL FROM domain. The receiver checks SPF on
  that domain. Do not change the SPF record of the domain for SES.
- Without a custom MAIL FROM domain, SES uses a subdomain of `amazonses.com`. SPF then passes, but
  SPF is not aligned with the domain of `EMAIL_FROM`. DKIM alone then makes DMARC pass.
- The DMARC record comes from the README. The DMARC record must not contain `aspf=s`. SES needs a
  relaxed SPF alignment, because the MAIL FROM domain is a subdomain.
- If the domain uses Amazon Route 53 in the same AWS account, SES can publish the records. Keep
  **Publish DNS records to Route53** enabled.

The README final checklist has the item "The provider dashboard shows the domain as verified". For
SES, check these statuses of the domain identity:

- The **Identity status** is **Verified**.
- The DKIM configuration is **Successful**. The **Authentication** tab shows it.
- The custom MAIL FROM domain status is **Success**. The **Authentication** tab shows it. SES sends
  an email to the address of the AWS account when the status changes. It can take up to 72 hours.

The SES console shows no SPF status.

## 5. SMTP

SES accepts only encrypted connections. Use the Region of section 3 in the host.

| Port   | TLS                    | `SMTP_SECURE` | Use                                                                    |
| ------ | ---------------------- | ------------- | ---------------------------------------------------------------------- |
| `587`  | STARTTLS               | `false`       | The first choice.                                                      |
| `2587` | STARTTLS               | `false`       | The second port, if the host blocks `587`.                             |
| `465`  | Implicit TLS (wrapper) | `true`        | The first implicit TLS port.                                           |
| `2465` | Implicit TLS (wrapper) | `true`        | The second implicit TLS port. `options.ts` does not check it. See 11.  |
| `25`   | STARTTLS               | `false`       | Do not use. Amazon EC2 throttles port 25, and many VPS hosts block it. |

- Host: `email-smtp.<region>.amazonaws.com`. For the Region of this document:
  `email-smtp.ap-southeast-1.amazonaws.com`.
- Asia Pacific (Jakarta) `ap-southeast-3` has an SES API endpoint, but no SMTP endpoint. Thus
  `email-smtp.ap-southeast-3.amazonaws.com` does not exist. The nearest Region with an SMTP endpoint
  is Asia Pacific (Singapore) `ap-southeast-1`.
- Jakarta is also an opt-in Region. An AWS account must enable it before use. This document does
  not use it.

### SMTP credentials

The SMTP user name and the SMTP password are SMTP credentials. They are not the AWS access key ID
and the secret access key. The SMTP password is different from the secret access key. The SMTP
credentials are separate for each Region.

1. Open the SES console in the Region of section 3.
2. In the navigation pane, choose **SMTP settings**.
3. Choose **Create SMTP credentials**. The IAM console opens.
4. In **User Name**, keep the default name or enter a name, for example `store-ses-smtp`.
5. Choose **Create user**.
6. Choose **Show** under **SMTP password**.
7. Copy the SMTP user name into `SMTP_USER`.
8. Copy the SMTP password into `SMTP_PASSWORD`.
9. Choose **Download .csv file**. Keep the file in a safe place.

- Copy the values before you close the dialog box. After you close it, AWS does not show the SMTP
  password again.
- The IAM user that makes the credentials needs the IAM actions `iam:CreateUser`,
  `iam:CreateGroup`, `iam:PutGroupPolicy`, `iam:AddUserToGroup`, and `iam:CreateAccessKey`. The
  root user of the account has them.
- The console puts the SMTP user in the group `AWSSESSendingGroupDoNotRename`. The group policy
  `AmazonSesSendingAccess` permits `ses:SendRawEmail`. Do not remove the policy. The SMTP interface
  needs `ses:SendRawEmail`.
- To change the SMTP password, delete the SMTP user in the IAM console. Then do the steps again.

### SMTP replies

These replies come from the page "Amazon SES SMTP issues". Nodemailer puts the number in the
`Response code` part of the log line of the README.

| Reply                                                      | Cause                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `535 Authentication Credentials Invalid`                   | Wrong SMTP credentials, or the IAM access key in place of them.         |
| `530 Authentication required`                              | No `SMTP_USER` and `SMTP_PASSWORD`.                                     |
| `554 Message rejected: Email address is not verified. ...` | The sender is not verified, or the account is in the sandbox. See 11.   |
| `554 Access denied: User ... is not authorized ...`        | The SMTP user has no `ses:SendRawEmail` permission.                     |
| `454 Throttling failure: Daily message quota exceeded`     | The 24-hour quota is used. See section 8.                               |
| `454 Throttling failure: Maximum sending rate exceeded`    | Too many emails in one second. See section 8.                           |
| `454 Temporary authentication failure`                     | A TLS problem, or an SES problem. Check `SMTP_SECURE` and the port.     |
| `535 Account not subscribed to SES`                        | The AWS account that owns the SMTP credentials has no SES subscription. |
| `250 Ok <MessageID>`                                       | Success. `<MessageID>` is the SES message id.                           |

- **Unverified:** whether the `messageId` that Nodemailer returns is the SES message id of the
  `250` reply. The `smtp` provider returns the `messageId` of Nodemailer. Do not use it to find an
  email in SES.

## 6. Environment values

For SMTP, put these values in `.env` on the server:

| Key               | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| `SMTP_HOST`       | `email-smtp.ap-southeast-1.amazonaws.com`                         |
| `SMTP_PORT`       | `587`. The second port is `2587`.                                 |
| `SMTP_SECURE`     | `false`. Use `true` only for the port `465` or `2465`.            |
| `SMTP_USER`       | The SMTP user name of section 5.                                  |
| `SMTP_PASSWORD`   | The SMTP password of section 5. Not the secret access key.        |
| `EMAIL_FROM`      | An address on the verified domain, for example `orders@<domain>`. |
| `EMAIL_FROM_NAME` | The Medusa store name.                                            |

For an HTTP API provider, add these keys. The SMTP keys then have no effect.

| Key                         | Meaning                                               | `apps/backend/.env.example` | `apps/backend/.env.test` | Root `.env.example` |
| --------------------------- | ----------------------------------------------------- | --------------------------- | ------------------------ | ------------------- |
| `AWS_SES_REGION`            | The Region of section 3.                              | empty                       | empty                    | `ap-southeast-1`    |
| `AWS_SES_ACCESS_KEY_ID`     | The access key ID of section 3. Selects the provider. | empty                       | empty                    | empty               |
| `AWS_SES_SECRET_ACCESS_KEY` | The secret access key of section 3.                   | empty                       | empty                    | empty               |

- `AWS_SES_ACCESS_KEY_ID` is the key that selects the provider. Use it in place of
  `<PROVIDER>_API_KEY` in the registration code of the README.
- Add the three keys with the rule of the README section "Env keys". In `docker-compose.yml`, write
  each key as `<KEY>: ${<KEY>:-}`, for example `AWS_SES_REGION: ${AWS_SES_REGION:-}`.
- In the root `.env.example`, keep `AWS_SES_ACCESS_KEY_ID` and `AWS_SES_SECRET_ACCESS_KEY` empty,
  never `change-me`. A value in `AWS_SES_ACCESS_KEY_ID` selects the provider, also `change-me`.
  Add a comment above the keys: "Set only for the Amazon SES HTTP API provider. See
  docs/email/amazon-ses.md."
- Add the three keys to the table of `docs/deployment.md` only in a project that uses the Amazon SES
  HTTP API provider in production.
- Step 16 of the README procedure "Write an HTTP API provider" puts the three keys in `.env` on the
  server.
- Keep the SMTP keys in `.env` with their values. They have no effect while
  `AWS_SES_ACCESS_KEY_ID` has a value. The env check of `docs/deployment.md` still passes.
- The provider reuses `EMAIL_FROM` and `EMAIL_FROM_NAME`. `EMAIL_FROM` is still required.
- Do not name the keys `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`. The default credential chain
  of the AWS SDK reads those names. The prefix `AWS_SES_` keeps the SES keys separate from other
  AWS clients.

The options of the provider in `notificationModule(env)`:

```ts
{
  resolve: "./src/modules/amazon-ses",
  id: "amazon-ses",
  options: {
    channels: ["email"],
    region: env.AWS_SES_REGION,
    accessKeyId,
    secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME || undefined,
  },
}
```

- `accessKeyId` is `env.AWS_SES_ACCESS_KEY_ID`, the value of the condition.
- `validateOptions` throws `INVALID_DATA` when `region`, `accessKeyId`, `secretAccessKey`, or
  `from` is empty. The message names the option, never its value. Medusa calls it when it loads
  the module, so a bad value stops the start.
- Put the option type and the checks in `options.ts`, as the `smtp` module does. Test them in
  `__tests__/options.unit.spec.ts`. `buildModules(env)` does not call `validateOptions`, so
  `apps/backend/src/config/__tests__/modules.unit.spec.ts` cannot test them.

## 7. HTTP API: send one email

The SES API needs AWS Signature Version 4 on each request. Use the AWS SDK, not the global
`fetch`. The README section "send()" names this exception.

### Package

Add `@aws-sdk/client-sesv2` to the `dependencies` of `apps/backend/package.json`. Use the exact
version of `@aws-sdk/client-s3` in the same file. On the date above, both are `3.1145.0`:

```json
"@aws-sdk/client-s3": "3.1145.0",
"@aws-sdk/client-sesv2": "3.1145.0",
```

Change the two versions together. Then run `pnpm install` at the repository root.

### Client

Make one client in the constructor. Give it the region, the credentials, and `maxAttempts` from
the code, not from the environment.

```ts
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"

this.client_ = new SESv2Client({
  region: options.region,
  credentials: {
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
  },
  maxAttempts: 3,
})
```

- Always give `credentials`. Without them, the SDK reads the default credential chain, for example
  the environment and the files in `~/.aws`.
- The SDK signs the request. The SDK also builds the URL:
  `POST https://email.<region>.amazonaws.com/v2/email/outbound-emails`.
- The SDK retries only transient errors, for example a throttling error or a network error. The
  default is 3 attempts. Give `maxAttempts: 3` in the code, so that an env key such as
  `AWS_MAX_ATTEMPTS` cannot change it. The retries help in the sandbox, where SES accepts 1 email
  each second.
- The SDK can still read other `AWS_` env keys, for example `AWS_ENDPOINT_URL`. The template sets
  none of them. Do not set them on the server.

### Timeout

Give each send one total limit of 10 seconds, as the README does with `fetch`. The limit includes
the retries.

```ts
const response = await this.client_.send(command, { abortSignal: AbortSignal.timeout(10000) })
```

- Do not use `requestHandler: { requestTimeout }` for this limit. In `@smithy/node-http-handler`
  4.12.1, the request handler of `3.1145.0`, `requestTimeout` only writes a warning to `console`. It
  throws only with `throwOnRequestTimeout: true`. Each retry also gets a new timeout. Fact seen in
  the installed SDK source, `dist-cjs/index.js`, lines 83 to 97.
- When the signal stops the send, the SDK throws an error with the `name` `AbortError`. Its `cause`
  is the `TimeoutError` of the signal. Fact seen in the installed SDK source and in a test run on
  the date above.

### Input

Send only the six fields of the README. Send no other field, for example no
`ConfigurationSetName`, no `EmailTags`, and no `Attachments`.

| Field      | `SendEmailCommand` input                                       |
| ---------- | -------------------------------------------------------------- |
| Recipient  | `Destination.ToAddresses: [notification.to]`                   |
| Subject    | `Content.Simple.Subject: { Data: subject, Charset: "UTF-8" }`  |
| HTML       | `Content.Simple.Body.Html: { Data: html, Charset: "UTF-8" }`   |
| Plain text | `Content.Simple.Body.Text: { Data: text, Charset: "UTF-8" }`   |
| Sender     | `FromEmailAddress: '"Everyday" <orders@example.com>'`          |
| Reply-To   | `ReplyToAddresses: [replyTo]`. Leave out the field without it. |

```ts
// A quoted name keeps a comma, a dot, or a semicolon of the store name out of the address syntax.
function formatSender(from: string, fromName?: string): string {
  if (!fromName) {
    return from
  }
  const quoted = fromName.replace(/(["\\])/g, "\\$1")
  return `"${quoted}" <${from}>`
}

const command = new SendEmailCommand({
  FromEmailAddress: formatSender(this.options_.from, this.options_.fromName),
  Destination: { ToAddresses: [notification.to] },
  ...(replyTo && { ReplyToAddresses: [replyTo] }),
  Content: {
    Simple: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
        Text: { Data: text, Charset: "UTF-8" },
      },
    },
  },
})
const response = await this.client_.send(command, { abortSignal: AbortSignal.timeout(10000) })
return { id: response.MessageId }
```

- `Charset`: SES uses 7-bit ASCII by default. The Indonesian emails and the rupiah amounts can
  contain other characters. Thus give `UTF-8` for each of the three parts.
- The `smtp` provider gives Nodemailer `{ name, address }`, and Nodemailer quotes the name. The
  SDK does not do this, so `formatSender` quotes the name. Add a unit test with a name that has a
  comma and a double quote.
- **Unverified:** the API v2 page of `FromEmailAddress` does not show the format with a name. The
  "friendly from" name of the page "Sending raw email" gives it. The quoted form follows RFC 5322.
- A sender name with characters that are not ASCII needs the MIME encoded-word syntax (page
  "Sending raw email"). The store name of the template is ASCII. If a client store name is not
  ASCII, encode the name.
- **Unverified:** the API v2 page "Message" says that a subject must be 7-bit ASCII or use the
  encoded-word syntax. The page "Content" says to give a `Charset` for other characters. The doc
  does not say clearly that SES encodes a UTF-8 subject. Test one subject with a character that is
  not ASCII before production.
- `FromEmailAddress` must be on a verified identity of the Region.

### Response

- HTTP 200 with the body `{ "MessageId": "<id>" }`. The SDK returns `MessageId` and `$metadata`.
- Return `{ id: response.MessageId }`. A response with no `MessageId` then returns
  `{ id: undefined }`, as the README says.
- SES can accept a message and not send it, for example for a virus in an attachment. The template
  sends no attachment.

### Errors

The SDK throws an exception for each error. Read these two fields:

- `error.name`: the error code, for example `MessageRejected`. If the thrown value has no `name`,
  write `unknown`, as the `smtp` provider does.
- `error.$metadata?.httpStatusCode`: the HTTP status of an error status.

A network error and a timeout have no HTTP status. Then the message has no `Status:` part, as the
README says. A network error and a timeout also have `$metadata`. The retry step of the SDK adds
`{ attempts, totalRetryDelay }` to each error, but no `httpStatusCode`. Thus do not test
`if (error.$metadata)`. Test `httpStatusCode`. Fact seen in the installed SDK source
(`@smithy/core` 3.35.1, `submodules/retry/index.js`, lines 192 to 196) and in a test run.

Do not log `error.message`. The SMTP reply `554 Message rejected` contains the email addresses that
failed the check. **Unverified:** whether the API message also contains them. Treat it as if it
does.

The log line and the error message:

```text
AmazonSes did not send the "<template>" email. Status: 400. Code: MessageRejected.
```

For a timeout of the abort signal, the line is:

```text
AmazonSes did not send the "<template>" email. Code: AbortError.
```

The exceptions of `SendEmail` (page "SendEmail" and the SDK page `SendEmailCommand`):

| `error.name`                         | HTTP status | Cause                                                               |
| ------------------------------------ | ----------- | ------------------------------------------------------------------- |
| `MessageRejected`                    | 400         | Invalid content, or an address that is not verified (sandbox).      |
| `MailFromDomainNotVerifiedException` | 400         | The custom MAIL FROM domain is not verified, with "Reject message". |
| `AccountSuspendedException`          | 400         | AWS stopped the sending of the account permanently.                 |
| `SendingPausedException`             | 400         | AWS paused the sending of the account.                              |
| `BadRequestException`                | 400         | The input is not valid, or a default configuration set was deleted. |
| `LimitExceededException`             | 400         | Too many instances of a resource type.                              |
| `NotFoundException`                  | 404         | A resource does not exist.                                          |
| `TooManyRequestsException`           | 429         | Too many requests to the operation.                                 |
| `ThrottlingException`                | 400         | A sending quota is used. See section 8.                             |
| `UnrecognizedClientException`        | 403         | The access key ID does not exist.                                   |
| `AccessDeniedException`              | 403         | The IAM policy of the user does not permit `ses:SendEmail`.         |

The last three come from the page "Common Error Types". The SDK base class of the service
exceptions is `SESv2ServiceException`.

### Tests

The SDK does not use the global `fetch`. In Node.js, the default request handler of the SDK uses
`node:https`, also when `fetch` exists (SDK page "CLIENTS.md"). Thus a mock of `global.fetch` does
not catch the request. Mock the SDK client in place of `global.fetch`. This rule is different from
the README section "Tests".

```ts
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2"

const send = jest.spyOn(SESv2Client.prototype, "send")

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ MessageId: "0100019a-example", $metadata: {} } as never)
})

// In a test:
const command = send.mock.calls[0][0] as SendEmailCommand
expect(command).toBeInstanceOf(SendEmailCommand)
expect(command.input).toEqual({/* the input of section 7 */})
expect(send.mock.calls[0][1]?.abortSignal).toBeInstanceOf(AbortSignal)

// The region and the credentials of the client. The config values are async functions.
const client = (service as any).client_ as SESv2Client
expect(await client.config.region()).toBe("ap-southeast-1")
expect(await client.config.credentials()).toMatchObject({
  accessKeyId: "AKIAEXAMPLE",
  secretAccessKey: "secret-example",
})
```

- `jest.spyOn` on the prototype replaces `send` for each client. Thus the constructor of the
  service does not need an optional client. This is different from `S3ReceiptStorage`.
- For an error, reject with an `Error` that has the fields of the SDK exception. The test
  `apps/backend/src/modules/payment-receipt/__tests__/storage-s3.unit.spec.ts` makes its errors in
  the same way.

```ts
send.mockRejectedValue(
  Object.assign(new Error("Email address is not verified."), {
    name: "MessageRejected",
    $fault: "client",
    $metadata: { httpStatusCode: 400 },
  })
)
```

- For a timeout, reject with the shape of the SDK abort error. It has `$metadata`, but no
  `httpStatusCode`. The log line must then say `Code: AbortError.` and have no `Status:` part.

```ts
send.mockRejectedValue(
  Object.assign(new Error("Request aborted"), {
    name: "AbortError",
    $metadata: { attempts: 1, totalRetryDelay: 0 },
  })
)
```

- Do the test cases of the README section "Tests". "The request" means `command.input`. "The URL
  and the authentication" means `client.config.region()` and `client.config.credentials()`.
- Add a test that no log line contains `secretAccessKey` or `accessKeyId`.

## 8. Limits

The quotas are separate for each Region. They count recipients, not messages. Each template email
has one recipient, so one email counts as one.

| Quota                   | Sandbox | Production                                                 |
| ----------------------- | ------- | ---------------------------------------------------------- |
| Emails in 24 hours      | 200     | AWS sets it for each account, from the production request. |
| Emails each second      | 1       | AWS sets it for each account, from the production request. |
| Message size            | 40 MB   | 40 MB (API v2 and SMTP, after base64 encoding).            |
| Recipients in a message | 50      | 50                                                         |

- The 24-hour quota is a rolling period. SES counts the emails of the last 24 hours at each send.
- SES permits short bursts above the rate. It does not permit a long period above the rate.
- The SES documentation gives no fixed production quota. **Unverified:** a common start value of
  50,000 emails in 24 hours and 14 emails each second. Read the real values on the **Account
  dashboard**, in the **Sending limits** pane.
- An order sends two emails at the same time: `order-placed` and `new-order-owner`. In the sandbox,
  the second one can get a throttling error. The `smtp` provider does not try again, so the email
  is lost. The SDK of the HTTP API provider tries again inside the 10-second limit.
- Thus in the sandbox, step 16 of the README procedure "Set up a provider over SMTP" can fail for
  one of the two emails. Look for
  `Response code: 454.` in the backend log. That failure is expected in the sandbox. Do step 16
  again after production access.
- When a quota is used, SES drops the email and does not try again. The template does not try
  again either. The API gives `ThrottlingException` with `Daily message quota exceeded` or
  `Maximum sending rate exceeded`. SMTP gives the `454` replies of section 5.
- To get a higher quota after production access, open a case in the AWS Support Center.
- The API actions other than the send actions have a limit of 1 request each second. The provider
  calls only `SendEmail`.

## 9. Tracking and dashboard settings

SES does not track opens or clicks by default. Tracking applies only in these cases:

- A configuration set applies to the email, and it has an event destination with the event type
  **Opens** or **Clicks**.
- Virtual Deliverability Manager (VDM) is enabled with **Engagement tracking** on. The page "Getting
  started with Virtual Deliverability Manager" says: "Turning this on alters your URLs and links to
  include Amazon SES engagement tracking wrappers."

Click tracking changes each link to a link on the SES tracking host, for example
`r.ap-southeast-1.awstrack.me`. The magic link then does not open the store URL directly.

The template sends no configuration set. Thus only a default configuration set of an identity, or
VDM, can turn on tracking. Do these checks in the Region of section 3:

1. In the navigation pane, under **Configuration**, choose **Identities**.
2. Choose the name of the domain identity.
3. Open each tab of the identity page. Find **Default configuration set**. **Unverified:** the name
   of the tab that shows it.
4. If the identity has a default configuration set, choose **Edit**. Clear the default
   configuration set. Choose **Save changes**.
5. Do steps 2 to 4 for each email address identity on the same domain. A default configuration set
   of an address overrides the set of the domain.
6. In the navigation pane, under **Virtual Deliverability Manager**, choose **Settings**.
7. If VDM is enabled, in the **Additional settings** panel, choose **Edit**.
8. Turn off **Engagement tracking**. Choose **Submit settings**.

If the owner needs a configuration set, keep it. Then open **Configuration sets**, open the set,
and remove the event types **Opens** and **Clicks** from each event destination. Do not delete a
set that is the default set of an identity. A send through that identity then fails with a "bad
request" error.

Other facts:

- The API v2 has a per-message override, `ConfigurationOverrides.Tracking`, with
  `ClickTrackingEnabled` and `OpenTrackingEnabled`. `@aws-sdk/client-sesv2` has it from version
  `3.1146.0`. Version `3.1145.0` does not have it. Do not send it. The README permits only the six
  fields, so the console settings above must turn off tracking.
- The HTML attribute `ses:no-track` turns off click tracking for one link. The templates do not
  change, so do not use it.

## 10. Test send

Send one test email from the console before you change `.env`:

1. In the navigation pane, under **Configuration**, choose **Identities**.
2. Choose the name of a verified email address identity.
3. Choose **Send test email**.
4. For **Email Format**, select **Formatted**.
5. For **Scenario**, select **Custom**.
6. In **Custom recipient**, enter a verified address. In the sandbox, the address must be verified.
7. Enter a subject and a body.
8. Choose **Send test email**.
9. Open the inbox of the recipient. Find the email.

The other scenarios send to the mailbox simulator, for example `success@simulator.amazonses.com`
or `bounce@simulator.amazonses.com`. An email to the simulator does not count against the quota.

The sending statistics are on the **Account dashboard**:

- **Daily email usage**: the emails sent and the remaining sends in 24 hours.
- **Sending statistics**: graphs of the sends, the rejects, the bounces, and the complaints. The
  range is from the last day to the last 14 days, in periods of 1 hour.
- **Sending limits**: the quotas of section 8.

The console shows counts, not a list of each email. For the step "Find the emails in the delivery
log of the provider" of the README, check that the **Sends** count went up. Then check the inbox of
the recipient. Event publishing or VDM gives the data of each email, but the template does not use
them.

## 11. Traps

- **The sandbox.** A new account sends only to verified addresses, 200 emails in 24 hours, and 1
  email each second. The first order email of a real customer fails with `554 Message rejected:
Email address is not verified` (SMTP) or `MessageRejected` (API). Request production access
  before the store opens. See section 3.
- **The sandbox is separate for each Region.** Production access in one Region does not apply in
  another Region. Request it in the Region of `SMTP_HOST` or `AWS_SES_REGION`.
- **The SMTP credentials.** `SMTP_USER` and `SMTP_PASSWORD` are the SMTP credentials of section 5.
  The IAM access key ID and the secret access key give `535 Authentication Credentials Invalid`.
  Do not put the secret access key in `SMTP_PASSWORD`.
- **The access key for the API.** The HTTP API provider uses an IAM access key, not the SMTP
  credentials. Make a separate IAM user. See section 3.
- **The Region in the SMTP host.** The SMTP credentials, the verified domain, and the sandbox
  status belong to one Region. The Region in `SMTP_HOST` must be that Region. A different Region
  gives `535` or `554`.
- **No SMTP endpoint in Jakarta.** `email-smtp.ap-southeast-3.amazonaws.com` does not exist. Use
  `ap-southeast-1`.
- **Port 2465.** `apps/backend/src/modules/smtp/options.ts` checks `SMTP_SECURE` only for port
  `465`. For `2465`, set `SMTP_SECURE=true`. With `false`, each send waits 10 seconds and fails.
- **Port 25.** Amazon EC2 throttles port 25, and many VPS hosts block it. Use `587` or `2587`.
- **The MX failure behavior.** With **Reject message**, a missing MX record of
  `bounce.<domain>` stops every send. The SES Developer Guide calls the error
  `MailFromDomainNotVerified`. The SDK throws it as `MailFromDomainNotVerifiedException`. Select
  **Use default MAIL FROM domain**.
- **Tracking.** A default configuration set or VDM engagement tracking changes the magic link. See
  section 9.
- **A deleted default configuration set.** If an identity names a deleted set as its default set,
  each send fails with a "bad request" error.
- **The error message.** An SES error message can contain email addresses. Log only the status and
  `error.name`.
- **The quota drops the email.** At a quota limit, SES drops the email and does not try again.
  Watch the **Sending limits** pane.

## 12. Example JSON for test mocks

The values below are examples. The `MessageId` and the `requestId` are not real.

`SendEmail`, HTTP 200, the body:

```json
{
  "MessageId": "0100019a1b2c3d4e-5f6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b8c-000000"
}
```

`client.send(command)`, the resolved value for the mock:

```json
{
  "$metadata": {
    "httpStatusCode": 200,
    "requestId": "8a6f1c2e-0b3d-4e5f-9a7b-1c2d3e4f5a6b"
  },
  "MessageId": "0100019a1b2c3d4e-5f6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b8c-000000"
}
```

`client.send(command)`, the fields of the rejected error for the mock. A recipient that is not
verified in the sandbox gives it:

```json
{
  "name": "MessageRejected",
  "$fault": "client",
  "$metadata": {
    "httpStatusCode": 400,
    "requestId": "2f4e6a8c-1b3d-4f5a-8c7e-9d0b1a2c3e4f"
  },
  "message": "Email address is not verified. The following identities failed the check in region AP-SOUTHEAST-1: customer@example.com"
}
```

- **Unverified:** the exact `message` text of the API. The text above follows the SMTP reply of the
  page "Amazon SES SMTP issues". The provider must not log it.

`client.send(command, { abortSignal })`, the fields of the rejected error after the 10-second
limit. A test run on the date above gave these fields. `cause` is the `TimeoutError` of the
signal.

```json
{
  "name": "AbortError",
  "message": "Request aborted",
  "$metadata": {
    "attempts": 1,
    "totalRetryDelay": 0
  }
}
```

- **Unverified:** the format of a real `MessageId`. The API page says only that it is a string.
