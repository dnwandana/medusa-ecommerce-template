import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, ref } from "vue"
import { searchPath, useSearchSuggestions } from "~/composables/useSearchSuggestions"

const { listProducts } = vi.hoisted(() => ({ listProducts: vi.fn() }))
mockNuxtImport("useCatalog", () => () => ({ listProducts }))

beforeEach(() => {
  vi.useFakeTimers()
  listProducts.mockReset().mockResolvedValue({ products: [{ id: "p_1" }], count: 1 })
})
afterEach(() => vi.useRealTimers())

function setup() {
  const query = ref("")
  const scope = effectScope()
  const result = scope.run(() => useSearchSuggestions(query))!
  return { query, scope, ...result }
}

describe("useSearchSuggestions", () => {
  it("waits 300 ms after the last key", async () => {
    const { query, products, pending } = setup()
    query.value = "li"
    await nextTick()
    query.value = "lin"
    await nextTick()
    expect(pending.value).toBe(true)

    await vi.advanceTimersByTimeAsync(299)
    expect(listProducts).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(listProducts).toHaveBeenCalledTimes(1)
    expect(listProducts).toHaveBeenCalledWith({ q: "lin", limit: 5 })
    expect(products.value).toEqual([{ id: "p_1" }])
    expect(pending.value).toBe(false)
  })

  it("does not search below 2 characters", async () => {
    const { query, active, products } = setup()
    query.value = " l "
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)

    expect(active.value).toBe(false)
    expect(listProducts).not.toHaveBeenCalled()
    expect(products.value).toEqual([])
  })

  it("clears the products when the text gets too short", async () => {
    const { query, products, pending } = setup()
    query.value = "linen"
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(products.value).toEqual([{ id: "p_1" }])

    query.value = "l"
    await nextTick()
    expect(products.value).toEqual([])
    expect(pending.value).toBe(false)
  })

  it("ignores the answer for an older text", async () => {
    let resolveOld!: (value: unknown) => void
    listProducts.mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
    listProducts.mockResolvedValueOnce({ products: [{ id: "p_new" }], count: 1 })
    const { query, products } = setup()

    query.value = "lin"
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    query.value = "linen"
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    resolveOld({ products: [{ id: "p_old" }], count: 1 })
    await vi.runAllTimersAsync()

    expect(products.value).toEqual([{ id: "p_new" }])
  })

  it("gives no product when the request fails", async () => {
    listProducts.mockRejectedValue(new Error("down"))
    const { query, products } = setup()
    query.value = "linen"
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)

    expect(products.value).toEqual([])
  })

  it("stops the timer when the scope ends", async () => {
    const { query, scope } = setup()
    query.value = "linen"
    await nextTick()
    scope.stop()
    await vi.advanceTimersByTimeAsync(300)

    expect(listProducts).not.toHaveBeenCalled()
  })

  it("makes the search page path", () => {
    expect(searchPath(" linen shirt ")).toBe("/search?q=linen%20shirt")
    expect(searchPath("  ")).toBeNull()
  })
})
