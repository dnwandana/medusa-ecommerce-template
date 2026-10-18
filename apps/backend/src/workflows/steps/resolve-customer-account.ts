import type {
  CustomerUpdatableFields,
  IAuthModuleService,
  ICustomerModuleService,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

// The provider name of the auth identities that the magic link routes create.
export const MAGIC_LINK_PROVIDER = "magic-link"

export type ResolveCustomerAccountInput = { email: string }

export type ResolvedCustomerAccount = {
  customer_id: string
  auth_identity: { id: string; app_metadata: Record<string, unknown> }
  is_new_account: boolean
}

// The update type of the customer module has no has_account field, but the module stores it.
const hasAccount = (value: boolean) => ({ has_account: value }) as CustomerUpdatableFields

type Compensation = {
  auth_identity_id: string | null
  upgraded_guest_id: string | null
  created_customer_id: string | null
}

// Finds or makes the account customer and the magic link auth identity for an email. One email
// gives one customer: the step uses an existing account or guest before it creates a customer.
// A guest becomes the account, so the guest orders show in the account.
export const resolveCustomerAccountStep = createStep(
  "resolve-customer-account",
  async (input: ResolveCustomerAccountInput, { container }) => {
    const email = input.email.trim().toLowerCase()
    const authModule: IAuthModuleService = container.resolve(Modules.AUTH)
    const customerModule: ICustomerModuleService = container.resolve(Modules.CUSTOMER)

    // 1. A known magic link identity: the step changes nothing.
    const [providerIdentity] = await authModule.listProviderIdentities(
      { provider: MAGIC_LINK_PROVIDER, entity_id: email },
      { take: 1 }
    )
    if (providerIdentity) {
      const identity = await authModule.retrieveAuthIdentity(providerIdentity.auth_identity_id!)
      const appMetadata = (identity.app_metadata ?? {}) as Record<string, unknown>
      const result: ResolvedCustomerAccount = {
        customer_id: appMetadata.customer_id as string,
        auth_identity: { id: identity.id, app_metadata: appMetadata },
        is_new_account: false,
      }
      return new StepResponse<ResolvedCustomerAccount, Compensation>(result, {
        auth_identity_id: null,
        upgraded_guest_id: null,
        created_customer_id: null,
      })
    }

    let customerId: string
    let isNewAccount = true
    let upgradedGuestId: string | null = null
    let createdCustomerId: string | null = null

    const [account] = await customerModule.listCustomers({ email, has_account: true }, { take: 1 })
    if (account) {
      // 2. An account customer, for example from a password sign-up before.
      customerId = account.id
      isNewAccount = false
    } else {
      const [guest] = await customerModule.listCustomers(
        { email, has_account: false },
        { order: { created_at: "ASC" }, take: 1 }
      )
      if (guest) {
        // 3. The oldest guest becomes the account.
        await customerModule.updateCustomers(guest.id, hasAccount(true))
        customerId = guest.id
        upgradedGuestId = guest.id
      } else {
        // 4. A new customer.
        const created = await customerModule.createCustomers({ email, has_account: true })
        customerId = created.id
        createdCustomerId = created.id
      }
    }

    const identity = await authModule.createAuthIdentities({
      provider_identities: [{ provider: MAGIC_LINK_PROVIDER, entity_id: email }],
      app_metadata: { customer_id: customerId },
    })

    const result: ResolvedCustomerAccount = {
      customer_id: customerId,
      auth_identity: {
        id: identity.id,
        app_metadata: (identity.app_metadata ?? {}) as Record<string, unknown>,
      },
      is_new_account: isNewAccount,
    }
    return new StepResponse<ResolvedCustomerAccount, Compensation>(result, {
      auth_identity_id: identity.id,
      upgraded_guest_id: upgradedGuestId,
      created_customer_id: createdCustomerId,
    })
  },
  async (compensation: Compensation | undefined, { container }) => {
    if (!compensation) {
      return
    }
    const authModule: IAuthModuleService = container.resolve(Modules.AUTH)
    const customerModule: ICustomerModuleService = container.resolve(Modules.CUSTOMER)

    if (compensation.auth_identity_id) {
      await authModule.deleteAuthIdentities([compensation.auth_identity_id])
    }
    if (compensation.upgraded_guest_id) {
      await customerModule.updateCustomers(compensation.upgraded_guest_id, hasAccount(false))
    }
    if (compensation.created_customer_id) {
      await customerModule.deleteCustomers([compensation.created_customer_id])
    }
  }
)
