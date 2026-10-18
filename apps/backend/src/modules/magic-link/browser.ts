// The order of the lists matters: the first match wins. Edge, Opera and Samsung Internet also
// send "Chrome/", and Chrome on iOS sends "Safari/". An iPhone sends "like Mac OS X", so iOS
// comes before macOS.
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Version\/.*Safari\/|Safari\/.*Version\//, "Safari"],
]

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  [/Windows/, "Windows"],
  [/Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
]

function firstMatch(list: [RegExp, string][], userAgent: string): string | undefined {
  return list.find(([pattern]) => pattern.test(userAgent))?.[1]
}

// Returns a short text such as "Chrome on Windows" for the email and the confirm screen. The
// text has no version number.
export function describeBrowser(userAgent: string | null | undefined): string {
  const agent = typeof userAgent === "string" ? userAgent : ""
  const browser = firstMatch(BROWSERS, agent)
  const system = firstMatch(SYSTEMS, agent)
  if (browser && system) return `${browser} on ${system}`
  if (browser) return browser
  if (system) return `A browser on ${system}`
  return "An unknown browser"
}
