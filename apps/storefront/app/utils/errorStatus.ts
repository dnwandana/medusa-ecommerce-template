// Returns the HTTP status of an SDK error. The SDK throws a FetchError with the property status.
// A network failure has no status, so the result is undefined.
export function errorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status
    return typeof status === "number" ? status : undefined
  }
  return undefined
}
