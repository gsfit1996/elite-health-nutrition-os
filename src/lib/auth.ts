import { NextAuthOptions } from "next-auth"
import { Resend } from "resend"
import { PrismaAdapter } from "@auth/prisma-adapter"
import EmailProvider from "next-auth/providers/email"
import { prisma } from "./prisma"

const emailFrom = process.env.EMAIL_FROM || "noreply@elitehealth.com"

const emailProvider = process.env.RESEND_API_KEY
  ? EmailProvider({
      from: emailFrom,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const { from } = provider
        const resend = new Resend(process.env.RESEND_API_KEY!)
        
        try {
          await resend.emails.send({
            from,
            to: identifier,
            subject: "Sign in to Elite Health Nutrition",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #16a34a;">Elite Health Nutrition</h1>
                <p>Click the link below to sign in to your account:</p>
                <a href="${url}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Sign In
                </a>
                <p style="color: #666; font-size: 14px;">This link will expire in 24 hours. If you didn't request this email, you can safely ignore it.</p>
              </div>
            `,
          })
        } catch (error) {
          console.error("Error sending email:", error)
          throw new Error("Failed to send verification email")
        }
      },
    })
  : EmailProvider({
      from: emailFrom,
      server: {
        host: process.env.EMAIL_SERVER_HOST || "",
        port: Number(process.env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER || "",
          pass: process.env.EMAIL_SERVER_PASSWORD || "",
        },
      },
    })

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [emailProvider],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`)
    },
  },
  debug: process.env.NODE_ENV === "development",
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
  }
}
