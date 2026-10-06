import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { AuthPanel } from "#components"

describe("AuthPanel", () => {
  it("shows the title above a card of 400px and the three slots in order", async () => {
    const wrapper = await mountSuspended(AuthPanel, {
      props: { title: "Log in" },
      slots: { before: "<p>before</p>", default: "<p>form</p>", after: "<p>after</p>" },
    })

    expect(wrapper.find("h1").text()).toBe("Log in")
    expect(wrapper.find("h1").classes()).toEqual(
      expect.arrayContaining(["text-[24px]", "md:text-[26px]"])
    )
    expect(wrapper.find(".max-w-\\[400px\\]").exists()).toBe(true)
    expect(wrapper.find('[data-slot="card"]').text()).toBe("form")
    // Vue removes the white space between elements, so the test reads the order of the elements.
    expect(wrapper.findAll("p, h1").map((node) => node.text())).toEqual([
      "before",
      "Log in",
      "form",
      "after",
    ])
  })
})
