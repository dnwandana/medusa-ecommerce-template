# Development setup

This document prepares a development environment from an empty machine. Each step uses one
command, so you can see what each step does. Run all commands from the repository root.

## Requirements

- Node 24.21.0 or higher. The file `.nvmrc` names the major version, 24. If you use nvm, run
  `nvm install` and then `nvm use` in the repository root.
- pnpm 10.11.1. Run `corepack enable` to get the version from `package.json`.
- PostgreSQL 16 or higher.
- Redis 7 or higher. Redis is optional, but production uses it.
- Garage v2.4.1. It stores the product images, as in production.

You can get PostgreSQL, Redis, and Garage from one of these sources:

- Your own containers or a local install.
- The `docker-compose.local.yml` file of this project. Run
  `docker compose -f docker-compose.local.yml up -d --wait`. This starts PostgreSQL with the user
  `postgres`, the password `postgres`, and the database `medusa-store`. It also starts Redis, and
  Garage on the ports 3900 and 3902.

The Compose services use the ports 5432, 6379, 3900, and 3902. Do not start them while other
containers or programs use the same ports.

## 1. Install the dependencies

```bash
pnpm install
```

The install also runs `nuxt prepare` for the storefront.

## 2. Prepare the database

Skip this step if you use the Compose services. They create the database `medusa-store`.

Create an empty database for the store. The examples use the user `user` and the database
`medusa_ecommerce_template`. Use your own values.

With `psql` on your machine:

```bash
psql "postgres://user:password@localhost:5432/postgres" -c 'CREATE DATABASE medusa_ecommerce_template'
```

With `psql` in a container that has the name `postgres`:

```bash
docker exec postgres psql -U user -d postgres -c 'CREATE DATABASE medusa_ecommerce_template'
```

## 3. Prepare Garage

Garage stores the product images. The backend does not start without a Garage key. The commands
use the Compose service `garage`, so start the Compose services first.

Do this step one time. Garage keeps the bucket and the key in its volumes.

1. Set the Compose command and the Garage command. Set them again in each new shell.

```bash
C="docker compose -f docker-compose.local.yml"
G="$C exec -T garage /garage"
```

The `$G` commands write Garage `INFO` log lines to the standard error. Add `2>/dev/null` to a
command to get a clean output.

2. Find the node ID in the status output. The node has the text `NO ROLE ASSIGNED`.

```bash
NODE=$($G status 2>/dev/null | awk '/NO ROLE ASSIGNED/ {print $1}')
echo "$NODE"
```

3. Give the node a role, and apply the layout. The capacity `1G` is a weight for the layout, not a
   limit.

```bash
$G layout assign -z dc1 -c 1G "$NODE"
$G layout apply --version 1
```

4. Make the bucket, and let the web endpoint serve it. The browser uses the alias in the address
   `http://assets.localhost:3902`. Browsers and `curl` resolve `*.localhost` with no change to the
   hosts file.

```bash
$G bucket create store-assets
$G bucket website --allow store-assets
$G bucket alias store-assets assets.localhost
```

5. Make the key of the application, and give it access to the bucket.

```bash
$G key create medusa-app-key
$G bucket allow --read --write --owner store-assets --key medusa-app-key
```

