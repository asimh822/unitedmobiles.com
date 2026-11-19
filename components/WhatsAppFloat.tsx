"use client";

import { usePathname } from "next/navigation";
import { buildChatLink } from "@/lib/whatsapp";

/** Persistent floating "Chat with us" button, site-wide general inquiries.
 * Hidden on /build, where a fixed "Find my real phone" bar owns the bottom
 * of the screen and every result card has its own WhatsApp button. */
export default function WhatsAppFloat() {
  const pathname = usePathname();
  if (pathname === "/build") return null;
  return (
    <a
      href={buildChatLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`wa-pulse fixed right-4 z-40 flex items-center gap-2 rounded-full bg-wa p-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-5 sm:px-4 sm:py-3 ${
        // Product pages have a Buy Now bar along the bottom of a phone screen.
        pathname.startsWith("/products/") ? "bottom-24 lg:bottom-5" : "bottom-5"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current sm:h-5 sm:w-5" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.1-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z" />
      </svg>
      <span className="hidden sm:inline">Chat with us</span>
    </a>
  );
}
