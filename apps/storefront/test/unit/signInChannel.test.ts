import { afterEach, describe, expect, it, vi } from "vitest"
import { announceSignIn, listenForSignIn } from "../../app/utils/signInChannel"

const stops: (() => void)[] = []
afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  vi.unstubAllGlobals()
})

describe("signInChannel", () => {
  it("gets an answer from the original tab of the same request", async () => {
    const onSignIn = vi.fn()
    stops.push(listenForSignIn("mlr_1", onSignIn))
    expect(await announceSignIn("mlr_1", 500)).toBe(true)
    await vi.waitFor(() => expect(onSignIn).toHaveBeenCalledTimes(1))
  })

  it("gets no answer for a different request", async () => {
    const onSignIn = vi.fn()
    stops.push(listenForSignIn("mlr_1", onSignIn))
    expect(await announceSignIn("mlr_2", 100)).toBe(false)
    expect(onSignIn).not.toHaveBeenCalled()
  })

  it("gets no answer when no tab listens", async () => {
    expect(await announceSignIn("mlr_1", 100)).toBe(false)
  })

  it("calls onSignIn one time for two messages", async () => {
    const onSignIn = vi.fn()
    stops.push(listenForSignIn("mlr_1", onSignIn))
    await announceSignIn("mlr_1", 200)
    await announceSignIn("mlr_1", 200)
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it("works with no BroadcastChannel", async () => {
    vi.stubGlobal("BroadcastChannel", undefined)
    const stop = listenForSignIn("mlr_1", vi.fn())
    expect(() => stop()).not.toThrow()
    expect(await announceSignIn("mlr_1", 50)).toBe(false)
  })
})
