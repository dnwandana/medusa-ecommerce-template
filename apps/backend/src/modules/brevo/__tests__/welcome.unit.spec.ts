import { renderTemplate } from "../templates"
import { renderWelcome } from "../templates/welcome"

const data = {
  store_name: "Everyday",
  first_name: "Muhammad Rizky",
  shop_url: "https://shop.example.com",
}

describe("welcome template", () => {
  it("has the subject and the text of the spec", () => {
    const { subject, html } = renderWelcome(data)
    expect(subject).toBe("Welcome to Everyday")
    expect(html).toContain("<p>Hi Muhammad Rizky,</p>")
    expect(html).toContain("Your account is ready. With your account, you can:")
    expect(html).toContain("<li>see your orders and their status,</li>")
    expect(html).toContain("<li>save your delivery addresses,</li>")
    expect(html).toContain("<li>keep a wishlist,</li>")
    expect(html).toContain("<li>review the products that you bought.</li>")
    expect(html).toContain(
      "To sign in, type your email address on our site. We send you a link each time, so you do not need a password."
    )
    expect(html).toContain('href="https://shop.example.com"')
    expect(html).toContain(">Start shopping</a>")
  })

  it("greets with Hi there when there is no first name", () => {
    expect(renderWelcome({ ...data, first_name: null }).html).toContain("<p>Hi there,</p>")
    expect(renderWelcome({ ...data, first_name: " " }).html).toContain("<p>Hi there,</p>")
  })

  it("escapes the name", () => {
    expect(renderWelcome({ ...data, first_name: "<i>Sari</i>" }).html).toContain(
      "Hi &lt;i&gt;Sari&lt;/i&gt;,"
    )
  })

  it("needs a shop URL and a store name", () => {
    expect(() => renderWelcome({ ...data, shop_url: "" })).toThrow(
      'The "welcome" template needs a shop_url.'
    )
    expect(() => renderWelcome({ ...data, store_name: "" })).toThrow(
      'The "welcome" template needs a store_name.'
    )
  })

  it("is in the template map", () => {
    expect(renderTemplate("welcome", data).subject).toBe("Welcome to Everyday")
  })
})
