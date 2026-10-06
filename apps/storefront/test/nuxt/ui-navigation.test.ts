import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Pagination,
  PaginationContent,
  PaginationItem,
} from "#components"

describe("navigation components", () => {
  it("renders a breadcrumb nav with the current page", async () => {
    const Crumbs = defineComponent(
      () => () =>
        h(Breadcrumb, () =>
          h(BreadcrumbList, () => [
            h(BreadcrumbItem, () => "Products"),
            h(BreadcrumbSeparator),
            h(BreadcrumbItem, () => h(BreadcrumbPage, () => "Shirts")),
          ])
        )
    )
    const wrapper = await mountSuspended(Crumbs)

    expect(wrapper.find('nav[aria-label="breadcrumb"]').exists()).toBe(true)
    expect(wrapper.find('[aria-current="page"]').text()).toBe("Shirts")
  })

  it("marks the active pagination item with the outline style", async () => {
    const Pages = defineComponent(
      () => () =>
        h(Pagination, { total: 36, itemsPerPage: 12, page: 2 }, () =>
          h(PaginationContent, null, {
            default: ({ items }: { items: Array<{ type: string; value: number }> }) =>
              items.map((item) =>
                h(PaginationItem, { value: item.value, isActive: item.value === 2 }, () =>
                  String(item.value)
                )
              ),
          })
        )
    )
    const wrapper = await mountSuspended(Pages)
    const active = wrapper.findAll("button").find((button) => button.text() === "2")!

    expect(active.classes()).toContain("border-input")
    expect(active.classes()).toContain("size-11")
  })
})
