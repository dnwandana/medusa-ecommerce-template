import type { MedusaContainer } from "@medusajs/framework/types"
import { generateJwtToken, Modules } from "@medusajs/framework/utils"

// The secret must be the same as http.jwtSecret of the test environment (.env.test).
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"
const PASSWORD = "test-password"

export type Actor = { id: string; headers: { authorization: string } }

// Signs a token in the same form as the token of the Medusa login routes.
function bearerHeaders(
  actorId: string,
  actorType: "customer" | "user",
  authIdentityId: string
): Actor["headers"] {
  const token = generateJwtToken(
    { actor_id: actorId, actor_type: actorType, auth_identity_id: authIdentityId },
    { secret: JWT_SECRET, expiresIn: "1d" }
  )
  return { authorization: `Bearer ${token}` }
}

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`

// Creates a registered customer with an auth identity and returns a token for the store API.
export async function createCustomerWithToken(
  container: MedusaContainer,
  input: { email?: string; first_name?: string | null; last_name?: string | null } = {}
): Promise<Actor> {
  const email = input.email ?? uniqueEmail("customer")
  const customer = await container.resolve(Modules.CUSTOMER).createCustomers({
    email,
    has_account: true,
    first_name: input.first_name === undefined ? "Budi" : input.first_name,
    last_name: input.last_name === undefined ? "Santoso" : input.last_name,
  })
  const identity = await container.resolve(Modules.AUTH).createAuthIdentities({
    provider_identities: [
      { provider: "emailpass", entity_id: email, provider_metadata: { password: PASSWORD } },
    ],
    app_metadata: { customer_id: customer.id },
  })
  return { id: customer.id, headers: bearerHeaders(customer.id, "customer", identity.id) }
}

// Creates an admin user with an auth identity and returns a token for the admin API.
export async function createAdminWithToken(
  container: MedusaContainer,
  email = "admin@test.local"
): Promise<Actor> {
  const user = await container.resolve(Modules.USER).createUsers({ email })
  const identity = await container.resolve(Modules.AUTH).createAuthIdentities({
    provider_identities: [
      { provider: "emailpass", entity_id: email, provider_metadata: { password: PASSWORD } },
    ],
    app_metadata: { user_id: user.id },
  })
  return { id: user.id, headers: bearerHeaders(user.id, "user", identity.id) }
}
