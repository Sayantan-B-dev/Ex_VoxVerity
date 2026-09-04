import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Phase 06 Supabase: validate against Supabase auth.users
        // For now, basic validation
        if (!credentials?.email || !credentials?.password) return null;

        // TODO: Phase 14 - validate against Supabase database
        // For demo: accept any valid-shaped input
        return {
          id: credentials.email as string,
          email: credentials.email as string,
          name: (credentials.email as string).split("@")[0],
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/auth-code-error",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
