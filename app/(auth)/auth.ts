import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { isProductionEnvironment, isTestEnvironment } from "@/lib/constants";
import { getOrCreateUserByEmail } from "@/lib/db/queries";
import { authConfig } from "./auth.config";

export type UserType = "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

const testLoginSchema = z.object({ email: z.email() });

/**
 * Signs in whichever email an e2e test asks for, so tests never call Google.
 * It is only registered for test runs and never in a production build.
 */
const testLogin = Credentials({
  authorize(credentials) {
    const parsed = testLoginSchema.safeParse(credentials);

    if (!parsed.success) {
      return null;
    }

    return { email: parsed.data.email };
  },
  credentials: { email: { label: "Email", type: "email" } },
  id: "test-login",
  name: "Test login",
});

const isTestLoginEnabled = isTestEnvironment && !isProductionEnvironment;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only set while signing in, so this runs once per sign-in.
      if (user?.email) {
        const student = await getOrCreateUserByEmail({
          email: user.email,
          image: user.image,
          name: user.name,
        });

        token.email = student.email;
        token.id = student.id;
        token.type = "regular";
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
    signIn({ account, profile, user }) {
      if (!user.email) {
        return false;
      }

      // Students are keyed by email, so only accept one Google has verified.
      if (account?.provider === "google") {
        return profile?.email_verified === true;
      }

      return true;
    },
  },
  providers: [
    ...authConfig.providers,
    ...(isTestLoginEnabled ? [testLogin] : []),
  ],
});
