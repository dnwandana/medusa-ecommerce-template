import { describeBrowser } from "../browser"

const UA = {
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
  samsungAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  firefoxMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
}

describe("describeBrowser", () => {
  it.each([
    [UA.chromeWindows, "Chrome on Windows"],
    [UA.edgeWindows, "Edge on Windows"],
    [UA.safariIphone, "Safari on iOS"],
    [UA.chromeIphone, "Chrome on iOS"],
    [UA.samsungAndroid, "Samsung Internet on Android"],
    [UA.firefoxMac, "Firefox on macOS"],
    [UA.safariMac, "Safari on macOS"],
  ])("describes %s", (agent, text) => {
    expect(describeBrowser(agent)).toBe(text)
  })

  it("uses a general text when a part is unknown", () => {
    expect(describeBrowser("curl/8.5.0")).toBe("An unknown browser")
    expect(describeBrowser("SomeApp (Windows NT 10.0)")).toBe("A browser on Windows")
    expect(describeBrowser("")).toBe("An unknown browser")
    expect(describeBrowser(undefined)).toBe("An unknown browser")
  })
})
