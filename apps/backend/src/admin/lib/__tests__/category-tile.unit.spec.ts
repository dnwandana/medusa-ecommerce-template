import { readCategoryTile, removeTilePrompt, tileCaption, withCategoryTile } from "../category-tile"

describe("category tile", () => {
  it("reads the tile from the metadata", () => {
    expect(readCategoryTile(null)).toEqual({ show: false, imageUrl: null })
    expect(readCategoryTile({ show_on_home: "true", tile_image_url: "" })).toEqual({
      show: false,
      imageUrl: null,
    })
    expect(
      readCategoryTile({ show_on_home: true, tile_image_url: "https://assets.example.com/w.jpg" })
    ).toEqual({ show: true, imageUrl: "https://assets.example.com/w.jpg" })
  })

  it("keeps the other metadata keys", () => {
    expect(withCategoryTile({ note: "a" }, { show: true, imageUrl: null })).toEqual({
      note: "a",
      show_on_home: true,
      tile_image_url: "",
    })
  })

  it("explains where the tile image comes from", () => {
    const shown = { show: true, imageUrl: null }
    expect(tileCaption(shown, { title: "Silk Slip Dress" }, "Women")).toBe(
      "The tile uses the thumbnail of Silk Slip Dress, the newest product in Women."
    )
    expect(tileCaption(shown, null, "Women")).toBe(
      "Women has no product. The tile has no image until you upload one."
    )
    expect(tileCaption({ show: true, imageUrl: "https://x/w.jpg" }, null, "Women")).toBe(
      "The uploaded image replaces the automatic image."
    )
  })

  it("names the category in the remove prompt", () => {
    expect(removeTilePrompt("Women")).toEqual({
      title: "Remove the tile image?",
      description:
        "The tile uses the automatic image again: the thumbnail of the newest product in Women.",
    })
  })
})
