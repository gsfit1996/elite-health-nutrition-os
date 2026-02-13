import { withAuth } from "next-auth/middleware"

export default withAuth(
  function proxy() {},
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/questionnaire/:path*",
    "/plan/:path*",
    "/progress/:path*",
    "/api/questionnaire/:path*",
    "/api/plan/:path*",
    "/api/gamma/:path*",
    "/api/progress/:path*",
  ],
}

