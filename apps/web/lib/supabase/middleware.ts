import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedEntryHref, getLoginHref, isProtectedPath } from "@/lib/auth-routing";
import { getWebEnv } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function updateSession(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  response.headers.set("Cache-Control", "private, no-store");

  if (user && (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/login")) {
    const redirectResponse = NextResponse.redirect(
      new URL(getAuthenticatedEntryHref(true), request.url),
    );
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = new URL(
      getLoginHref(request.nextUrl.pathname, request.nextUrl.search),
      request.url,
    );
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }

  return response;
}
