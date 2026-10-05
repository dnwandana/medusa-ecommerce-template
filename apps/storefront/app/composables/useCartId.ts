import type { Ref } from "vue"

// Returns the cookie that keeps the cart ID. The browser keeps it for 30 days.
// The return from Mayar is a top-level navigation, so "lax" lets the browser send the cookie.
export function useCartId(): Ref<string | null | undefined> {
  return useCookie<string | null>("cart_id", {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    path: "/",
  })
}