6. Copy the two values that `key create` printed. In
   [step 4](#4-set-the-backend-environment), you put them into `apps/backend/.env`:
   - The `Key ID` goes into `S3_ACCESS_KEY_ID`.
   - The `Secret key` goes into `S3_SECRET_ACCESS_KEY`.

7. Check the alias. Open `http://assets.localhost:3902/` in a browser, or use `curl`.

```bash
curl -s http://assets.localhost:3902/
```

A Garage `404` page with `NoSuchKey` shows that the alias works. A page without `NoSuchKey` shows
that Garage did not find the bucket.

## 4. Set the backend environment

Copy the example file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Then set the database URL in `apps/backend/.env`. The format is
`postgres://<user>:<password>@<host>:<port>/<database>`.

```
DATABASE_URL=postgres://user:password@localhost:5432/medusa_ecommerce_template
```

Then set the two Garage key values from step 3 in `apps/backend/.env`. The backend does not start
while one of the two keys is empty.

```
S3_ACCESS_KEY_ID=<Key ID>
S3_SECRET_ACCESS_KEY=<Secret key>
```

The other keys have development values in the example file. This table shows the keys that you
can change in development.

| Key                    | Development value              | Note                                                                       |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `DATABASE_URL`         | your database                  | Required.                                                                  |
| `DATABASE_SSL`         | empty                          | Set `false` only if Medusa cannot connect because the server has no TLS.   |
| `REDIS_URL`            | `redis://localhost:6379`       | If it is empty, Medusa uses its in-memory modules.                         |
| `MAYAR_API_KEY`        | empty                          | Required for checkout. See "Mayar payments" in `apps/backend/README.md`.   |
| `BREVO_API_KEY`        | empty                          | If it is empty, the backend writes each email to the log.                  |
| `STORE_OWNER_EMAIL`    | empty                          | If it is empty, the backend writes the `paid-cart-alert` email to the log. |
| `S3_BUCKET`            | `store-assets`                 | If it is empty, Medusa keeps the product images in local storage.          |
| `S3_FILE_URL`          | `http://assets.localhost:3902` | The Garage web endpoint with the bucket alias.                             |
| `S3_REGION`            | `garage`                       | The region in `garage.toml`.                                               |
| `S3_ENDPOINT`          | `http://localhost:3900`        | The Garage S3 API.                                                         |
| `S3_ACCESS_KEY_ID`     | empty                          | Required. The `Key ID` from step 3.                                        |
| `S3_SECRET_ACCESS_KEY` | empty                          | Required. The `Secret key` from step 3.                                    |

`apps/backend/README.md` has the full list of the backend keys.

## 5. Run the database migrations

```bash
pnpm --filter @store/backend exec medusa db:migrate
```

The command creates the tables of Medusa and of the custom modules. Run it again each time that
you pull new migrations. To check the result, count the tables:

```bash
docker exec postgres psql -U user -d medusa_ecommerce_template -Atc \
  "select count(*) from information_schema.tables where table_schema = 'public'"
```

## 6. Seed the store data

```bash
pnpm --filter @store/backend seed
```

The seed creates these records:

- The sales channel "Default Sales Channel" and the store currency IDR.
- The region "Indonesia" with the Mayar payment provider.
- The stock location, the shipping profile, and the shipping option for Indonesia.
- Three sample products.
- The publishable API key "Storefront", with a link to the sales channel.

The seed looks for each record before it creates the record. Thus you can run it again. A second
run creates no records and prints the same key.

The last line of the output has the publishable key:

```
PUBLISHABLE_KEY=pk_...
```

Copy the key. You need it in step 8. If you lose the key, get it again in one of these ways:

- Run the seed again.
- Open the admin dashboard, then **Settings**, then **Publishable API Keys**.
- Read it from the database:

  ```bash
  docker exec postgres psql -U user -d medusa_ecommerce_template -Atc \
    "select token from api_key where type = 'publishable' and revoked_at is null"
  ```

## 7. Create the admin user

```bash
pnpm --filter @store/backend exec medusa user -e admin@example.com -p supersecret
```

Use your own email and password. If the user exists, the command prints
`User with email: ... already exists.` You can ignore this message.

Change the password before you use this project for a real store.

## 8. Set the storefront environment

Copy the example file:

```bash
cp apps/storefront/.env.example apps/storefront/.env
```

Then set the publishable key from step 6 in `apps/storefront/.env`:

```
NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
```

The two URL keys have the correct development value, `http://localhost:9000`.

## 9. Start the backend and the storefront

Start the backend in one terminal:

```bash
pnpm --filter @store/backend dev
```

Start the storefront in a second terminal:

```bash
pnpm --filter @store/storefront dev
```

You can also start the two apps in one terminal with `pnpm dev`. The output of the two apps is
then mixed.

Check the result:

| Address                      | Expected result                                          |
| ---------------------------- | -------------------------------------------------------- |
| http://localhost:9000/health | The text `OK`.                                           |
| http://localhost:9000/app    | The admin login. Use the email and password from step 7. |
| http://localhost:3000        | The storefront with the three sample products.           |

You can also test the Store API with the key:

```bash
curl -H "x-publishable-api-key: pk_..." http://localhost:9000/store/products
```

## Daily start

1. Start PostgreSQL, Redis, and Garage.

```bash
docker compose -f docker-compose.local.yml up -d --wait
```

2. If you pulled new migrations, run step 5.
3. Start the backend and the storefront (step 9).

## Lint and format

Run these commands from the repository root before you commit.

```bash
pnpm lint            # ESLint in the backend and the storefront
pnpm format:check    # Prettier reports the files that need a format
```

To fix the problems, run `pnpm lint:fix` and `pnpm format`.

## Optional services

These services are not necessary to start the store. Each one has a section in `apps/backend/README.md`.

- **Mayar payments.** Set `MAYAR_API_KEY` to a sandbox key. Then run
  `pnpm --filter @store/backend mayar:check` to verify the key. Checkout needs this key.
- **The Mayar webhook.** The webhook needs a public URL for the backend, for example from
  `cloudflared tunnel --url http://localhost:9000`.
- **Email.** Set the three `BREVO_` keys to send real email.

Start the backend again after you change `apps/backend/.env`.

## Reset from scratch

Stop the backend before you reset. An open connection stops the `DROP DATABASE` command.

If you use the Compose services, remove the services and their volumes. Then start the services
again.

```bash
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up -d --wait
```

The `down -v` command also removes the Garage volumes. Garage then has no bucket, no key, and no
images. Do step 3 again. Put the new key values into `apps/backend/.env`. Then do steps 5 to 8
again.

If you use your own PostgreSQL, drop the database:

```bash
docker exec postgres psql -U user -d postgres -c 'DROP DATABASE medusa_ecommerce_template'
```

Then do step 2 and steps 5 to 8 again.

The seed creates a new publishable key, so update `apps/storefront/.env`.

## Troubleshooting

| Problem                                                                                    | Cause and fix                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| The backend cannot connect to the database.                                                | Check `DATABASE_URL`. The user, the password, and the database must exist. `docker ps` shows which container uses port 5432.              |
| The backend does not start. The error names `S3_ACCESS_KEY_ID` or `S3_SECRET_ACCESS_KEY`.  | The key is empty in `apps/backend/.env`. Do step 3, and put the key values into `apps/backend/.env`.                                      |
| `Publishable API key required in the request header`                                       | `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is empty. Set it (step 8) and start the storefront again.                                            |
| `A valid publishable key is required to proceed with the request`                          | The key is not in this database. This occurs after a reset or with a second database. Get the key again (step 6).                         |
| `The store has no region.`                                                                 | The seed did not run on this database. Run step 6.                                                                                        |
| The storefront shows no products.                                                          | The key has no link to the sales channel. Run the seed again. It adds the link.                                                           |
| The browser shows a CORS error.                                                            | `STORE_CORS` in `apps/backend/.env` must contain the storefront address, `http://localhost:3000`. Start the backend again.                |
| The admin login fails.                                                                     | The admin user does not exist in this database. Run step 7.                                                                               |
| A tool cannot open `assets.localhost`.                                                     | The tool uses only the system resolver, and some system resolvers do not resolve `*.localhost`. Use a browser or `curl`.                  |
| Old product images do not show.                                                            | Their URLs start with `http://localhost:9000/static/`. Medusa kept them in local storage. Upload the images again, or reset the database. |
| `docker compose -f docker-compose.local.yml up` fails because port 5432 or 6379 is in use. | Other containers use the ports. Stop those containers, or use them instead of the Compose services.                                       |
| `docker compose -f docker-compose.local.yml up` fails because port 3900 or 3902 is in use. | Another program uses the port. Stop the program that uses the port.                                                                       |
