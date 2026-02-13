import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.gamma.app",
      },
      {
        protocol: "https",
        hostname: "gamma.app",
      },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
})
