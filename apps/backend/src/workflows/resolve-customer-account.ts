import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  resolveCustomerAccountStep,
  type ResolveCustomerAccountInput,
} from "./steps/resolve-customer-account"

// Returns the account customer and the magic link auth identity for an email. The magic link
// session route runs it after the link is used.
export const resolveCustomerAccountWorkflow = createWorkflow(
  "resolve-customer-account",
  function (input: ResolveCustomerAccountInput) {
    const account = resolveCustomerAccountStep(input)
    return new WorkflowResponse(account)
  }
)
