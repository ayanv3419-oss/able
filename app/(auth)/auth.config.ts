import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { isLocalPreview } from "@/lib/constants";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const authConfig = {
  basePath: "/api/auth",
  callbacks: {},
  pages: {
    error: `${base}/login`,
    newUser: `${base}/`,
    signIn: `${base}/login`,
  },
  // Google reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
  providers: isLocalPreview ? [] : [Google],
  trustHost: true,
} satisfies NextAuthConfig;
