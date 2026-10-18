import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import SignInCheckEmail from "~/components/SignInCheckEmail.vue"

const NOW = new Date("2026-10-18T07:00:00Z").getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => vi.useRealTimers())

describe("SignInCheckEmail", () => {
  it("shows the email and counts down to the resend", async () => {
    const wrapper = await mountSuspended(SignInCheckEmail, {
      props: {
        email: "sari@example.com",
        phase: "waiting",
        resendAt: NOW + 45_000,
        sentAgain: false,
        busy: false,
      },
    })
    expect(wrapper.text()).toContain("We sent a link to sari@example.com.")
    expect(wrapper.get("b").text()).toBe("sari@example.com")
    expect(wrapper.text()).toContain("This tab signs in when you open the link.")
    expect(wrapper.text()).toContain("No email? Look in your spam folder.")
    const resend = wrapper.get('[data-testid="resend"]')
    expect(resend.text()).toBe("Send the link again in 0:45")
    expect(resend.attributes("disabled")).toBeDefined()
    await vi.advanceTimersByTimeAsync(45_000)
    expect(resend.text()).toBe("Send the link again")
    expect(resend.attributes("disabled")).toBeUndefined()
    await resend.trigger("click")
    expect(wrapper.emitted("resend")).toHaveLength(1)
  })

  it("shows the note after a second send", async () => {
    const wrapper = await mountSuspended(SignInCheckEmail, {
      props: { email: "a@b.c", phase: "waiting", resendAt: NOW, sentAgain: true, busy: false },
    })
    expect(wrapper.text()).toContain("We sent a new link. The older link does not work now.")
  })

  it("does not show the note before a second send", async () => {
    const wrapper = await mountSuspended(SignInCheckEmail, {
      props: { email: "a@b.c", phase: "waiting", resendAt: NOW, sentAgain: false, busy: false },
    })
    expect(wrapper.text()).not.toContain("We sent a new link.")
  })

  it("emits different-email", async () => {
    const wrapper = await mountSuspended(SignInCheckEmail, {
      props: { email: "a@b.c", phase: "waiting", resendAt: null, sentAgain: false, busy: false },
    })
    await wrapper.get('[data-testid="different-email"]').trigger("click")
    expect(wrapper.emitted("different-email")).toHaveLength(1)
  })

  it("shows the expired state with a button for a new link", async () => {
    const wrapper = await mountSuspended(SignInCheckEmail, {
      props: { email: "a@b.c", phase: "expired", resendAt: null, sentAgain: false, busy: false },
    })
    expect(wrapper.text()).toContain("The link expired.")
    expect(wrapper.text()).toContain("The link works for 15 minutes.")
    expect(wrapper.find('[data-testid="resend"]').exists()).toBe(false)
    await wrapper.get('[data-testid="send-new"]').trigger("click")
    expect(wrapper.emitted("resend")).toHaveLength(1)
  })

  it.each(["waiting", "expired"] as const)(
    "shows the error text in the %s phase",
    async (phase) => {
      const wrapper = await mountSuspended(SignInCheckEmail, {
        props: {
          email: "a@b.c",
          phase,
          resendAt: null,
          sentAgain: false,
          busy: false,
          error: "We could not send the link. Try again.",
        },
      })
      const alert = wrapper.get('[data-slot="alert"]')
      expect(alert.text()).toBe("We could not send the link. Try again.")
      expect(alert.attributes("role")).toBe("status")
    }
  )

  it("shows no error box when the error text is empty", async () => {
    const wrapper = await mountSuspended(SignInCheckEmail, {
      props: {
        email: "a@b.c",
        phase: "expired",
        resendAt: null,
        sentAgain: false,
        busy: false,
        error: "",
      },
    })
    expect(wrapper.find('[data-slot="alert"]').exists()).toBe(false)
  })

  it("stops the countdown when it unmounts", async () => {
    const clear = vi.spyOn(globalThis, "clearInterval")
    const wrapper = await mountSuspended(SignInCheckEmail, {
      props: {
        email: "a@b.c",
        phase: "waiting",
        resendAt: NOW + 30_000,
        sentAgain: false,
        busy: false,
      },
    })
    wrapper.unmount()
    expect(clear).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    clear.mockRestore()
  })
})
