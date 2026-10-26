# Deployment

This procedure installs the store on one server with Docker Compose. Do the sections in sequence
for the first deploy. In this document, `<domain>` is the domain of the store, for example
`example.com`. The URLs in the commands use the default hosts `<domain>` and `api.<domain>`. If
you set `STOREFRONT_URL` or `MEDUSA_BACKEND_URL`, use the hosts of these keys.

## Server

- 2 vCPU and 4 GB of RAM or more, with Ubuntu 24.04 or a different current Linux.
- Docker Engine with the Compose plugin v2.20 or later, `git`, and `rsync`. The Compose file
  uses `required: false` in `depends_on`, and older versions do not support it.
- Open ports: 22, 80, and 443 (TCP), and 443 (UDP).
- A second server or a storage service that accepts `rsync` through SSH, for the backups.

The commands in this document run as a user in the `docker` group. Only the swap file needs `sudo`.

## DNS records

Make an A record for each of the two hosts. Each record points to the server address. The hosts
are the hosts of `STOREFRONT_URL` and `MEDUSA_BACKEND_URL`. By default, they are `<domain>` and
`api.<domain>`.

| Name                                              | Service                      |
| ------------------------------------------------- | ---------------------------- |
| The host of `STOREFRONT_URL` (`<domain>`)         | Storefront                   |
| The host of `MEDUSA_BACKEND_URL` (`api.<domain>`) | Medusa API and the dashboard |

Make the records before the first deploy. With the `caddy` profile, Caddy gets the HTTPS
certificates when it starts, and the certificate authority must find the server through these
records.

