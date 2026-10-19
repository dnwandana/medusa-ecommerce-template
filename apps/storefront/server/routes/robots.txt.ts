import { robotsTxt } from "../utils/robots"

export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8")
  return robotsTxt(useRuntimeConfig(event).public.siteUrl)
})
