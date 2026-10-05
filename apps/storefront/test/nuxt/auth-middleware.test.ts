import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import authMiddleware from "~/middleware/auth"

const { customerState, navigateToMock } = vi.hoisted(() => ({
  customerState: {
    customer: { value: null as { id: string } | null },
    ensureLoaded: vi.fn(),
  },
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("navigateTo", () => navigateToMock)
// The login page does not exist before task 24.
mockNuxtImport("useLocalePath", () => () => (path: string) => path)

const to = { fullPath: "/account/orders" } as never
const from = { fullPath: "/" } as never

beforeEach(() => {
  customerState.customer.value = null
  customerState.ensureLoaded.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset().mockReturnValue("redirect")
})

describe("auth middleware", () => {
  it("sends a guest to the login page with the target path", async () => {
    const result = await authMiddleware(to, from)

    expect(customerState.ensureLoaded).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith({
      path: "/account/login",
      query: { redirect: "/account/orders" },
    })
    expect(result).toBe("redirect")
  })

  it("sends the visitor to the login page when the customer does not load", async () => {
    customerState.ensureLoaded.mockRejectedValue(new Error("Network failure"))

    const result = await authMiddleware(to, from)

    expect(navigateToMock).toHaveBeenCalledWith({
      path: "/account/login",
      query: { redirect: "/account/orders" },
    })
    expect(result).toBe("redirect")
  })

  it("lets a logged-in customer continue", async () => {
    customerState.customer.value = { id: "cus_1" }

    const result = await authMiddleware(to, from)

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})
