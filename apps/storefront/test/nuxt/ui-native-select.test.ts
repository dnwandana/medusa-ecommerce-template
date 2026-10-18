import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { h } from "vue"
import { NativeSelect } from "~/components/ui/native-select"

const options = () => [
  h("option", { value: "Bali" }, "Bali"),
  h("option", { value: "Jawa Barat" }, "Jawa Barat"),
]

describe("NativeSelect", () => {
  it("shows the placeholder first and updates the model", async () => {
    const wrapper = await mountSuspended(NativeSelect, {
      props: { modelValue: "", placeholder: "Select a province" },
      slots: { default: options },
    })
    const first = wrapper.findAll("option")[0]!
    expect(first.text()).toBe("Select a province")
    expect(first.attributes("disabled")).toBeDefined()
    await wrapper.get("select").setValue("Bali")
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["Bali"])
  })

  it("uses the underline field style", async () => {
    const wrapper = await mountSuspended(NativeSelect, { slots: { default: options } })
    expect(wrapper.get("select").classes()).toEqual(
      expect.arrayContaining([
        "h-12",
        "border-b",
        "border-input",
        "appearance-none",
        "rounded-none",
      ])
    )
    expect(wrapper.find("svg.lucide-chevron-down").exists()).toBe(true)
  })

  it("passes the id and the aria attributes to the select", async () => {
    const wrapper = await mountSuspended(NativeSelect, {
      props: { modelValue: "" },
      attrs: { id: "province", "aria-describedby": "province-error", "aria-invalid": "true" },
      slots: { default: options },
    })
    const select = wrapper.get("select")
    expect(select.attributes("id")).toBe("province")
    expect(select.attributes("aria-describedby")).toBe("province-error")
    expect(select.attributes("aria-invalid")).toBe("true")
    expect(wrapper.attributes("id")).toBeUndefined()
  })
})
