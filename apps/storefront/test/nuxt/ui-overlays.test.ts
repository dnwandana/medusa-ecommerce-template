import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
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

const openDialog = async () => {
  const Box = defineComponent(
    () => () =>
      h(Dialog, { open: true }, () =>
        h(DialogContent, () => [
          h(DialogTitle, () => "Add address"),
          h(DialogDescription, () => ""),
        ])
      )
  )
  await mountSuspended(Box, { attachTo: document.body })
}

const openAlertDialog = async () => {
  const Box = defineComponent(
    () => () =>
      h(AlertDialog, { open: true }, () =>
        h(AlertDialogContent, () => [
          h(AlertDialogTitle, () => "Delete this address?"),
          h(AlertDialogDescription, () => ""),
        ])
      )
  )
  await mountSuspended(Box, { attachTo: document.body })
}

const openSheet = async (side: "top" | "right" | "bottom" | "left") => {
  const Box = defineComponent(
    () => () =>
      h(Sheet, { open: true }, () => h(SheetContent, { side }, () => h(SheetTitle, () => "Menu")))
  )
  await mountSuspended(Box, { attachTo: document.body })
}

const openDropdown = async () => {
  const Menu = defineComponent(
    () => () =>
      h(DropdownMenu, () => [
        h(DropdownMenuTrigger, () => "Account"),
        h(DropdownMenuContent, () => h(DropdownMenuItem, () => "Orders")),
      ])
  )
  const wrapper = await mountSuspended(Menu, { attachTo: document.body })
  await open(wrapper)
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
    expect(document.body.querySelector('[role="menu"]')?.className).toContain("shadow-lg")
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

  it("opens the dialog with the scrim overlay", async () => {
    const Box = defineComponent(
      () => () =>
        h(Dialog, { open: true }, () =>
          h(DialogContent, () => [
            h(DialogTitle, () => "Add address"),
            h(DialogDescription, () => ""),
          ])
        )
    )
    await mountSuspended(Box, { attachTo: document.body })

    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain("Add address")
    expect(document.body.querySelector('[data-slot="dialog-overlay"]')?.className).toContain(
      "bg-scrim"
    )
  })

  it("opens the alert dialog as an alertdialog with the scrim overlay", async () => {
    const Box = defineComponent(
      () => () =>
        h(AlertDialog, { open: true }, () =>
          h(AlertDialogContent, () => [
            h(AlertDialogTitle, () => "Delete this address?"),
            h(AlertDialogDescription, () => ""),
          ])
        )
    )
    await mountSuspended(Box, { attachTo: document.body })

    expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain(
      "Delete this address?"
    )
    expect(document.body.querySelector('[data-slot="alert-dialog-overlay"]')?.className).toContain(
      "bg-scrim"
    )
  })

  it("draws the dialog square on the warm scrim and full screen on phones", async () => {
    await openDialog()
    const content = document.querySelector("[data-slot='dialog-content']")!
    const overlay = document.querySelector("[data-slot='dialog-overlay']")!
    expect(content.className).toContain("rounded-none")
    expect(content.className).toContain("shadow-lg")
    expect(content.className).toContain("h-dvh")
    expect(content.className).toContain("md:max-w-[560px]")
    expect(overlay.className).toContain("bg-scrim")
  })

  it("keeps the alert dialog centred on phones", async () => {
    await openAlertDialog()
    const content = document.querySelector("[data-slot='alert-dialog-content']")!
    expect(content.className).toContain("rounded-none")
    expect(content.className).toContain("max-w-[calc(100%-32px)]")
    expect(content.className).not.toContain("h-dvh")
  })

  it.each(["left", "bottom"] as const)(
    "draws the %s sheet square with a large shadow",
    async (side) => {
      await openSheet(side)
      const content = document.querySelector("[data-slot='sheet-content']")!
      expect(content.className).toContain("rounded-none")
      expect(content.className).toContain("shadow-lg")
      expect(document.querySelector("[data-slot='sheet-overlay']")!.className).toContain("bg-scrim")
      expect(
        document.querySelector("[data-slot='sheet-close'] button, [data-slot='sheet-close']")!
          .className
      ).toContain("size-11")
    }
  )

  it("limits the bottom sheet to 85 percent of the screen", async () => {
    await openSheet("bottom")
    expect(document.querySelector("[data-slot='sheet-content']")!.className).toContain(
      "max-h-[85dvh]"
    )
  })

  it("draws the dropdown square with 44 px items", async () => {
    await openDropdown()
    const content = document.querySelector("[data-slot='dropdown-menu-content']")!
    expect(content.className).toEqual(expect.stringContaining("rounded-none"))
    expect(content.className).toContain("min-w-[220px]")
    expect(document.querySelector("[data-slot='dropdown-menu-item']")!.className).toContain(
      "min-h-11"
    )
  })
})
