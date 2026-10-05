export type ShippingItem = {
  quantity: number | string
  variant?: { weight?: number | null } | null
}

const GRAMS_PER_KG = 1000

// Returns the shipping price in whole rupiah for the cart items.
export function calculateShippingAmount(items: ShippingItem[], ratePerKg: number): number {
  const grams = items.reduce((sum, item) => {
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return sum
    }
    const weight = Number(item.variant?.weight)
    // A missing or invalid weight counts as 1 kg for each unit.
    const unitGrams = Number.isFinite(weight) && weight > 0 ? weight : GRAMS_PER_KG
    return sum + unitGrams * quantity
  }, 0)

  // Round one time, after the sum, so that small items share one kilogram.
  const kilograms = Math.max(1, Math.ceil(grams / GRAMS_PER_KG))
  return kilograms * ratePerKg
}
