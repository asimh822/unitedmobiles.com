import { NextResponse, type NextRequest } from "next/server";
import { ACCESSORIES_ENABLED } from "@/lib/categories";

/**
 * While Accessories is hidden, send its URLs home with a temporary redirect
 * (the root loading boundary streams a 200 shell before page-level notFound()
 * can set a status, so a soft 404 is the alternative — a redirect is cleaner
 * for visitors and crawlers alike). Delete this middleware, or flip
 * ACCESSORIES_ENABLED, to bring the section back.
 */
export function middleware(request: NextRequest) {
  if (!ACCESSORIES_ENABLED) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/accessories/:path*",
};
