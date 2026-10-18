import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import type { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { resolveCustomerAccountWorkflow } from "../../src/workflows/resolve-customer-account"
import {
  resolveCustomerAccountStep,
  type ResolveCustomerAccountInput,
} from "../../src/workflows/steps/resolve-customer-account"
import { createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

const failStep = createStep("resolve-customer-account-test-fail", async () => {
  throw new Error("The test step fails.")
})

// Runs the step and then a step that throws, so that the compensation runs.
const failingWorkflow = createWorkflow(
  "resolve-customer-account-test-failing",
  function (input: ResolveCustomerAccountInput) {
    const result = resolveCustomerAccountStep(input)
    failStep()
    return new WorkflowResponse(result)
  }
)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("resolve customer account workflow", () => {
      let customerModule: ICustomerModuleService
      let authModule: IAuthModuleService

      beforeEach(() => {
        customerModule = getContainer().resolve(Modules.CUSTOMER)
        authModule = getContainer().resolve(Modules.AUTH)
      })

      const run = (email: string) =>
        resolveCustomerAccountWorkflow(getContainer())
          .run({ input: { email } })
          .then((r) => r.result)

      it("creates an account customer for a new email", async () => {
        const result = await run("  New@Example.com ")
        const customer = await customerModule.retrieveCustomer(result.customer_id)
        expect(customer).toMatchObject({ email: "new@example.com", has_account: true })
        expect(result.is_new_account).toBe(true)
        const [identity] = await authModule.listProviderIdentities({
          provider: "magic-link",
          entity_id: "new@example.com",
        })
        expect(identity.auth_identity_id).toBe(result.auth_identity.id)
        expect(result.auth_identity.app_metadata).toEqual({ customer_id: result.customer_id })
      })

      it("turns a guest customer into the account", async () => {
        const guest = await customerModule.createCustomers({
          email: "guest@example.com",
          has_account: false,
        })
        const result = await run("guest@example.com")
        expect(result.customer_id).toBe(guest.id)
        expect(result.is_new_account).toBe(true)
        expect((await customerModule.retrieveCustomer(guest.id)).has_account).toBe(true)
        expect(await customerModule.listCustomers({ email: "guest@example.com" })).toHaveLength(1)
      })

      it("links an existing account customer and keeps its name", async () => {
        const account = await createCustomerWithToken(getContainer(), {
          email: "sari@example.com",
          first_name: "Sari",
        })
        const result = await run("sari@example.com")
        expect(result.customer_id).toBe(account.id)
        expect(result.is_new_account).toBe(false)
        expect((await customerModule.retrieveCustomer(account.id)).first_name).toBe("Sari")
      })

      it("finds the same identity at the second sign-in", async () => {
        const first = await run("again@example.com")
        const second = await run("again@example.com")
        expect(second.auth_identity.id).toBe(first.auth_identity.id)
        expect(second.is_new_account).toBe(false)
        expect(await customerModule.listCustomers({ email: "again@example.com" })).toHaveLength(1)
      })

      it("undoes its changes when a later step fails", async () => {
        await customerModule.createCustomers({ email: "undo@example.com", has_account: false })
        const { errors } = await failingWorkflow(getContainer()).run({
          input: { email: "undo@example.com" },
          throwOnError: false,
        })
        expect(errors).toHaveLength(1)
        expect(
          (await customerModule.listCustomers({ email: "undo@example.com" }))[0].has_account
        ).toBe(false)
        expect(
          await authModule.listProviderIdentities({
            provider: "magic-link",
            entity_id: "undo@example.com",
          })
        ).toHaveLength(0)
      })

      it("deletes a new customer when a later step fails", async () => {
        await failingWorkflow(getContainer()).run({
          input: { email: "gone@example.com" },
          throwOnError: false,
        })
        expect(await customerModule.listCustomers({ email: "gone@example.com" })).toHaveLength(0)
      })
    })
  },
})
