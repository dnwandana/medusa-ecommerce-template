import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import { readOwnerEmail } from "../owner-email"
import { readStoreForEmail } from "../store-for-email"
import { readStorefrontUrl, storefrontLink } from "../storefront-url"

const scope = (
  contact: { email: string | null; whatsapp: string | null },
  storefrontUrl = "https://shop.example.com/"
) => {
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
    [BANK_ACCOUNT_MODULE]: { getContact: jest.fn().mockResolvedValue(contact) },
  }
  return { resolve: (key: string) => registry[key] } as any
}

describe("storefrontLink", () => {
  it("adds the prefix for Indonesian and one slash only", () => {
    expect(storefrontLink("https://shop.example.com/", "id-ID", "/orders/o_1")).toBe(
      "https://shop.example.com/id/orders/o_1"
    )
    expect(storefrontLink("https://shop.example.com", "en-US", "orders/o_1")).toBe(
      "https://shop.example.com/orders/o_1"
    )
  })
  it("reads the config", () => {
    expect(readStorefrontUrl(scope({ email: null, whatsapp: null }))).toBe(
      "https://shop.example.com"
    )
    expect(readStorefrontUrl(scope({ email: null, whatsapp: null }, " "))).toBeNull()
  })
})
describe("readStoreForEmail", () => {
  it("gives the name and the contact", async () => {
    await expect(
      readStoreForEmail(scope({ email: "hello@everyday.id", whatsapp: null }))
    ).resolves.toEqual({ name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null })
  })
  it("falls back to the default name when there is no store row", async () => {
    const empty = {
      resolve: (key: string) =>
        key === Modules.STORE
          ? { listStores: jest.fn().mockResolvedValue([]) }
          : { getContact: jest.fn().mockResolvedValue({ email: null, whatsapp: null }) },
    } as any
    await expect(readStoreForEmail(empty)).resolves.toMatchObject({ name: "our store" })
  })
})
describe("readOwnerEmail", () => {
  it("prefers the contact, then the env, then empty", async () => {
    await expect(
      readOwnerEmail(scope({ email: " owner@x.id ", whatsapp: null }), {
        STORE_OWNER_EMAIL: "env@x.id",
      })
    ).resolves.toBe("owner@x.id")
    await expect(
      readOwnerEmail(scope({ email: "", whatsapp: null }), { STORE_OWNER_EMAIL: "env@x.id" })
    ).resolves.toBe("env@x.id")
    await expect(readOwnerEmail(scope({ email: null, whatsapp: null }), {})).resolves.toBe("")
  })
})
