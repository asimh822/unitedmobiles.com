import {
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
  BUSINESS_PHONE,
  CLOSES,
  OPENING_DAYS,
  OPENS,
} from "@/lib/business";
import { SITE_URL } from "@/lib/site";

/**
 * Structured data for the shop, so Google can read the address, hours and phone
 * rather than guessing them from the page text.
 *
 * MobilePhoneStore is a schema.org subtype of Store — more specific than a bare
 * LocalBusiness, which helps Google match the site to the Business Profile.
 *
 * Friday is simply absent from openingHoursSpecification; that is how schema.org
 * expresses "closed", and it matches the profile.
 */
export default function LocalBusinessJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MobilePhoneStore",
    "@id": `${SITE_URL}/#shop`,
    name: BUSINESS_NAME,
    description:
      "Official Vivo outlet on Katchehry Road, Multan. Genuine mobile phones " +
      "with official warranty, plus used phones, keypad phones and tablets. " +
      "Same-day delivery across Multan, cash on delivery.",
    url: SITE_URL,
    image: `${SITE_URL}/shop-logo.png`,
    telephone: BUSINESS_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_ADDRESS.street,
      addressLocality: BUSINESS_ADDRESS.locality,
      addressRegion: BUSINESS_ADDRESS.region,
      postalCode: BUSINESS_ADDRESS.postalCode,
      addressCountry: BUSINESS_ADDRESS.country,
    },
    openingHoursSpecification: OPENING_DAYS.map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${day}`,
      opens: OPENS,
      closes: CLOSES,
    })),
    areaServed: {
      "@type": "City",
      name: "Multan",
    },
    currenciesAccepted: "PKR",
    paymentAccepted: "Cash on Delivery",
    priceRange: "₨₨",
  };

  return (
    <script
      type="application/ld+json"
      // Schema is built from constants above — no user input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
