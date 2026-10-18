import { CATEGORY_SHOW_ON_HOME, CATEGORY_TILE_IMAGE_URL } from "../../lib/storefront-metadata"

export type CategoryTile = { show: boolean; imageUrl: string | null }

type Metadata = Record<string, unknown> | null | undefined

/** Returns the home page tile of a category. Staff can type metadata by hand, so only the
 * boolean `true` shows the tile. */
export function readCategoryTile(metadata: Metadata): CategoryTile {
  const url = metadata?.[CATEGORY_TILE_IMAGE_URL]
  return {
    show: metadata?.[CATEGORY_SHOW_ON_HOME] === true,
    imageUrl: typeof url === "string" && url.trim() !== "" ? url : null,
  }
}

/**
 * Returns the category metadata with the tile values. It keeps the other keys. A null image
 * writes "": Medusa removes a metadata key whose value is "", and each reader treats "" as no
 * image.
 */
export function withCategoryTile(metadata: Metadata, tile: CategoryTile): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [CATEGORY_SHOW_ON_HOME]: tile.show,
    [CATEGORY_TILE_IMAGE_URL]: tile.imageUrl ?? "",
  }
}

/** Returns the text that tells staff where the tile image comes from. */
export function tileCaption(
  tile: CategoryTile,
  newest: { title: string } | null,
  categoryName: string
): string {
  if (tile.imageUrl) {
    return "The uploaded image replaces the automatic image."
  }
  if (!newest) {
    return `${categoryName} has no product. The tile has no image until you upload one.`
  }
  return `The tile uses the thumbnail of ${newest.title}, the newest product in ${categoryName}.`
}

/** Returns the texts of the prompt before staff remove the uploaded tile image. */
export function removeTilePrompt(categoryName: string): { title: string; description: string } {
  return {
    title: "Remove the tile image?",
    description: `The tile uses the automatic image again: the thumbnail of the newest product in ${categoryName}.`,
  }
}
