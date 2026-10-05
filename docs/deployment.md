# Deployment

This procedure installs the store on one server with Docker Compose. Do the sections in sequence
for the first deploy. In this document, `<domain>` is the domain of the store, for example
`example.com`.

## Server

- 2 vCPU and 4 GB of RAM or more, with Ubuntu 24.04 or a different current Linux.
- Docker Engine with the Compose plugin, `git`, and `rsync`.
- Open ports: 22, 80, and 443 (TCP), and 443 (UDP).
- A second server or a storage service that accepts `rsync` through SSH, for the backups.

The commands in this document run as a user in the `docker` group. Only the swap file and the
removal of old backups need `sudo`.

## DNS records

Make an A record for each of the three names. Each record points to the server address.

| Name              | Service                      |
| ----------------- | ---------------------------- |
| `<domain>`        | Storefront                   |
| `api.<domain>`    | Medusa API and the dashboard |
| `assets.<domain>` | Product images               |

Make the records before the first deploy. Caddy gets the HTTPS certificates when it starts, and the
certificate authority must find the server through these records.

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

The file `.env` holds the domain and the secrets. The Compose file makes all other values from
it. The file is not in git.

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

3. Open `.env` in an editor, and set the values of the table below.

Do not use the characters `$` and `` ` `` in a value. Compose can expand these characters.

| Key                      | Purpose                                                                                   | Value                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DOMAIN`                 | The storefront host. The Compose file makes `api.<domain>` and `assets.<domain>` from it. | The host name only, for example `example.com`. Do not add `https://` or a path.                     |
| `ACME_EMAIL`             | Caddy gives this address to the certificate authority.                                    | Your email address.                                                                                 |
| `POSTGRES_PASSWORD`      | The password of the database user `postgres`.                                             | `openssl rand -hex 32`. Use only letters, digits, `-`, and `_`.                                     |
| `JWT_SECRET`             | Medusa signs the authentication tokens with this secret.                                  | `openssl rand -hex 32`. Use 32 characters or more.                                                  |
| `COOKIE_SECRET`          | Medusa signs the session cookie with this secret.                                         | `openssl rand -hex 32`. Use 32 characters or more.                                                  |
| `GARAGE_RPC_SECRET`      | The RPC secret of Garage.                                                                 | `openssl rand -hex 32`.                                                                             |
| `GARAGE_ADMIN_TOKEN`     | The token of the Garage admin API.                                                        | `openssl rand -hex 32`.                                                                             |
| `GARAGE_METRICS_TOKEN`   | The token of the Garage metrics endpoint.                                                 | `openssl rand -hex 32`.                                                                             |
| `S3_ACCESS_KEY_ID`       | Medusa uses this Garage key to write the product images.                                  | The `Key ID` from `key create`. See [Garage: one-time commands](#garage-one-time-commands).         |
| `S3_SECRET_ACCESS_KEY`   | The secret of the Garage key.                                                             | The `Secret key` from `key create`. See [Garage: one-time commands](#garage-one-time-commands).     |
| `MEDUSA_PUBLISHABLE_KEY` | The storefront reads the store API with this key.                                         | The `PUBLISHABLE_KEY` line of the seed. Keep it empty until the [first deploy](#first-deploy).      |
| `SHIPPING_RATE_PER_KG`   | The shipping price in IDR for each kilogram.                                              | `10000`, or your price.                                                                             |
| `BREVO_API_KEY`          | The backend sends the order emails through Brevo with this key.                           | A key from the Brevo dashboard.                                                                     |
| `BREVO_SENDER_EMAIL`     | The sender address of the emails.                                                         | An address that Brevo verified for your account.                                                    |
| `BREVO_SENDER_NAME`      | The sender name of the emails.                                                            | The name of the store.                                                                              |
| `STORE_OWNER_EMAIL`      | The address that gets the `paid-cart-alert` email.                                        | Your email address.                                                                                 |
| `MAYAR_API_URL`          | The address of the Mayar API.                                                             | The sandbox, `https://api.mayar.io/hl/v2`. For real payments, see [Live payments](#live-payments).  |
| `MAYAR_API_KEY`          | The key of the Mayar API.                                                                 | A sandbox key from `web.mayar.io/api-keys`. For real payments, see [Live payments](#live-payments). |

Set all values now, but keep the example values of `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.
The next section gives these two values.

## Garage: one-time commands

Garage stores the product images. Do these steps one time, before the first deploy.

1. Set the Compose command, and start Garage. Compose reads `docker-compose.yml` and `.env` from the
   directory, so `$C` needs no options. The later sections also use `$C`, so set it again in each
   new shell.

```bash
cd /srv/store
C="docker compose"
$C up -d garage
```

2. Set the Garage command, and show the status. Wait some seconds after the start of Garage.

```bash
G="$C exec -T garage /garage"
$G status
```

The `$G` commands write Garage `INFO` log lines to the standard error. Add `2>/dev/null` to a
command to get a clean output.

3. Find the node ID in the status output. The node has the text `NO ROLE ASSIGNED`.

```bash
NODE=$($G status 2>/dev/null | awk '/NO ROLE ASSIGNED/ {print $1}')
echo "$NODE"
```

4. Give the node a role, and apply the layout. The capacity `1G` is a weight for the layout, not a
   limit.

```bash
$G layout assign -z dc1 -c 1G "$NODE"
$G layout apply --version 1
```

5. Make the bucket, and let the web endpoint serve it. The alias lets Garage find the bucket from
   the host `assets.<domain>`.

```bash
$G bucket create store-assets
$G bucket website --allow store-assets
$G bucket alias store-assets assets.<domain>
```

6. Make the key of the application, and give it access to the bucket.

```bash
$G key create medusa-app-key
$G bucket allow --read --write --owner store-assets --key medusa-app-key
```

7. Put the values that `key create` printed into `.env`:
   - Put the `Key ID` into `S3_ACCESS_KEY_ID`.
   - Put the `Secret key` into `S3_SECRET_ACCESS_KEY`.

## Check the environment file

Do this check before the first deploy. Do it again after each change to `.env`. A bad value can
start the services with a broken configuration.

1. Find the example values that you did not replace. The command must print nothing.

```bash
grep -nE 'change-me|example\.com' .env
```

2. Make sure that Compose can read the file. The command must print nothing.

```bash
docker compose config --quiet
```

3. Make sure that each value obeys these rules:
   - Each key in the table of [Environment file](#environment-file) has a value. Only
     `MEDUSA_PUBLISHABLE_KEY` stays empty until the first deploy.
   - No value contains `$` or `` ` ``.
   - No value contains a space before a `#`. Compose reads the text after ` #` as a comment.
   - No line ends with a space. Save the file with Unix line ends, not Windows line ends.
   - `DOMAIN` contains only lowercase letters, digits, `.`, and `-`. An example is `store.id`.
   - `POSTGRES_PASSWORD` contains only letters, digits, `-`, and `_`. The database URL contains
     the password without URL encoding.
   - `JWT_SECRET` and `COOKIE_SECRET` have 32 characters or more. They are not `supersecret`, the
     development value.

`MAYAR_API_URL` can stay the sandbox address for the first deploy. Then the store accepts only
sandbox payments. See [Live payments](#live-payments).

## First deploy

Run the commands one at a time in `/srv/store`. If a command fails, stop and do not run the next
commands. Set `C` as in step 1 of [Garage: one-time commands](#garage-one-time-commands).

1. Do the check in [Check the environment file](#check-the-environment-file).
2. Build the backend image. The first build can take many minutes.

```bash
$C build medusa-server
```

3. Build the storefront image. Build one image at a time, because two builds use too much memory.

```bash
$C build storefront
```

4. Run the migrations. Compose starts PostgreSQL, Redis, and Garage first.

```bash
$C run --rm -T medusa-server npx medusa db:migrate --execute-safe-links
```

5. Start all services.

```bash
$C up -d --remove-orphans
```

6. Seed the store. The seed makes the region, the shipping option, three sample products, and the
   publishable API key.

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

6. Start the services with the new images. The second command makes the `caddy` and `garage`
   containers again, so that they read the new `Caddyfile` and `garage.toml`.

```bash
$C up -d --remove-orphans
$C up -d --no-deps --force-recreate caddy garage
```

7. Remove the old images. This step frees disk space. A failure here does not affect the store.

```bash
docker image prune -f
```

If a step fails, read the log of the backend.

```bash
$C logs -f --tail 100 medusa-server
```

## Live payments

Do these steps after a check of the store with the Mayar sandbox.

1. Set these lines in `.env`. The live key is at `web.mayar.id/api-keys`.

```bash
MAYAR_API_URL=https://api.mayar.id/hl/v2
MAYAR_API_KEY=<the key from web.mayar.id/api-keys>
```

2. Restart the backend.

```bash
$C up -d medusa-server medusa-worker
```

3. In the Mayar dashboard, set the webhook URL to
   `https://api.<domain>/hooks/payment/mayar_mayar`.
4. Make one real order with a small amount. Make sure that the order shows in the dashboard.

## Backups

A backup is a directory `backups/<time>` with two files:

- `database.sql.gz` is a dump of the database.
- `garage.tar.gz` is an archive of the Garage directories `meta/` and `data/`. Garage keeps small
  objects in its metadata database, so the archive must have the two directories.

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
   replaces the current data.

```bash
$C exec -T postgres pg_dump -U postgres --clean --if-exists medusa-store > "backups/$STAMP/database.sql"
```

3. Make sure that the dump is not empty. An empty file means that the dump failed.

```bash
ls -lh "backups/$STAMP/database.sql"
gzip "backups/$STAMP/database.sql"
```

4. Stop Garage, and make the archive. Garage must stop, because a copy of a database file that
   changes can be unusable. The product images are not available for some seconds.

```bash
$C stop garage
docker run --rm -v store_garage-meta:/meta:ro -v store_garage-data:/data:ro \
  -v "$PWD/backups/$STAMP:/backup" alpine:3 tar czf /backup/garage.tar.gz -C / meta data
```

5. Start Garage again. Do this step also when the archive command fails.

```bash
$C start garage
```

6. Copy the backup to the backup server.

```bash
rsync -a "backups/$STAMP" <backup target>/
```

7. Remove the local copies that are older than 7 days. Do this step only after a complete copy in
   step 6. Use `sudo`, because the `alpine` container makes `garage.tar.gz` as the root user.

```bash
sudo find backups -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
```

The operator of the backup server sets the time limit for the copies there.

## Restore

Stop the services that write data before you restore. A write during the restore can mix old data
and new data. Set `C` as in step 1 of [Garage: one-time commands](#garage-one-time-commands).

1. Copy the backup back to the server, if the local copy does not exist. `<time>` is the name of
   the backup directory.

```bash
cd /srv/store
mkdir -p backups
rsync -a <backup target>/<time> backups/
```

2. Stop the services. Then start PostgreSQL, because the restore of the database needs it.

```bash
$C stop medusa-server medusa-worker storefront garage
$C up -d --wait postgres
```

3. Restore the database. The dump removes each table before it makes the table again.

```bash
gunzip -c backups/<time>/database.sql.gz | $C exec -T postgres psql -U postgres -d medusa-store
```

4. Restore the Garage data. The command removes the current Garage data first.

```bash
docker run --rm -v store_garage-meta:/meta -v store_garage-data:/data \
  -v "$PWD/backups/<time>:/backup:ro" alpine:3 \
  sh -c "rm -rf /meta/* /data/* && tar xzf /backup/garage.tar.gz -C /"
```

5. Start all services.

```bash
$C up -d
```

## Cookies and CORS

`docker-compose.yml` makes these values from `DOMAIN`. You do not set them in `.env`.

| Key          | Value                                   |
| ------------ | --------------------------------------- |
| `STORE_CORS` | `https://<domain>`                      |
| `ADMIN_CORS` | `https://api.<domain>`                  |
| `AUTH_CORS`  | `https://<domain>,https://api.<domain>` |

Medusa sets the session cookie `connect.sid` for `api.<domain>`. The cookie has the attributes
`HttpOnly`, `Secure`, and `SameSite=Lax`. Medusa trusts the proxy, so it sets `Secure` behind Caddy.
The browser sends the cookie from `<domain>`, because `<domain>` and `api.<domain>` are the same
site.

A change of `DOMAIN` needs a new build of the backend image, because the dashboard gets its API
address at build time. Do steps 4 to 6 of [Deploy a new version](#deploy-a-new-version). After a
change of `DOMAIN`, also do these tasks:

- Change the three DNS records.
- Add the alias of the new asset host with `$G bucket alias store-assets assets.<domain>`. Set `C`
  and `G` as in steps 1 and 2 of [Garage: one-time commands](#garage-one-time-commands).
