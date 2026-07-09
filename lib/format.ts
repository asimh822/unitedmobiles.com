const formatter = new Intl.NumberFormat("en-US");

/** Always `Rs. 45,000` style — never raw numbers. */
export function formatPrice(amount: number): string {
  return `Rs. ${formatter.format(Math.round(amount))}`;
}

export function productTitle(brand: string, model: string): string {
  return `${brand} ${model}`;
}
