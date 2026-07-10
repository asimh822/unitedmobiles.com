const formatter = new Intl.NumberFormat("en-US");

/** Always `Rs. 45,000` style — never raw numbers. */
export function formatPrice(amount: number): string {
  return `Rs. ${formatter.format(Math.round(amount))}`;
}

export function productTitle(brand: string, model: string): string {
  return `${brand} ${model}`;
}

/** CSV imports leave bare numbers ("8", "128") in RAM/storage — display them
 * as "8GB"/"128GB" without touching already-formatted values. */
export function formatGb(value: string): string {
  const v = value.trim();
  return /^\d+$/.test(v) ? `${v}GB` : v;
}
