import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isLocalPreview } from "./lib/constants";
import { ChatbotError } from "./lib/errors";

/** Pages anyone may open, signed in or not. */
const publicPages = [
  "/login",
  "/register",
  "/terms",
  "/privacy",
  "/refunds",
  "/contact",
  "/pricing",
  "/download",
];

function isPublicPath(pathname: string) {
  return (
    publicPages.includes(pathname) ||
    pathname.startsWith("/pwa/") ||
    pathname.startsWith("/api/auth/") ||
    // The cron routes check CRON_SECRET themselves.
    pathname.startsWith("/api/cron/")
  );
}

/**
 * Auth.js prefixes its session cookie with `__Secure-` on https, so the proxy
 * has to look for the name Auth.js used. Like Auth.js, it trusts the forwarded
 * protocol, and `AUTH_URL` wins whenever it is set.
 */
function usesSecureCookie(request: NextRequest) {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

  if (authUrl) {
    return authUrl.startsWith("https://");
  }

  const protocol =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol;

  return protocol.startsWith("https");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (isLocalPreview) {
    return pathname === "/login"
      ? NextResponse.redirect(new URL(`${base}/`, request.url))
      : NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: usesSecureCookie(request),
  });

  if (token) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL(`${base}/`, request.url));
    }

    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // A fetch would choke on the login page, so answer API calls in JSON.
  if (pathname.startsWith("/api/")) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  const target = `${base}${pathname}${request.nextUrl.search}`;

  return NextResponse.redirect(
    new URL(
      `${base}/login?callbackUrl=${encodeURIComponent(target)}`,
      request.url
    )
  );
}

export const config = {
  matcher: [
    // Everything except Next's internals and files, which are all public.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};
