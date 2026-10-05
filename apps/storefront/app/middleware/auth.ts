// Sends a guest to the login page. The login page comes back to the target path.
// The Nuxt server does not have the session cookie, so the check runs in the browser only.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  // The Nuxt context is not available after an await. Get the composables here.
  const { customer, ensureLoaded } = useCustomer()
  const localePath = useLocalePath()

  let loggedIn = false
  try {
    await ensureLoaded()
    loggedIn = customer.value !== null
  } catch {
    // The backend did not answer. The login page shows the error of the next request.
  }

  if (!loggedIn) {
    return navigateTo({ path: localePath("/account/login"), query: { redirect: to.fullPath } })
  }
})
