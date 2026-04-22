import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedEntryHref, getLoginHref, isProtectedPath } from "@/lib/auth-routing";
import { getWebEnv } from "@/lib/env";
import { isRetryableSupabaseAuthError } from "@/lib/supabase/auth-errors";
import { logAuthTransportFailure } from "@/lib/supabase/auth-observability";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuthSurface =
    pathname === "/" ||
    pathname === "/login" ||
    isProtectedPath(pathname);

  if (!isAuthSurface) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  const { supabaseUrl, supabaseAnonKey } = getWebEnv();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let user = null;

  try {
    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();
    user = authenticatedUser;
  } catch (error) {
    if (!isRetryableSupabaseAuthError(error)) {
      throw error;
    }

    logAuthTransportFailure({
      source: "middleware",
      path: pathname,
      error,
    });
  }

  response.headers.set("Cache-Control", "private, no-store");

  if (user && (pathname === "/" || pathname === "/login")) {
    const redirectResponse = NextResponse.redirect(
      new URL(getAuthenticatedEntryHref(true), request.url),
    );
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = new URL(
      getLoginHref(pathname, request.nextUrl.search),
      request.url,
    );
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }

  return response;
}
