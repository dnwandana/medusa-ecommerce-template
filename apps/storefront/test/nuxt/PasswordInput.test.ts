import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { PasswordInput } from "#components"

const props = { id: "login-password", modelValue: "", autocomplete: "current-password" as const }

describe("PasswordInput", () => {
  it("renders a password input with the name, the id, and the autocomplete", async () => {
    const wrapper = await mountSuspended(PasswordInput, { props })
    const input = wrapper.find("input")

    expect(input.attributes()).toMatchObject({
      id: "login-password",
      name: "password",
      type: "password",
      autocomplete: "current-password",
    })
    expect(wrapper.find('[data-slot="input-group-addon"] svg').exists()).toBe(true)
  })

  it("shows and hides the password with the toggle", async () => {
    const wrapper = await mountSuspended(PasswordInput, { props })
    const toggle = wrapper.find("button")

    expect(toggle.attributes("aria-label")).toBe("Show the password")
    await toggle.trigger("click")

    expect(wrapper.find("input").attributes("type")).toBe("text")
    expect(wrapper.find("button").attributes("aria-label")).toBe("Hide the password")
    expect(wrapper.find("button").attributes("aria-pressed")).toBe("true")
  })

  it("emits the typed value", async () => {
    const wrapper = await mountSuspended(PasswordInput, { props })

    await wrapper.find("input").setValue("secret-password")

    expect(wrapper.emitted("update:modelValue")).toEqual([["secret-password"]])
  })

  it("passes the hint id and the invalid state to the input", async () => {
    const wrapper = await mountSuspended(PasswordInput, {
      props: { ...props, describedby: "register-password-hint", invalid: true },
    })

    expect(wrapper.find("input").attributes("aria-describedby")).toBe("register-password-hint")
    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true")
  })

  // Review Focus: the toggle is in a form. A click on it must not submit the form.
  it("does not submit the form when the user clicks the toggle", async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault())
    const Form = defineComponent(() => {
      const value = ref("")
      return () => h("form", { onSubmit }, [h(PasswordInput, { ...props, modelValue: value.value })])
    })
    const wrapper = await mountSuspended(Form, { attachTo: document.body })

    await wrapper.find("button").trigger("click")

    expect(wrapper.find("button").attributes("type")).toBe("button")
    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
    document.body.innerHTML = ""
  })
})
