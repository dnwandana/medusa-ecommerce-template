import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope } from "vue"
import { afterSignInPath, useMagicLink } from "~/composables/useMagicLink"
import { readMagicLink, saveMagicLink } from "~/utils/magicLinkStorage"

const { sdk, customerMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    sdk: { client: { fetch: vi.fn() } },
    customerMock: {
      customer: ref<{ id: string } | null>(null),
      refresh: vi.fn(),
      signInWithToken: vi.fn(),
      needsWelcome: ref(false),
    },
  }
})

mockNuxtImport("useMedusa", () => () => sdk)
mockNuxtImport("useCustomer", () => () => customerMock)

const httpError = (status: number) => Object.assign(new Error(), { status })

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  sdk.client.fetch.mockReset()
  customerMock.customer.value = null
  customerMock.needsWelcome.value = false
  customerMock.refresh.mockReset().mockResolvedValue(undefined)
  customerMock.signInWithToken.mockReset().mockResolvedValue(undefined)
})

afterEach(() => vi.useRealTimers())

describe("afterSignInPath", () => {
  it.each([
    [true, "/checkout", "/account/welcome?redirect=%2Fcheckout"],
    [true, null, "/account/welcome"],
    [true, "//evil.example", "/account/welcome"],
    [false, "/checkout", "/checkout"],
    [false, null, "/account"],
    [false, "https://evil.example", "/account"],
  ])("needsWelcome=%s redirect=%s gives %s", (welcome, redirect, path) => {
    expect(afterSignInPath(welcome, redirect)).toBe(path)
  })
})

