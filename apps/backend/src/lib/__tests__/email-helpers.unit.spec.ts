import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import type { StoreContact } from "../store-contact"
import { readOwnerEmail } from "../owner-email"
import { readStoreForEmail } from "../store-for-email"
import { readStorefrontUrl, storefrontLink } from "../storefront-url"

const contactOf = (fields: Partial<StoreContact> = {}): StoreContact => ({
  email: null,
  phone: null,
  whatsapp: null,
  address: null,
  social_links: [],
  ...fields,
})

const scope = (contact: StoreContact, storefrontUrl = "https://shop.example.com/") => {
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
    [STOREFRONT_MODULE]: { getContact: jest.fn().mockResolvedValue(contact) },
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
    expect(readStorefrontUrl(scope(contactOf()))).toBe("https://shop.example.com")
    expect(readStorefrontUrl(scope(contactOf(), " "))).toBeNull()
  })
})
describe("readStoreForEmail", () => {
  it("gives the name and the contact", async () => {
    const contact = contactOf({
      email: "hello@store.com",
      phone: "+622155500100",
      whatsapp: "+6281234567890",
      address: "Jl. Sudirman 1",
    })
    await expect(readStoreForEmail(scope(contact))).resolves.toEqual({
      name: "Everyday",
      contact_email: "hello@store.com",
      whatsapp: "+6281234567890",
      phone: "+622155500100",
    })
  })
  it("falls back to the default name when there is no store row", async () => {
    const empty = {
      resolve: (key: string) =>
        key === Modules.STORE
          ? { listStores: jest.fn().mockResolvedValue([]) }
          : { getContact: jest.fn().mockResolvedValue(contactOf()) },
    } as any
    await expect(readStoreForEmail(empty)).resolves.toMatchObject({ name: "our store" })
  })
})
describe("readOwnerEmail", () => {
  it("prefers the contact, then the env, then empty", async () => {
    await expect(
      readOwnerEmail(scope(contactOf({ email: " owner@x.id " })), {
        STORE_OWNER_EMAIL: "env@x.id",
      })
    ).resolves.toBe("owner@x.id")
    await expect(
      readOwnerEmail(scope(contactOf({ email: "" })), { STORE_OWNER_EMAIL: "env@x.id" })
    ).resolves.toBe("env@x.id")
    await expect(readOwnerEmail(scope(contactOf()), {})).resolves.toBe("")
  })
})
