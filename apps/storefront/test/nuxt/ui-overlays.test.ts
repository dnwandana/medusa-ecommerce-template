import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#components"

afterEach(() => {
  document.body.innerHTML = ""
})

const open = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => {
  const trigger = wrapper.find("button")
  await trigger.trigger("pointerdown", { button: 0, ctrlKey: false })
  await trigger.trigger("click")
}

describe("overlay components", () => {
  it("opens the dropdown menu content in a portal", async () => {
    const Menu = defineComponent(
      () => () =>
        h(DropdownMenu, () => [
          h(DropdownMenuTrigger, () => "Account"),
          h(DropdownMenuContent, () => h(DropdownMenuItem, () => "Orders")),
        ])
    )
    const wrapper = await mountSuspended(Menu, { attachTo: document.body })
    await open(wrapper)

    expect(document.body.querySelector('[role="menu"]')?.textContent).toContain("Orders")
    expect(document.body.querySelector('[role="menu"]')?.className).toContain("shadow-md")
  })

  it("opens the sheet from the right with the scrim overlay", async () => {
    const Menu = defineComponent(
      () => () =>
        h(Sheet, () => [
          h(SheetTrigger, () => "Menu"),
          h(SheetContent, { side: "right" }, () => h(SheetTitle, () => "Menu")),
        ])
    )
    const wrapper = await mountSuspended(Menu, { attachTo: document.body })
    await wrapper.find("button").trigger("click")

    expect(document.body.querySelector('[role="dialog"]')?.className).toContain("right-0")
    expect(document.body.querySelector('[data-slot="sheet-overlay"]')?.className).toContain(
      "bg-scrim"
    )
  })

  it("mounts a tooltip with no app-level provider", async () => {
    const Tip = defineComponent(
      () => () =>
        h(Tooltip, () => [h(TooltipTrigger, () => "Remove"), h(TooltipContent, () => "Remove")])
    )

    await expect(mountSuspended(Tip, { attachTo: document.body })).resolves.toBeTruthy()
  })
})
