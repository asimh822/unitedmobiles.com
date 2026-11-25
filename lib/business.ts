/**
 * Single source of truth for the shop's name, address and phone (NAP).
 *
 * These must match the Google Business Profile exactly — Google cross-checks
 * name/address/phone across the profile, the website and the storefront, and a
 * mismatch weakens the local listing. Change here, and nowhere else.
 */

export const BUSINESS_NAME = "United Mobiles";

/** Landline/mobile shown to customers. Same number as the WhatsApp line. */
export const BUSINESS_PHONE = "+923109627000";

export const BUSINESS_ADDRESS = {
  street: "Shop 1-Rehma, Commercial Centre, Katchehry Road",
  locality: "Multan",
  region: "Punjab",
  postalCode: "60000",
  country: "PK",
} as const;

/** Shop opens 10:30 and closes 22:30, Saturday through Thursday. Closed Friday. Closing moved from 21:00 to 22:30 on 25 Nov 2026 (owner); update the Google Business Profile to match. */
export const OPENING_DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
] as const;

export const OPENS = "10:30";
export const CLOSES = "22:30";
