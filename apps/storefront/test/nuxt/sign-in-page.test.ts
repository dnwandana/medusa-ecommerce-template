import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNuxtApp } from "#imports"
import SignInCheckEmail from "~/components/SignInCheckEmail.vue"
import SignInPage from "~/pages/account/sign-in/index.vue"

const { flow, navigateToMock, options } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    flow: {
      phase: ref<"form" | "sending" | "waiting" | "expired">("form"),
      email: ref(""),
      error: ref<"invalid" | "failed" | "rate_limited" | null>(null),
      resendAt: ref<number | null>(null),
      sentAgain: ref(false),
      requestLink: vi.fn(),
      resend: vi.fn(),
      useDifferentEmail: vi.fn(),
      resume: vi.fn(),
    },
    navigateToMock: vi.fn(),
    options: { onSignedIn: (_path: string) => {} },
  }
})

mockNuxtImport("useMagicLink", () => (opts: { onSignedIn: (path: string) => void }) => {
  options.onSignedIn = opts.onSignedIn
  return flow
})
mockNuxtImport("navigateTo", () => navigateToMock)

const onSignedIn = (path: string) => options.onSignedIn(path)

beforeEach(() => {
  flow.phase.value = "form"
  flow.email.value = ""
  flow.error.value = null
  flow.resendAt.value = null
  flow.sentAgain.value = false
  flow.requestLink.mockReset().mockResolvedValue(undefined)
  flow.resend.mockReset().mockResolvedValue(undefined)
  flow.useDifferentEmail.mockReset()
  flow.resume.mockReset().mockReturnValue(false)
  navigateToMock.mockReset()
})

afterEach(() => {
  useNuxtApp().$i18n.locale.value = "en"
})

describe("sign-in page", () => {
  it("sends the link with the redirect of the URL", async () => {
    const wrapper = await mountSuspended(SignInPage, {
      route: "/account/sign-in?redirect=/checkout",
    })
    await wrapper.get('input[name="email"]').setValue("sari@example.com")
    await wrapper.get("form").trigger("submit")
    expect(flow.requestLink).toHaveBeenCalledWith("sari@example.com", "/checkout")
  })

  it("sends no redirect when the URL has none", async () => {
    const wrapper = await mountSuspended(SignInPage, { route: "/account/sign-in" })
    await wrapper.get('input[name="email"]').setValue("sari@example.com")
    await wrapper.get("form").trigger("submit")
    expect(flow.requestLink).toHaveBeenCalledWith("sari@example.com", null)
  })

  it("has one email field, no password field and no register link", async () => {
    const wrapper = await mountSuspended(SignInPage, { route: "/account/sign-in" })
    const input = wrapper.get('input[name="email"]')
    expect(input.attributes("type")).toBe("email")
    expect(input.attributes("autocomplete")).toBe("email")
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain("Create an account")
    expect(wrapper.text()).toContain("No account yet? The same link creates your account.")
  })

  it("shows the busy button while the link is sent", async () => {
    flow.phase.value = "sending"
    const wrapper = await mountSuspended(SignInPage, { route: "/account/sign-in" })
    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes("aria-busy")).toBe("true")
    expect(button.text()).toBe("Sending the link…")
  })

  it.each([
    ["invalid", "Type a valid email address."],
    ["rate_limited", "Wait 60 seconds before you ask for a new link."],
    ["failed", "We could not send the link. Try again."],
  ] as const)("shows the text for the error %s", async (code, text) => {
    flow.error.value = code
    const wrapper = await mountSuspended(SignInPage, { route: "/account/sign-in" })
    expect(wrapper.text()).toContain(text)
  })

  it.each([
    ["waiting", "failed", "We could not send the link. Try again."],
    ["waiting", "rate_limited", "Wait 60 seconds before you ask for a new link."],
    ["expired", "failed", "We could not send the link. Try again."],
    ["expired", "rate_limited", "Wait 60 seconds before you ask for a new link."],
  ] as const)("shows a failed resend in the %s phase (%s)", async (phase, code, text) => {
    flow.phase.value = phase
    flow.email.value = "sari@example.com"
    flow.error.value = code
    const wrapper = await mountSuspended(SignInPage, { route: "/account/sign-in" })
    expect(wrapper.findComponent(SignInCheckEmail).props("error")).toBe(text)
    expect(wrapper.text()).toContain(text)
    expect(wrapper.text()).not.toContain(code)
  })

  it("shows Check your email in the waiting phase and resumes on mount", async () => {
    flow.phase.value = "waiting"
    const wrapper = await mountSuspended(SignInPage, { route: "/account/sign-in" })
    expect(flow.resume).toHaveBeenCalled()
    expect(wrapper.findComponent(SignInCheckEmail).exists()).toBe(true)
    expect(wrapper.find("form").exists()).toBe(false)
  })

  it("passes the resend and the different email to the flow", async () => {
    flow.phase.value = "waiting"
    flow.email.value = "sari@example.com"
    const wrapper = await mountSuspended(SignInPage, { route: "/account/sign-in" })
    await wrapper.get('[data-testid="different-email"]').trigger("click")
    expect(flow.useDifferentEmail).toHaveBeenCalled()
    flow.phase.value = "expired"
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="send-new"]').trigger("click")
    expect(flow.resend).toHaveBeenCalled()
  })

  it("opens the path that the flow gives after the sign-in", async () => {
    await mountSuspended(SignInPage, { route: "/account/sign-in" })
    onSignedIn("/account/welcome?redirect=%2Fcheckout")
    // localePath resolves the route, so the query value comes back decoded.
    expect(navigateToMock).toHaveBeenCalledWith("/account/welcome?redirect=/checkout")
  })

  // The auth middleware sends to.fullPath, which has the locale prefix already. The cart and the
  // checkout send a path with no prefix. localePath resolves both to one prefix.
  it.each([
    ["/id/checkout", "/id/checkout"],
    ["/id", "/id"],
    ["/checkout", "/id/checkout"],
    ["/account/welcome?redirect=%2Fid%2Fcheckout", "/id/account/welcome?redirect=/id/checkout"],
  ])("opens %s with one locale prefix in Indonesian", async (path, expected) => {
    useNuxtApp().$i18n.locale.value = "id"
    await mountSuspended(SignInPage, { route: "/id/account/sign-in" })
    onSignedIn(path)
    expect(navigateToMock).toHaveBeenCalledWith(expected)
  })
})
