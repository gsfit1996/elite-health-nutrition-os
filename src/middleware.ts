export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/questionnaire/:path*",
    "/plan/:path*",
    "/api/questionnaire/:path*",
    "/api/plan/:path*",
    "/api/gamma/:path*",
  ],
}
