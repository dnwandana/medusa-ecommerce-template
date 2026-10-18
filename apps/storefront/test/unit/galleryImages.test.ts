import { describe, expect, it } from "vitest"
import { galleryImages, type GalleryImage } from "~/utils/galleryImages"

const product = {
  thumbnail: "/thumb.jpg",
  options: [{ id: "opt_c", title: "Colour", values: [{ value: "Sand" }, { value: "Sage" }] }],
  variants: [
    { id: "v_sand_m", options: [{ option_id: "opt_c", value: "Sand" }] },
    { id: "v_sage_m", options: [{ option_id: "opt_c", value: "Sage" }] },
    { id: "v_navy_m", options: [{ option_id: "opt_c", value: "Navy" }] },
  ],
  images: [
    { id: "img_fabric", url: "/fabric.jpg", rank: 3, variants: [] },
    { id: "img_sage", url: "/sage.jpg", rank: 1, variants: [{ id: "v_sage_m" }] },
    { id: "img_sand_2", url: "/sand-2.jpg", rank: 2, variants: [{ id: "v_sand_m" }] },
    { id: "img_sand_1", url: "/sand-1.jpg", rank: 0, variants: [{ id: "v_sand_m" }] },
  ],
} as never

const ids = (images: GalleryImage[]) => images.map((image) => image.id)

describe("galleryImages", () => {
  it("shows the linked images of the colour and the unlinked images, in rank order", () => {
    expect(ids(galleryImages(product, "Sand"))).toEqual(["img_sand_1", "img_sand_2", "img_fabric"])
    expect(ids(galleryImages(product, "Sage"))).toEqual(["img_sage", "img_fabric"])
  })

  it("uses the first colour before a selection", () => {
    expect(ids(galleryImages(product, null))).toEqual(["img_sand_1", "img_sand_2", "img_fabric"])
  })

  it("shows all the images for a colour with no linked image", () => {
    expect(ids(galleryImages(product, "Navy"))).toEqual([
      "img_sand_1",
      "img_sage",
      "img_sand_2",
      "img_fabric",
    ])
  })

  it("shows all the images when the product has no colour option", () => {
    expect(galleryImages({ ...(product as object), options: [] } as never, null)).toHaveLength(4)
  })

  it("uses the thumbnail when the product has no image", () => {
    expect(galleryImages({ thumbnail: "/t.jpg", images: [] } as never, null)).toEqual([
      { id: "thumbnail", url: "/t.jpg" },
    ])
    expect(galleryImages({ thumbnail: null, images: [] } as never, null)).toEqual([])
  })

  it("reads the links from the images of the variants", () => {
    // The Store API returns the link as variants.images, not as images.variants.
    const fromVariants = {
      options: [{ id: "opt_c", title: "Warna", values: [{ value: "Sand" }, { value: "Sage" }] }],
      variants: [
        {
          id: "v_sand",
          options: [{ option_id: "opt_c", value: "Sand" }],
          images: [{ id: "img_a" }],
        },
        {
          id: "v_sage",
          options: [{ option_id: "opt_c", value: "Sage" }],
          images: [{ id: "img_b" }],
        },
      ],
      images: [
        { id: "img_b", url: "/b.jpg", rank: 0 },
        { id: "img_a", url: "/a.jpg", rank: 1 },
        { id: "img_c", url: "/c.jpg" },
      ],
    } as never

    expect(ids(galleryImages(fromVariants, "Sage"))).toEqual(["img_b", "img_c"])
    expect(ids(galleryImages(fromVariants, null))).toEqual(["img_a", "img_c"])
  })
})
