import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import SocialIcon from "~/components/SocialIcon.vue"
import { socialNetwork } from "~/utils/socialNetworks"

describe("SocialIcon", () => {
  it("draws the path of the network with the current colour", async () => {
    const wrapper = await mountSuspended(SocialIcon, { props: { network: "instagram" } })
    const svg = wrapper.get("svg")
    expect(svg.attributes("viewBox")).toBe("0 0 24 24")
    expect(svg.attributes("fill")).toBe("currentColor")
    expect(svg.attributes("aria-hidden")).toBe("true")
    expect(svg.get("path").attributes("d")).toBe(socialNetwork("instagram")!.path)
  })

  it("renders nothing for an unknown network", async () => {
    const wrapper = await mountSuspended(SocialIcon, { props: { network: "myspace" } })
    expect(wrapper.find("svg").exists()).toBe(false)
  })
})
