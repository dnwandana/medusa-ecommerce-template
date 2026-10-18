import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import VerifyPage from "~/pages/account/sign-in/verify.vue"

const { flow, announceSignInMock, navigateToMock } = vi.hoisted(() => ({
  flow: {
    sessionFromLink: vi.fn(),
    checkLink: vi.fn(),
    confirmLink: vi.fn(),
  },
  announceSignInMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useMagicLink", () => () => flow)
mockNuxtImport("announceSignIn", () => announceSignInMock)
mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useLocalePath", () => () => (path: string) => path)

const ROUTE = "/account/sign-in/verify?id=mlr_1&token=tok_1"
const REQUEST = { browser: "Chrome on Windows", requested_at: "2026-10-18T07:32:00.000Z" }

beforeEach(() => {
  // The router of mountSuspended waits for timers. Thus the fake time also moves with the real time.
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.spyOn(window, "close").mockImplementation(() => {})
  flow.sessionFromLink.mockReset()
  flow.checkLink.mockReset()
  flow.confirmLink.mockReset()
  announceSignInMock.mockReset()
  navigateToMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("verify page", () => {
  it("shows One moment while it checks the link", async () => {
    flow.sessionFromLink.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    expect(wrapper.text()).toContain("One moment")
    expect(wrapper.text()).toContain("We check your link.")
  })

  it("signs in this browser and closes when the original tab answers", async () => {
    flow.sessionFromLink.mockResolvedValue("/checkout")
    announceSignInMock.mockResolvedValue(true)
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    expect(flow.sessionFromLink).toHaveBeenCalledWith("mlr_1", "tok_1")
    expect(announceSignInMock).toHaveBeenCalledWith("mlr_1")
    expect(wrapper.text()).toContain("You are signed in")
    expect(wrapper.text()).toContain("This tab closes in 5 seconds.")
    await vi.advanceTimersByTimeAsync(5000)
    expect(window.close).toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    expect(wrapper.text()).toContain("Go back to your other tab. You can close this tab.")
  })

  it("stays open as the signed-in tab when no tab answers", async () => {
    flow.sessionFromLink.mockResolvedValue("/checkout")
    announceSignInMock.mockResolvedValue(false)
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    expect(navigateToMock).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="continue"]').trigger("click")
    expect(navigateToMock).toHaveBeenCalledWith("/checkout")
    await vi.advanceTimersByTimeAsync(6000)
    expect(window.close).not.toHaveBeenCalled()
  })

  it("asks for a confirm on another device and shows the browser and the time", async () => {
    flow.sessionFromLink.mockResolvedValue(null)
    flow.checkLink.mockResolvedValue(REQUEST)
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    expect(flow.checkLink).toHaveBeenCalledWith("mlr_1", "tok_1")
    expect(announceSignInMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("Sign in on your other device?")
    expect(wrapper.text()).toContain("Someone asked for a sign-in link.")
    expect(wrapper.text()).toContain("Chrome on Windows")
    expect(wrapper.text()).toContain("14:32 WIB")
    expect(wrapper.text()).toContain("Nobody signs in without this button.")
    expect(wrapper.text()).not.toContain("@")
  })

  it("shows the busy button while the confirm runs", async () => {
    flow.sessionFromLink.mockResolvedValue(null)
    flow.checkLink.mockResolvedValue(REQUEST)
    flow.confirmLink.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    await wrapper.get('[data-testid="confirm"]').trigger("click")
    const button = wrapper.get('[data-testid="confirm"]')
    expect(button.attributes("aria-busy")).toBe("true")
    expect(button.text()).toBe("Signing you in…")
  })

  it("confirms, shows Done and tries to close", async () => {
    flow.sessionFromLink.mockResolvedValue(null)
    flow.checkLink.mockResolvedValue({ ...REQUEST, browser: "Safari on iPhone" })
    flow.confirmLink.mockResolvedValue(true)
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    await wrapper.get('[data-testid="confirm"]').trigger("click")
    await flushPromises()
    expect(flow.confirmLink).toHaveBeenCalledWith("mlr_1", "tok_1")
    expect(wrapper.text()).toContain("Go back to your other tab. It is signed in now.")
    await vi.advanceTimersByTimeAsync(5000)
    expect(window.close).toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("shows the invalid screen when the confirm finds a closed link", async () => {
    flow.sessionFromLink.mockResolvedValue(null)
    flow.checkLink.mockResolvedValue(REQUEST)
    flow.confirmLink.mockResolvedValue(false)
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    await wrapper.get('[data-testid="confirm"]').trigger("click")
    await flushPromises()
    expect(wrapper.text()).toContain("The link does not work")
  })

  it.each([
    ["no token", "/account/sign-in/verify?id=mlr_1"],
    ["no id", "/account/sign-in/verify?token=tok_1"],
    ["a link that is not open", ROUTE],
  ])("shows the invalid screen for %s", async (_name, route) => {
    flow.sessionFromLink.mockResolvedValue(null)
    flow.checkLink.mockResolvedValue(null)
    const wrapper = await mountSuspended(VerifyPage, { route })
    await flushPromises()
    expect(wrapper.text()).toContain("The link does not work")
    expect(wrapper.get('a[href="/account/sign-in"]').text()).toBe("Sign in again")
  })

  it("does not call the backend for a link with no token", async () => {
    await mountSuspended(VerifyPage, { route: "/account/sign-in/verify?id=mlr_1" })
    await flushPromises()
    expect(flow.sessionFromLink).not.toHaveBeenCalled()
    expect(flow.checkLink).not.toHaveBeenCalled()
  })

  it("shows the invalid screen when the session call fails", async () => {
    flow.sessionFromLink.mockRejectedValue(new Error("HTTP 401"))
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    expect(wrapper.text()).toContain("The link does not work")
  })

  it("stops the close timer when the page unmounts", async () => {
    flow.sessionFromLink.mockResolvedValue("/account")
    announceSignInMock.mockResolvedValue(true)
    const wrapper = await mountSuspended(VerifyPage, { route: ROUTE })
    await flushPromises()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(6000)
    expect(window.close).not.toHaveBeenCalled()
  })
})
