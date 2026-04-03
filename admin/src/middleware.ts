import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@supabase/supabase-js";

const ADMIN_ROLE_COOKIE = "x-admin-role";
const ADMIN_ROLE_CACHE_MAX_AGE = 5 * 60; // 5 minutes

export async function middleware(request: NextRequest) {
  // Public pages that don't require authentication
  const publicPaths = ["/privacy", "/account-deletion"];
  if (publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const { user, supabaseResponse } = await updateSession(request);

  const isLoginPage = request.nextUrl.pathname === "/login";

  // No session and not on login → redirect to login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Has session and on login → redirect to dashboard
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Has session → verify admin role
  if (user && !isLoginPage) {
    // Check cached admin role cookie
    const cachedRole = request.cookies.get(ADMIN_ROLE_COOKIE)?.value;

    if (!cachedRole) {
      // Query admin_users with service role key
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data: adminUser } = await serviceClient
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!adminUser) {
        // Not an admin — sign out and redirect
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "unauthorized");

        const response = NextResponse.redirect(url);
        // Clear all supabase cookies to sign out
        request.cookies.getAll().forEach((cookie) => {
          if (cookie.name.startsWith("sb-")) {
            response.cookies.delete(cookie.name);
          }
        });
        return response;
      }

      // Cache the admin role in a cookie
      supabaseResponse.cookies.set(ADMIN_ROLE_COOKIE, adminUser.role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_ROLE_CACHE_MAX_AGE,
        path: "/",
      });

      supabaseResponse.headers.set("x-admin-role", adminUser.role);
    } else {
      supabaseResponse.headers.set("x-admin-role", cachedRole);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
