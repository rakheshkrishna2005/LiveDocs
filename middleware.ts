import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/auth"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  const protectedRoutes = ["/dashboard", "/document"]
  const authRoutes = ["/auth/login", "/auth/register"]

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (isAuthRoute && token) {
    try {
      const payload = await verifyToken(token)
      if (payload) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    } catch (error) {
      const response = NextResponse.redirect(new URL("/auth/login", request.url))
      response.cookies.delete("token")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/document/:path*"],
}