The product images use the public URL of the S3 store. See
[S3 store: one-time setup](#s3-store-one-time-setup).

## Swap file

Make the swap file before the first build. Without it, a build can stop the live services.

1. Make a swap file of 2 GB and use it.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

2. Add the swap file to `/etc/fstab`. The server then uses it after a restart.

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

3. Make sure that the line `Swap` shows a total of 2 GB.

```bash
free -h
```

## Environment file

The file `.env` holds the domain, the secrets, and the choices of the deploy. The Compose file
makes the other values from it. The file is not in git.

1. Get the repository, and make the environment file from the example.

```bash
git clone <repository URL> /srv/store
cd /srv/store
cp .env.example .env
chmod 600 .env
```

2. Make a new random value for each secret. Run the command one time for each secret.

```bash
openssl rand -hex 32
```

3. Open `.env` in an editor, and set the values of the table below. An optional key can stay
   empty. An empty key gives the default of the table.

Do not use the characters `$` and `` ` `` in a value. Compose can expand these characters.

| Key                            | Purpose                                                                                                                                                                                                                                                              | Value                                                                                                                                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPOSE_PROFILES`             | Compose starts the services of these profiles. The profiles are `postgres`, `redis`, and `caddy`. The other services always start.                                                                                                                                   | `postgres,redis,caddy`. Remove `postgres` for a managed PostgreSQL, `redis` for a managed Redis, and `caddy` for a different proxy. See [Managed services and other proxies](#managed-services-and-other-proxies).                                                                    |
| `DOMAIN`                       | The storefront host. The defaults of `STOREFRONT_URL` and `MEDUSA_BACKEND_URL` come from it: `https://<domain>` and `https://api.<domain>`.                                                                                                                          | The host name only, for example `example.com`. Do not add `https://` or a path.                                                                                                                                                                                                       |
| `STOREFRONT_URL`               | The URL of the storefront. The CORS values, the links in the emails, and the Caddy site address use it.                                                                                                                                                              | Optional. Empty means `https://<domain>`. The value starts with `https://` and has no path and no slash at the end.                                                                                                                                                                   |
| `MEDUSA_BACKEND_URL`           | The URL of the Medusa API and the dashboard. The dashboard gets it at image build time.                                                                                                                                                                              | Optional. Empty means `https://api.<domain>`. The value starts with `https://` and has no path and no slash at the end. Its host is on the same site as the host of `STOREFRONT_URL`, for example `www.shop.com` and `admin.shop.com`.                                                |
| `ACME_EMAIL`                   | Caddy gives this address to the certificate authority.                                                                                                                                                                                                               | Your email address.                                                                                                                                                                                                                                                                   |
| `POSTGRES_PASSWORD`            | The password of the database user `postgres` in the `postgres` service.                                                                                                                                                                                              | `openssl rand -hex 32`. Use only letters, digits, `-`, and `_`.                                                                                                                                                                                                                       |
| `JWT_SECRET`                   | Medusa signs the authentication tokens with this secret.                                                                                                                                                                                                             | `openssl rand -hex 32`. Use 32 characters or more.                                                                                                                                                                                                                                    |
| `COOKIE_SECRET`                | Medusa signs the session cookie with this secret.                                                                                                                                                                                                                    | `openssl rand -hex 32`. Use 32 characters or more.                                                                                                                                                                                                                                    |
| `SESSION_TTL_HOURS`            | The hours with no activity before the session ends. Each request starts the time again. Admin users and customers share this value.                                                                                                                                  | Optional. A positive whole number. Empty means `168` (7 days). Another value stops the backend at startup.                                                                                                                                                                            |
| `DATABASE_URL`                 | The URL of the PostgreSQL database.                                                                                                                                                                                                                                  | Optional. Empty means the `postgres` service: `postgres://postgres:<POSTGRES_PASSWORD>@postgres:5432/medusa-store`. Set it when `COMPOSE_PROFILES` has no `postgres`. For a managed PostgreSQL, put the TLS mode in the URL as the provider documents, for example `sslmode=require`. |
| `DATABASE_SSL`                 | `false` turns TLS off for the database connection. Any other value keeps the Medusa default.                                                                                                                                                                         | Optional. Empty means `false`, the value for the `postgres` service. For a managed PostgreSQL, set `true`, and set the TLS mode in `DATABASE_URL`.                                                                                                                                    |
| `REDIS_URL`                    | Medusa keeps the events, the workflows, the cache, and the locks in Redis. The backend stops at startup when this key is empty.                                                                                                                                      | `redis://redis:6379`, the `redis` service of `docker-compose.yml`. When `COMPOSE_PROFILES` has no `redis`, set the URL of the managed Redis. It starts with `redis://` or `rediss://`.                                                                                                |
| `S3_BUCKET`                    | The public bucket for the product images. The backend stops at startup when this key is empty.                                                                                                                                                                       | The bucket name. See [S3 store: one-time setup](#s3-store-one-time-setup).                                                                                                                                                                                                            |
| `S3_RECEIPTS_BUCKET`           | The private bucket for the payment receipts. The receipts hold customer data.                                                                                                                                                                                        | The bucket name. It is not the same as `S3_BUCKET`, and the bucket has no public access.                                                                                                                                                                                              |
| `S3_ENDPOINT`                  | Medusa sends the S3 API requests to this URL.                                                                                                                                                                                                                        | Optional. The S3 API endpoint of the provider, with `https://`. Keep it empty for AWS S3. The AWS SDK then uses the endpoint of `S3_REGION`.                                                                                                                                          |
| `S3_FORCE_PATH_STYLE`          | `true` sends path-style requests (`<endpoint>/<bucket>`). `false` sends virtual-hosted requests (`<bucket>.<endpoint>`).                                                                                                                                             | Optional. `true` or `false`. Empty means `true`. AWS S3 with virtual-hosted URLs needs `false`. Another value stops the backend at startup.                                                                                                                                           |
| `S3_REGION`                    | The region of the two buckets.                                                                                                                                                                                                                                       | The region from the provider.                                                                                                                                                                                                                                                         |
| `S3_FILE_URL`                  | The public URL of `S3_BUCKET`. The image URLs start with this value.                                                                                                                                                                                                 | The URL from the provider, or your custom domain. It starts with `https://`.                                                                                                                                                                                                          |
| `S3_ACCESS_KEY_ID`             | Medusa uses this access key to read and write the two buckets.                                                                                                                                                                                                       | The key ID from the provider.                                                                                                                                                                                                                                                         |
| `S3_SECRET_ACCESS_KEY`         | The secret of the access key.                                                                                                                                                                                                                                        | The secret from the provider.                                                                                                                                                                                                                                                         |
| `MEDUSA_PUBLISHABLE_KEY`       | The storefront reads the store API with this key.                                                                                                                                                                                                                    | The `PUBLISHABLE_KEY` line of the seed. Keep it empty until the [first deploy](#first-deploy).                                                                                                                                                                                        |
| `SHIPPING_RATE_PER_KG`         | The shipping price in IDR for each kilogram.                                                                                                                                                                                                                         | `10000`, or your price.                                                                                                                                                                                                                                                               |
| `BANK_TRANSFER_ENABLED`        | `false` hides bank transfer from new customers. The orders from before the change finish as normal. See [Payments](#payments).                                                                                                                                       | Optional. `true` or `false`. Empty means `true`. With `false`, the project needs a gateway provider, or the backend stops at startup. Another value also stops the backend at startup.                                                                                                |
| `BANK_TRANSFER_DEADLINE_HOURS` | The hours that a customer has to pay a bank transfer order. After this time, the job `cancel-unpaid-orders` cancels an unpaid order with no receipt. The checkout, the order page, and the emails show the time.                                                     | Optional. A positive whole number. Empty means `24`. Another value stops the backend at startup.                                                                                                                                                                                      |
| `SMTP_HOST`                    | The SMTP server of the email provider. If it is empty, the store sends no email, and the `email-log` provider writes each email to the log. The exception is a project with an [HTTP API provider](email/README.md#write-an-http-api-provider) that has its key set. | The SMTP host from the provider doc. [docs/email/README.md](email/README.md) lists the provider docs.                                                                                                                                                                                 |
| `SMTP_PORT`                    | The SMTP port.                                                                                                                                                                                                                                                       | The port from the provider doc. Check that the server can open it (see [Email](#email)).                                                                                                                                                                                              |
| `SMTP_SECURE`                  | `true` for implicit TLS (port 465). `false` for STARTTLS.                                                                                                                                                                                                            | `true` or `false`.                                                                                                                                                                                                                                                                    |
| `SMTP_USER`                    | The SMTP user name.                                                                                                                                                                                                                                                  | The value from the provider doc.                                                                                                                                                                                                                                                      |
| `SMTP_PASSWORD`                | The SMTP password. For some providers, it is not the API key.                                                                                                                                                                                                        | The SMTP password from the provider doc. [Brevo](email/brevo.md) uses an SMTP key. Its API key gives the error `535`. [Amazon SES](email/amazon-ses.md) uses SMTP credentials, not the IAM secret access key.                                                                         |
| `EMAIL_FROM`                   | The sender address of the emails. When the store contact email is set, every email uses it as Reply-To, also the owner emails and `password-reset`.                                                                                                                  | An address on a domain that the provider verified. A no-reply address works only when the store contact email is set (Settings → Store). Replace the example value `no-reply@everyday.com`.                                                                                           |
| `EMAIL_FROM_NAME`              | The sender name of the emails.                                                                                                                                                                                                                                       | The store name. Use the same text as the Medusa store name. The example value `Everyday` is the name of the template store.                                                                                                                                                           |
| `STORE_OWNER_EMAIL`            | The address that gets the owner emails `new-order-owner`, `paid-cart-alert`, `receipt-uploaded`, and `low-stock-owner`. It is the fallback when the store contact email (Settings → Store) is empty.                                                                 | Your email address.                                                                                                                                                                                                                                                                   |

The Medusa store name (Settings → Store) and `brand.name` in `apps/storefront/app/app.config.ts`
must be the same text. The email wordmark uses the store name.

The next section gives the values of the S3 keys.

## S3 store: one-time setup

The template runs no S3 service in production. An S3-compatible provider stores the product images
and the payment receipts. Examples are Cloudflare R2, Amazon S3, Backblaze B2, and DigitalOcean
Spaces. Do these steps one time, before the first deploy.

1. Make the public bucket for the product images. Let the internet read its objects through a
   public URL.
2. If the provider gives a custom domain, make the DNS record that the provider asks for.
3. Put the bucket name into `S3_BUCKET`. Put the public URL into `S3_FILE_URL`.
4. Make the private bucket for the payment receipts. Do not give it public access, because the
   receipts hold customer data.
5. Put the name of the private bucket into `S3_RECEIPTS_BUCKET`.
6. Make one access key with read and write access to the two buckets.
7. Put the key ID into `S3_ACCESS_KEY_ID`. Put the secret into `S3_SECRET_ACCESS_KEY`.
8. Put the S3 API endpoint of the provider into `S3_ENDPOINT`. Put its region into `S3_REGION`.
   For AWS S3, keep `S3_ENDPOINT` empty.
9. By default, the backend sends path-style requests. If the provider accepts only virtual-hosted
   requests, set `S3_FORCE_PATH_STYLE=false`. AWS S3 with virtual-hosted URLs needs `false`.

Set `REDIS_URL` and `S3_BUCKET` before the first deploy. The backend stops at startup when one of
them is empty.

## Managed services and other proxies

The services `postgres`, `redis`, and `caddy` each have a profile with the same name.
`COMPOSE_PROFILES` in `.env` selects the profiles. The other services always start. Do not edit
`docker-compose.yml` for these choices. The file stays the same in each deploy.

Do these steps before the first deploy. To move the data of a running store to a managed service,
use the tools of the provider.

### Turn off a local service

1. Remove the profile from `COMPOSE_PROFILES`. For example, `COMPOSE_PROFILES=redis,caddy` turns
   off the `postgres` service.
2. For a managed PostgreSQL, set `DATABASE_URL` to the URL from the provider. Put the TLS mode in
   the URL as the provider documents, for example `?sslmode=require`.
3. For a managed PostgreSQL, set `DATABASE_SSL=true`. The empty value gives `false`, and `false`
   turns TLS off.
4. For a managed Redis, set `REDIS_URL` to the URL from the provider. Use `rediss://` when the
   provider requires TLS.
5. Do the check in [Check the environment file](#check-the-environment-file).

### Use a different proxy

Remove `caddy` from `COMPOSE_PROFILES`. Then set these rules in the proxy:

- Send the requests for the host of `STOREFRONT_URL` to `storefront:3000`.
- Send the requests for the host of `MEDUSA_BACKEND_URL` to `medusa-server:9000`.
- Get the HTTPS certificates for the two hosts.
- Set the header `X-Forwarded-Proto: https` on each request to the two services.
- On the backend host, add the header `X-Robots-Tag: noindex, nofollow` to each response.
- On the backend host, answer `/robots.txt` with the status 200 and this text:

  ```text
  User-agent: *
  Disallow: /
  ```

Medusa trusts one proxy hop. It reads `X-Forwarded-Proto` only from the proxy in front of it. If a
CDN is in front of the proxy, the proxy must still send `X-Forwarded-Proto: https`. If Medusa sees
`http`, it does not set the session cookie, because the cookie has the attribute `Secure`.

The `Caddyfile` shows the same rules. The template has no configuration file for other proxies.

### Use a proxy on the host

A proxy in the same Compose network, for example a Traefik container, gets the services by name.
It needs no published port. A proxy on the host, for example Nginx from the OS packages, needs
published ports. With no `caddy` profile, no service publishes a port.

Publish the ports on `127.0.0.1` only. Docker opens a published port also through the firewall,
so a port on all addresses lets the internet go around the proxy.

1. Make the file `docker-compose.override.yml` in the directory of the repository, with this text.
   Compose reads this file by itself, together with `docker-compose.yml`. The template has no
   override file.

```yaml
services:
  storefront:
    ports:
      - "127.0.0.1:3000:3000"
  medusa-server:
    ports:
      - "127.0.0.1:9000:9000"
```

2. In the proxy, send the storefront host to `127.0.0.1:3000` and the backend host to
   `127.0.0.1:9000`. Use the other rules of [Use a different proxy](#use-a-different-proxy).

## Check the environment file

Do this check before the first deploy. Do it again after each change to `.env`. A bad value can
start the services with a broken configuration.

1. Find the example values that you did not replace. The command must print nothing.

```bash
grep -nE 'change-me|example\.com|everyday\.com' .env
```

2. Make sure that Compose can read the file. The command must print nothing.

```bash
docker compose config --quiet
```

3. Make sure that each value obeys these rules:
   - Each key in the table of [Environment file](#environment-file) has a value, except the
     optional keys. `MEDUSA_PUBLISHABLE_KEY` stays empty until the first deploy.
   - `COMPOSE_PROFILES` is present.
   - When `COMPOSE_PROFILES` has no `postgres`, `DATABASE_URL` has a value.
   - When `COMPOSE_PROFILES` has no `redis`, `REDIS_URL` points at the managed Redis.
   - The keys of an HTTP API provider are in the table only in a project that uses the provider.
     In that project, they have values, and the `SMTP_` keys keep their values. In a project that
     sends over SMTP, the key that selects the provider stays empty. Do not write `change-me` in
     it. See [Write an HTTP API provider](email/README.md#write-an-http-api-provider).
   - No value contains `$` or `` ` ``.
   - No value contains a space before a `#`. Compose reads the text after ` #` as a comment.
   - No line ends with a space. Save the file with Unix line ends, not Windows line ends.
   - `DOMAIN` contains only lowercase letters, digits, `.`, and `-`. An example is `store.id`.
   - `STOREFRONT_URL` and `MEDUSA_BACKEND_URL` are empty, or start with `https://`. They have no
     path and no slash at the end.
   - The hosts of the two URLs are on the same site, for example `www.shop.com` and
     `admin.shop.com`. The session cookie needs this.
   - `POSTGRES_PASSWORD` contains only letters, digits, `-`, and `_`. The database URL contains
     the password without URL encoding.
   - `JWT_SECRET` and `COOKIE_SECRET` have 32 characters or more. They are not `supersecret`, the
     development value.
   - `REDIS_URL` starts with `redis://` or `rediss://`.
   - `S3_FILE_URL` starts with `https://`.
   - `S3_RECEIPTS_BUCKET` is not the same as `S3_BUCKET`.
   - `S3_RECEIPTS_BUCKET` names a bucket with no public access.
   - `SESSION_TTL_HOURS` and `BANK_TRANSFER_DEADLINE_HOURS` are empty, or a positive whole number.
   - `BANK_TRANSFER_ENABLED` and `S3_FORCE_PATH_STYLE` are empty, `true`, or `false`.
   - `SMTP_SECURE` is `true` or `false`. Port 465 needs `true`.
   - `SMTP_HOST` is not `localhost`. Mailpit is only for development.

## First deploy

Run the commands one at a time. If a command fails, stop and do not run the next commands.

Go to the directory of the repository, and set the Compose command. Compose reads
`docker-compose.yml` and `.env` from the directory, so `$C` needs no options.

```bash
cd /srv/store
C="docker compose"
```

The later sections also use `$C`. Set it again in each new shell.

1. Do the check in [Check the environment file](#check-the-environment-file).
2. Build the backend image. The first build can take many minutes.

```bash
$C build medusa-server
```

3. Build the storefront image. Build one image at a time, because two builds use too much memory.

```bash
$C build storefront
```

4. Run the migrations. Compose first starts the `postgres` and `redis` services, if
   `COMPOSE_PROFILES` has their profiles.

```bash
$C run --rm -T medusa-server npx medusa db:migrate --execute-safe-links
```

5. Start all services.

```bash
$C up -d --remove-orphans
```

6. Seed the store. The seed makes the region, the shipping option, three sample products, a sample
   bank account, a sample store contact, and the publishable API key.

```bash
$C exec -T medusa-server npx medusa exec ./src/scripts/seed.js | grep PUBLISHABLE_KEY
```

The command prints a line `PUBLISHABLE_KEY=pk_...`.

7. Put the key into `MEDUSA_PUBLISHABLE_KEY` in `.env`. Then start the storefront again, so
   that it reads the key.

```bash
$C up -d storefront
```

8. Make the admin user of the dashboard.

```bash
$C exec -T medusa-server npx medusa user -e <admin email> -p <admin password>
```

9. Make sure that the health route answers `OK`.

```bash
curl -s https://api.<domain>/health
```

10. Open these two addresses in a browser:
    - `https://<domain>` shows the products.
    - `https://api.<domain>/app` shows the login page of the dashboard.

## Deploy a new version

Run the commands one at a time. If a command fails, stop and do not run the next commands. The old
version stays in operation until step 6, because only step 6 replaces the containers.

1. Go to the directory of the repository, and set the Compose command.

```bash
cd /srv/store
C="docker compose"
```

2. Pull the new version.

```bash
git pull --ff-only
```

3. Look for new keys in `.env.example`. If the command shows a new key, add the key to `.env`. Then
   do the check in [Check the environment file](#check-the-environment-file).

```bash
git diff ORIG_HEAD HEAD -- .env.example
```

4. Build the two images, one at a time. Two builds at the same time use too much memory.

```bash
$C build medusa-server
$C build storefront
```

5. Run the migrations.

```bash
$C run --rm -T medusa-server npx medusa db:migrate --execute-safe-links
```

6. Start the services with the new images. The second command makes the `caddy` container again,
   so that it reads the new `Caddyfile`. It does this only when `COMPOSE_PROFILES` has `caddy`.

```bash
$C up -d --remove-orphans
$C config --services | grep -qx caddy && $C up -d --no-deps --force-recreate caddy
```

7. Remove the old images. This step frees disk space. A failure here does not affect the store.

```bash
docker image prune -f
```

If a step fails, read the log of the backend.

```bash
$C logs -f --tail 100 medusa-server
```

## Payments

Bank transfer is the payment method of the store. The seed adds a sample bank account and a sample
store contact. Replace them before you sell.

1. Sign in to the Admin and open **Settings → Store**.
2. In the **Contact** section, replace the seed contact "store@example.com" and "+6281234567890"
   with the real contact.
3. Add the phone and the address, if the store has them. Write each number with `+` and the
   country code, for example `+62 812 3456 7890`.
4. In the **Social links** section, add the links of the store, for example Instagram or Shopee.
5. Open **Settings → Bank transfer**.
6. Replace the seed account "Sample Bank" `1234567890` with a real account, or mark it inactive.
7. Make one real order with a small amount. Make sure that the order page shows the real account.

To add a payment gateway, read `docs/payments/`.

### Turn off bank transfer

`BANK_TRANSFER_ENABLED=false` hides bank transfer from new customers. The orders from before the
change finish as normal. Staff can accept or cancel them, and the job `cancel-unpaid-orders`
cancels them after the deadline. The backend stops at startup when bank transfer is off and no
gateway provider is registered.

1. Set `BANK_TRANSFER_ENABLED=false` in `.env`.
2. Do the check in [Check the environment file](#check-the-environment-file).
3. Start the services again, so that they read the new value.

```bash
$C up -d
```

4. If the seed ran with bank transfer on, the region still has the bank transfer provider. In the
   Admin, open **Settings → Regions**, edit the region, and remove bank transfer from **Payment
   Providers**. The checkout does not show bank transfer, but a customer can start a bank transfer
   payment through the API while the region has the provider.

### The payment deadline

`BANK_TRANSFER_DEADLINE_HOURS` sets the time that a customer has to pay a bank transfer order. The
default is 24 hours. The checkout, the order page, the `order-placed` email, and the job
`cancel-unpaid-orders` use the value.

The deadline of an order is the order time plus the current value. Thus a change applies also to
the open orders. Their `order-placed` emails keep the old deadline, because the backend sent the
emails before the change.

## Orders

Staff do these steps in the Admin, on the order page.

1. For a bank transfer order, check the receipts in the widget **Payment receipts**.
2. Click **Accept payment** when the money is in the bank account. The customer gets the
   `payment-confirmed` email.
3. Click **Create Fulfillment**.
4. Click **Mark as shipped**, and add the tracking number. The customer gets the `order-shipped`
   email. If you turn off **Send notification**, the customer gets no email.
5. Mark the fulfillment as delivered when the parcel arrives (**Mark as delivered**). The
   delivered email and the review request depend on this step.

To cancel an unpaid bank transfer order, click **Cancel order** in the widget **Payment
receipts**. The drawer takes an optional note of at most 500 characters. The note goes into the
`order-cancelled` email. The cancel in the Medusa order menu sends the same email with no note.

Return the money within two working days after you cancel a paid bank transfer order. The
`order-cancelled` email promises this time to the customer. Medusa records the refund, but it does
not move the money.

The `medusa-worker` service runs the scheduled jobs. The schedules are in UTC, and WIB is UTC+7.

| Job                    | Schedule                          | Task                                                                                                                        |
| ---------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `check-paid-carts`     | Every 15 minutes                  | Completes a paid gateway cart that has no order. With no gateway, the job does nothing.                                     |
| `cancel-unpaid-orders` | Every 15 minutes                  | Cancels a bank transfer order with no receipt and no captured payment after `BANK_TRANSFER_DEADLINE_HOURS` (24 by default). |
| `review-requests`      | Daily at 03:00 WIB (`0 20 * * *`) | Sends the review request 7 days after the delivery, for the products that have no review.                                   |
| `wishlist-price-drops` | Daily at 04:00 WIB (`0 21 * * *`) | Sends one email to each customer with a lower price on a wishlist item.                                                     |

The `review-requests` job reads only the deliveries of 7 to 37 days ago. An order with a delivery
more than 37 days before a run never gets a review request, for example after the worker stops
for a month.

The `wishlist-price-drops` job checks at most 500 wishlist items in each run. With more items, it
checks the next 500 items on the next day.

The "Low stock threshold" at **Settings → Storefront** controls the limited stock badge and the
`low-stock-owner` email. The owner gets one email when the stock of a variant goes down to the
threshold or below. The value 0 turns off the badge and the email.

## SEO

The storefront makes the head tags, the JSON-LD, `/sitemap.xml`, and `/robots.txt`. It makes the
absolute URLs from `NUXT_PUBLIC_SITE_URL`. `docker-compose.yml` sets this key to
`STOREFRONT_URL`, by default `https://<domain>`, so `.env` needs no new key.

- The storefront keeps `/sitemap.xml` in a cache for 1 hour. Thus a new product can be missing
  from the sitemap for at most 1 hour.
- If the backend fails, `/sitemap.xml` returns the status 503.
- The backend host (by default `api.<domain>`) sends `X-Robots-Tag: noindex, nofollow`. Its
  `robots.txt` blocks all paths. Thus search engines do not index the API or the dashboard.
  `Caddyfile` sets these rules. A different proxy must set them too. See
  [Use a different proxy](#use-a-different-proxy).

Do these steps one time, for the launch of the store.

1. Replace `apps/storefront/public/og-default.jpg` (1200×630) and `logo.png` before the launch.
   - `og-default.jpg` is the default share image. Keep the size of 1200×630.
   - The template image has the English tagline "Made for every day". The same image serves the
     two locales.
   - `logo.png` is the logo in the JSON-LD of the home page. Use a square image of 112×112 px or
     more.
   - The images are part of the storefront image. Build the storefront image again after a
     change.
2. Add the site to Google Search Console.
3. Send `https://<domain>/sitemap.xml` in Search Console.
4. Set the shipping policy and the return policy in Search Console or Merchant Center. The
   template gives only a link to the Returns page.
5. Optional: add a `www` redirect. This step applies to the `caddy` profile, when the storefront
   host is `<domain>`. For a different proxy, add the redirect in the proxy. First add a DNS record
   for `www.<domain>`. Then add this site block to the `Caddyfile`.

   ```caddy
   www.{$DOMAIN} {
   	redir {$STOREFRONT_URL}{uri} permanent
   }
   ```

   Make the `caddy` container again, as in step 6 of [Deploy a new version](#deploy-a-new-version).

6. Upload product photos at about 1200 px wide. WhatsApp can skip a large preview image.

## Email

[docs/email/README.md](email/README.md) gives the SMTP values, the DNS records, and the dashboard
settings for each provider.

Do these steps before you sell.

1. Make sure that the server can open the SMTP port. Run this command on the server. The output
   must show a successful connection.

```bash
nc -vz <SMTP_HOST> <SMTP_PORT>
```

Some VPS hosts block the ports 25, 465, and 587 on new accounts. If the port is blocked, do one of
these steps:

- Use the second port of the provider, if the provider has one. Section 5 of the provider doc
  gives it.
- Ask the host to open the port.
- Write an HTTP API provider. See
  [Write an HTTP API provider](email/README.md#write-an-http-api-provider).

[Cloudflare](email/cloudflare.md) has only port 465. If the host does not open it, use the HTTP
API.

The section [SMTP port check](email/README.md#smtp-port-check) of the README also checks the TLS
connection.

2. Turn off click tracking and open tracking in the provider dashboard. Click tracking changes the
   sign-in link.
3. Sign in to the store with a magic link. Make sure that the link in the email opens the store
   URL.

## Backups

Use the backups of the provider for a managed PostgreSQL. The `pg_dump` and `psql` steps in this
section and in [Restore](#restore) apply only to the `postgres` profile.

A backup is a directory `backups/<time>` with one file, `database.sql.gz`. This file is a dump of
the database. The database holds customer data. Keep each copy of the backup private, and do not
put it in a place that the internet can read.

The S3 provider keeps the product images and the payment receipts. This procedure does not copy
them. Turn on the versioning or the backup feature of the provider for the two buckets.

Keep a copy of each backup on a different server. A backup only on the store server is lost with
the server. In this section, `<backup target>` is the `rsync` target on that server, for example
`backup@backup.example.com:/srv/backups/store`.

Do the backup by hand, or run the same commands from a scheduler of your choice, for example cron.

### Prepare the backup target

Do these steps one time.

1. Make an SSH key without a passphrase. A scheduled backup cannot type a passphrase.

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
```

2. Install the key on the backup server. Accept the host key when SSH asks.

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub <user>@<backup host>
```

### Make a backup

Run the commands one at a time. If a command fails, stop, and find the cause before you continue.

1. Go to the directory of the repository. Set the Compose command and the name of the backup.

```bash
cd /srv/store
C="docker compose"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "backups/$STAMP"
```

2. Dump the database. The dump removes each table before it makes the table again, so a restore
   replaces the current data. This step needs the `postgres` profile.

```bash
$C exec -T postgres pg_dump -U postgres --clean --if-exists medusa-store > "backups/$STAMP/database.sql"
```

3. Make sure that the dump is not empty. An empty file means that the dump failed.

```bash
ls -lh "backups/$STAMP/database.sql"
gzip "backups/$STAMP/database.sql"
```

4. Copy the backup to the backup server.

```bash
rsync -a "backups/$STAMP" <backup target>/
```

5. Remove the local copies that are older than 7 days. Do this step only after a complete copy in
   step 4.

```bash
find backups -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
```

The operator of the backup server sets the time limit for the copies there.

## Restore

Stop the services that write data before you restore. A write during the restore can mix old data
and new data. Set `C` as in [First deploy](#first-deploy).

This procedure applies only to the `postgres` profile. For a managed PostgreSQL, use the restore
of the provider.

1. Copy the backup back to the server, if the local copy does not exist. `<time>` is the name of
   the backup directory.

```bash
cd /srv/store
mkdir -p backups
rsync -a <backup target>/<time> backups/
```

2. Stop the services. Then start the `postgres` service, because the restore of the database
   needs it.

```bash
$C stop medusa-server medusa-worker storefront
$C up -d --wait postgres
```

3. Restore the database. The dump removes each table before it makes the table again.

```bash
gunzip -c backups/<time>/database.sql.gz | $C exec -T postgres psql -U postgres -d medusa-store
```

4. Start all services.

```bash
$C up -d
```

## Cookies and CORS

`docker-compose.yml` makes these values from `STOREFRONT_URL` and `MEDUSA_BACKEND_URL`. You do not
set them in `.env`.

| Key          | Value                                                   |
| ------------ | ------------------------------------------------------- |
| `STORE_CORS` | `STOREFRONT_URL`, by default `https://<domain>`         |
| `ADMIN_CORS` | `MEDUSA_BACKEND_URL`, by default `https://api.<domain>` |
| `AUTH_CORS`  | The two values, with a comma between them               |

Medusa sets the session cookie `connect.sid` for the host of `MEDUSA_BACKEND_URL`. The cookie has
the attributes `HttpOnly`, `Secure`, and `SameSite=Lax`. Medusa trusts the proxy, so it sets
`Secure` behind the proxy. The browser sends the cookie from the storefront, because the two hosts
are on the same site.

Keep the two hosts on the same site, for example `www.shop.com` and `admin.shop.com`. The template
does not support cross-site hosting. The cookie then needs `SameSite=None`, and `SameSite=None`
brings back the CSRF problem of GHSA-jhvc-qx3m-6r3q.

The session is rolling. Each request starts the time again. The session ends after
`SESSION_TTL_HOURS` hours with no activity. The default is 168 hours (7 days).

Admin users share the session setting. Thus an Admin user also stays signed in for 7 days with no
activity. On a shared computer, sign out after the work, or set a smaller value.

A change of `DOMAIN` or `MEDUSA_BACKEND_URL` needs a new build of the backend image, because the
dashboard gets its API address at build time. Do steps 4 to 6 of
[Deploy a new version](#deploy-a-new-version). After a change of a host, also do these tasks:

- Change the DNS records.
- If the public URL of the image bucket changes, set the new URL in `S3_FILE_URL`. See
  [S3 store: one-time setup](#s3-store-one-time-setup).
