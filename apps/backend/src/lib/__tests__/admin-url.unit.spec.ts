import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { adminLink } from "../admin-url"

const scope = (admin: Record<string, unknown> | undefined) =>
  ({
    resolve: (key: string) =>
      key === ContainerRegistrationKeys.CONFIG_MODULE ? { admin } : undefined,
  }) as any

describe("adminLink", () => {
  it("builds the admin link", () => {
    expect(
      adminLink(scope({ backendUrl: "https://api.shop.example.com/", path: "/app" }), "/orders/o_1")
    ).toBe("https://api.shop.example.com/app/orders/o_1")
    expect(adminLink(scope({ backendUrl: "/", path: undefined }), "/orders/o_1")).toBe(
      "http://localhost:9000/app/orders/o_1"
    )
  })

  it("uses the defaults when the admin config is missing", () => {
    expect(adminLink(scope(undefined), "/products/p_1")).toBe(
      "http://localhost:9000/app/products/p_1"
    )
  })

  it("keeps a custom admin path", () => {
    expect(
      adminLink(
        scope({ backendUrl: "https://api.shop.example.com", path: "/dashboard" }),
        "/orders/o_1"
      )
    ).toBe("https://api.shop.example.com/dashboard/orders/o_1")
  })
})