describe("useMagicLink", () => {
  it("sends the link, saves the record and waits", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink(" Sari@Example.com ", "/checkout")
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/magic-link", {
      method: "POST",
      body: { email: "sari@example.com" },
    })
    expect(flow.phase.value).toBe("waiting")
    expect(flow.email.value).toBe("sari@example.com")
    expect(readMagicLink()).toMatchObject({
      request_id: "mlr_1",
      secret: "sec",
      redirect: "/checkout",
    })
    expect(flow.resendAt.value).toBe(Date.now() + 60_000)
    flow.stop()
  })

  it("rejects an email with no @ and sends nothing", async () => {
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari", null)
    expect(flow.error.value).toBe("invalid")
    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it.each([
    [429, "rate_limited"],
    [500, "failed"],
  ])("maps HTTP %s to %s", async (status, code) => {
    sdk.client.fetch.mockRejectedValueOnce(httpError(status))
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari@example.com", null)
    expect(flow.error.value).toBe(code)
    expect(flow.phase.value).toBe("form")
  })

  it("signs in when the poll sees confirmed", async () => {
    const onSignedIn = vi.fn()
    sdk.client.fetch
      .mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "confirmed" })
      .mockResolvedValueOnce({ token: "jwt_1" })
    const flow = useMagicLink({ onSignedIn })
    await flow.requestLink("sari@example.com", "/checkout")
    await vi.advanceTimersByTimeAsync(6000)
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/magic-link/status", {
      method: "POST",
      body: { id: "mlr_1", secret: "sec" },
    })
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/magic-link/session", {
      method: "POST",
      body: { id: "mlr_1", secret: "sec" },
    })
    expect(customerMock.signInWithToken).toHaveBeenCalledWith("jwt_1")
    expect(onSignedIn).toHaveBeenCalledTimes(1)
    expect(onSignedIn).toHaveBeenCalledWith("/checkout")
    expect(readMagicLink()).toBeNull()

    await vi.advanceTimersByTimeAsync(9000)
    expect(sdk.client.fetch).toHaveBeenCalledTimes(4)
  })

  it("finishes without the session call when the verify tab signed in", async () => {
    const onSignedIn = vi.fn()
    sdk.client.fetch
      .mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
      .mockResolvedValueOnce({ status: "used" })
    customerMock.refresh.mockImplementation(async () => {
      customerMock.customer.value = { id: "cus_1" }
    })
    customerMock.needsWelcome.value = true
    const flow = useMagicLink({ onSignedIn })
    await flow.requestLink("sari@example.com", null)
    await vi.advanceTimersByTimeAsync(3000)

    expect(sdk.client.fetch).toHaveBeenCalledTimes(2)
    expect(onSignedIn).toHaveBeenCalledWith("/account/welcome")
  })

  it("goes to expired when the link is used and this browser has no session", async () => {
    sdk.client.fetch
      .mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
      .mockResolvedValueOnce({ status: "used" })
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari@example.com", null)
    await vi.advanceTimersByTimeAsync(3000)

    expect(flow.phase.value).toBe("expired")
  })

  it("keeps the poll after a network error", async () => {
    sdk.client.fetch
      .mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ status: "pending" })
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari@example.com", null)
    await vi.advanceTimersByTimeAsync(6000)
    expect(flow.phase.value).toBe("waiting")
    expect(sdk.client.fetch).toHaveBeenCalledTimes(3)
    flow.stop()
  })

  it("goes to expired after 15 minutes", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
    sdk.client.fetch.mockResolvedValue({ status: "pending" })
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari@example.com", null)
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 3000)
    expect(flow.phase.value).toBe("expired")
  })

  it("resends to the stored email and keeps the wait", async () => {
    sdk.client.fetch
      .mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
      .mockResolvedValueOnce({ request_id: "mlr_2", secret: "sec2", expires_at: "x" })
      .mockRejectedValueOnce(httpError(429))
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari@example.com", "/checkout")
    await flow.resend()

    expect(sdk.client.fetch).toHaveBeenLastCalledWith("/store/magic-link", {
      method: "POST",
      body: { email: "sari@example.com" },
    })
    expect(flow.sentAgain.value).toBe(true)
    expect(readMagicLink()).toMatchObject({ request_id: "mlr_2", redirect: "/checkout" })

    await flow.resend()
    expect(flow.error.value).toBe("rate_limited")
    expect(flow.phase.value).toBe("waiting")
    flow.stop()
  })

  it("clears the old note at a failed resend and the error at a new request", async () => {
    sdk.client.fetch
      .mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
      .mockResolvedValueOnce({ request_id: "mlr_2", secret: "sec2", expires_at: "x" })
      .mockRejectedValueOnce(new Error("Brevo is down"))
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari@example.com", null)
    await flow.resend()
    expect(flow.sentAgain.value).toBe(true)

    await flow.resend()
    expect(flow.error.value).toBe("failed")
    expect(flow.sentAgain.value).toBe(false)

    sdk.client.fetch.mockImplementationOnce(async () => {
      // The error goes away when the new request starts, not when the answer comes.
      expect(flow.error.value).toBeNull()
      return { request_id: "mlr_3", secret: "sec3", expires_at: "x" }
    })
    await flow.resend()
    expect(flow.error.value).toBeNull()
    expect(flow.sentAgain.value).toBe(true)
    flow.stop()
  })

  it("goes back to the form for a different email", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    await flow.requestLink("sari@example.com", null)
    flow.useDifferentEmail()

    expect(flow.phase.value).toBe("form")
    expect(readMagicLink()).toBeNull()
    await vi.advanceTimersByTimeAsync(9000)
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
  })

  it("resumes a stored record that is younger than 15 minutes", () => {
    saveMagicLink({
      request_id: "mlr_1",
      secret: "sec",
      email: "sari@example.com",
      redirect: null,
      sent_at: Date.now() - 60_000,
    })
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    expect(flow.resume()).toBe(true)
    expect(flow.phase.value).toBe("waiting")
    expect(flow.email.value).toBe("sari@example.com")
    flow.stop()
  })

  it("does not resume a record that is older than 15 minutes", () => {
    saveMagicLink({
      request_id: "mlr_1",
      secret: "sec",
      email: "sari@example.com",
      redirect: null,
      sent_at: Date.now() - 15 * 60 * 1000,
    })
    const flow = useMagicLink({ onSignedIn: vi.fn() })
    expect(flow.resume()).toBe(false)
    expect(flow.phase.value).toBe("form")
  })

  it("stops the poll when the scope ends", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ request_id: "mlr_1", secret: "sec", expires_at: "x" })
    const scope = effectScope()
    const flow = scope.run(() => useMagicLink({ onSignedIn: vi.fn() }))!
    await flow.requestLink("sari@example.com", null)
    scope.stop()
    await vi.advanceTimersByTimeAsync(9000)
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
  })

  it("gives null from sessionFromLink for a link of another device", async () => {
    saveMagicLink({
      request_id: "mlr_9",
      secret: "sec",
      email: "a@b.c",
      redirect: null,
      sent_at: Date.now(),
    })
    expect(await useMagicLink({ onSignedIn: vi.fn() }).sessionFromLink("mlr_1", "tok")).toBeNull()
    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it("signs in the same browser from the link", async () => {
    saveMagicLink({
      request_id: "mlr_1",
      secret: "sec",
      email: "a@b.c",
      redirect: "/checkout",
      sent_at: Date.now(),
    })
    sdk.client.fetch.mockResolvedValueOnce({ token: "jwt_1" })
    const path = await useMagicLink({ onSignedIn: vi.fn() }).sessionFromLink("mlr_1", "tok")
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/magic-link/session", {
      method: "POST",
      body: { id: "mlr_1", secret: "sec", token: "tok" },
    })
    expect(customerMock.signInWithToken).toHaveBeenCalledWith("jwt_1")
    expect(readMagicLink()).toBeNull()
    expect(path).toBe("/checkout")
  })

  it("gives null from checkLink for a link that is not open", async () => {
    sdk.client.fetch.mockRejectedValueOnce(httpError(400))
    expect(await useMagicLink({ onSignedIn: vi.fn() }).checkLink("mlr_1", "tok")).toBeNull()
  })

  it("reads the browser and the time of the request from checkLink", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ browser: "Safari on iPhone", requested_at: "t" })
    expect(await useMagicLink({ onSignedIn: vi.fn() }).checkLink("mlr_1", "tok")).toEqual({
      browser: "Safari on iPhone",
      requested_at: "t",
    })
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/magic-link/verify", {
      method: "POST",
      body: { id: "mlr_1", token: "tok" },
    })
  })

  it("confirms a link, and gives false for a link that is not open", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ confirmed: true })
    sdk.client.fetch.mockRejectedValueOnce(httpError(400))
    const flow = useMagicLink({ onSignedIn: vi.fn() })

    expect(await flow.confirmLink("mlr_1", "tok")).toBe(true)
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/magic-link/confirm", {
      method: "POST",
      body: { id: "mlr_1", token: "tok" },
    })
    expect(await flow.confirmLink("mlr_1", "tok")).toBe(false)
  })
})
