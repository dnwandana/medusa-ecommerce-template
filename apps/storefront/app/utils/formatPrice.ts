// "currency" style puts a no-break space after "Rp". Thus the code adds the prefix itself.
const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

// Formats an IDR amount for display. Returns "-" when the amount is absent.
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "-"
  }
  return `Rp ${rupiah.format(Math.round(amount))}`
}

// Formats a delivery price. A price of 0 shows the free label, not "Rp 0".
export function formatDeliveryPrice(amount: number | null | undefined, freeLabel: string): string {
  return amount === 0 ? freeLabel : formatPrice(amount)
}
