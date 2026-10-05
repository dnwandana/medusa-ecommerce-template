// "currency" style puts a no-break space after "Rp". Thus the code adds the prefix itself.
const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

// Formats an IDR amount for display. Returns "-" when the amount is absent.
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "-"
  }
  return `Rp ${rupiah.format(Math.round(amount))}`
}
