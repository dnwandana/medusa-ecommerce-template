# Medusa E-commerce Template

A monorepo template for headless e-commerce. The backend is Medusa v2. The storefront is Nuxt 4.
Use this template as the start of a new online store.

The template comes with a complete store for physical products in Indonesia. It has one region,
prices in Indonesian Rupiah (IDR), and payments by bank transfer. Change these parts for the market
of your store.

## Features

- Product catalog with categories, product variants, and stock.
- Cart and a one-page checkout with Indonesian addresses.
- Payment by bank transfer. The admin manages the bank accounts. A redirect gateway can be added.
- Shipping price from the total weight of the cart.
- Customer accounts: register, log in, password reset, order history.
- Product reviews with approval in the admin dashboard.
- Wishlist for logged-in customers.
- Storefront in English and Indonesian.
- Emails in English and Indonesian over SMTP, with any email provider. Mailpit catches the emails
  in development.
- Production setup for one server with Docker Compose and Caddy. The product images and the
  receipts go to an S3 store of the client's choice.

## Repository layout

| Path                       | Content                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| `apps/backend`             | Medusa v2 backend and admin dashboard. See [its README](apps/backend/README.md). |
| `apps/storefront`          | Nuxt 4 storefront. See [its README](apps/storefront/README.md).                  |
| `docs/development.md`      | Local setup from an empty machine, step by step.                                 |
| `docs/deployment.md`       | Production setup on one server.                                                  |
| `docker-compose.yml`       | Production services.                                                             |
| `docker-compose.local.yml` | Development services: PostgreSQL, Redis, and Garage.                             |
| `Caddyfile`                | Reverse proxy and TLS for production.                                            |
| `garage.toml`              | Garage (S3 storage) configuration for development.                               |

The repository is a pnpm workspace. The package names are `@store/backend` and
`@store/storefront`.

## Architecture

```text
Browser ──> Nuxt storefront (:3000) ──> Medusa server (:9000) ──> PostgreSQL
                                                 │                 Redis
                                                 └──> SMTP server (email provider)
                                         Medusa worker (scheduled jobs, events)
```

- The storefront calls the backend only through `@medusajs/js-sdk`. Each request carries the
  publishable API key.
- The browser and the Nuxt server can use different backend URLs. In production, the Nuxt server
  uses the private Docker network.
- The login uses a session cookie. Thus the storefront and the backend must be on the same site.
- In production, one backend image runs two times: the server (HTTP and admin) and the worker
  (jobs and events).

## Requirements

- Node 24 or higher (`nvm use` reads `.nvmrc`)
- pnpm 10.11.1 (`corepack enable`)
- PostgreSQL 16 or higher
- Redis 7 or higher (optional in development)
- Garage v2.4.1 (from `docker-compose.local.yml`)

Start PostgreSQL, Redis, and Garage from `docker-compose.local.yml`:

```bash
docker compose -f docker-compose.local.yml up -d --wait
```

## Setup

See [docs/development.md](docs/development.md) for the full procedure. This is the short form:

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env          # set DATABASE_URL
# Do step 3 of docs/development.md. Put the Garage key into apps/backend/.env.
pnpm --filter @store/backend exec medusa db:migrate
pnpm --filter @store/backend seed                         # prints PUBLISHABLE_KEY=pk_...
pnpm --filter @store/backend exec medusa user -e admin@example.com -p supersecret
cp apps/storefront/.env.example apps/storefront/.env    # set NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
pnpm dev
```

| Address                      | Use                                                           |
| ---------------------------- | ------------------------------------------------------------- |
| http://localhost:9000/app    | Admin dashboard. Log in with the admin user that you created. |
| http://localhost:9000/health | Health check of the backend                                   |
| http://localhost:3000        | Storefront                                                    |

Change the admin password before you use this project for a real store.

Checkout works with no payment key. The seed adds a sample bank account. Change it before you
sell. See [Payments](docs/deployment.md#payments).

## Root scripts

| Command       | Function                                                                                |
| ------------- | --------------------------------------------------------------------------------------- |
| `pnpm dev`    | Starts the backend (`medusa develop`) and the storefront (port 3000).                   |
| `pnpm test`   | Runs all tests in this order: backend unit, backend HTTP integration, storefront.       |
| `pnpm lint`   | Runs ESLint in the backend and the storefront. `pnpm lint:fix` also fixes the problems. |
| `pnpm format` | Formats all files with Prettier. `pnpm format:check` only reports the files.            |

## Tests

| Command                                              | Needs                          |
| ---------------------------------------------------- | ------------------------------ |
| `pnpm --filter @store/backend test:unit`             | Nothing                        |
| `pnpm --filter @store/backend test:integration:http` | PostgreSQL at `localhost:5432` |
| `pnpm --filter @store/storefront test`               | Nothing                        |

- The HTTP integration tests read the database user and password from `apps/backend/.env.test`.
  Environment variables override these values, for example `DB_PORT=55432`.
- The integration tests do not need Redis, and they call no payment API.
- The storefront tests mock the Medusa SDK. They do not need the backend.
- To run one test file, give its path:
  `pnpm --filter @store/backend test:unit src/modules/bank-transfer/__tests__/service.unit.spec.ts`.

## Deployment

The store runs on one server with Docker Compose. You build the images on the server, run the
migrations, and start the services with `docker compose` commands. Caddy is the only service that
publishes ports.

| Service         | Function                                                |
| --------------- | ------------------------------------------------------- |
| `caddy`         | TLS and reverse proxy for `<domain>` and `api.<domain>` |
| `storefront`    | Nuxt server                                             |
| `medusa-server` | Medusa HTTP API and admin dashboard                     |
| `medusa-worker` | Medusa scheduled jobs and event subscribers             |
| `postgres`      | Database                                                |
| `redis`         | Event bus, workflow engine, cache, and locks            |

See [docs/deployment.md](docs/deployment.md) for the full procedure: the server, the DNS records,
the environment file, the first deploy, the payments, and the backups.

## More documentation

- [Backend README](apps/backend/README.md): environment keys, payments, shipping, email, reviews,
  wishlist, and the HTTP routes.
- [Storefront README](apps/storefront/README.md): environment keys, pages, languages, accounts,
  and checkout.
- [Development setup](docs/development.md)
- [Deployment](docs/deployment.md)

## License

[MIT](LICENSE)
