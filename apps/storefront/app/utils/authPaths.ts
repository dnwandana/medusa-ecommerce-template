// All code that opens the sign-in page uses this constant, so a change of the path is one line.
export const SIGN_IN_PATH = "/account/sign-in"

// Returns the sign-in route. The redirect query comes back to the target path after the sign-in.
// The caller passes the path through useLocalePath().
export function signInTarget(redirect?: string): { path: string; query: { redirect?: string } } {
  return { path: SIGN_IN_PATH, query: redirect ? { redirect } : {} }
}
