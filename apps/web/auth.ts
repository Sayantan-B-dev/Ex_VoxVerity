import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/db";

/**
 * Production auth: NextAuth only. Supabase is used ONLY as database
 * (public.app_users / oauth_accounts / profiles / organization_members).
 * Supabase Auth (auth.users / signInWithPassword) is NOT used.
 */

interface DbUser {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  role: string | null;
  image: string | null;
}

async function findUserByEmail(email: string): Promise<DbUser | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, email, name, password_hash, role, image")
    .eq("email", email.toLowerCase().trim())
    .single();
  if (error || !data) return null;
  return data as DbUser;
}

async function ensureOrgMembership(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Default org: first org, or create one.
  let { data: org } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (!org) {
    const { data: created } = await supabase
      .from("organizations")
      .insert({ name: "Acme Corp", plan: "free", status: "Active" })
      .select("id")
      .single();
    org = created;
  }
  if (!org) return;
  await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    role: "operator",
  });
  // Mirror org onto profile row when present.
  await supabase
    .from("profiles")
    .update({ organization_id: org.id })
    .eq("app_user_id", userId);
}

async function provisionOAuthUser(opts: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  providerAccountId: string;
}): Promise<DbUser | null> {
  const supabase = createServiceClient();
  const email = opts.email.toLowerCase().trim();
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await supabase
      .from("app_users")
      .insert({
        email,
        name: opts.name ?? email.split("@")[0],
        image: opts.image ?? null,
        email_verified: true,
        role: "operator",
      })
      .select("id, email, name, password_hash, role, image")
      .single();
    if (error || !data) return null;
    user = data as DbUser;
    // Create profile mirror row.
    await supabase.from("profiles").insert({
      email,
      name: user.name,
      role: "operator",
      app_user_id: user.id,
    });
    await supabase.from("notification_preferences").insert({
      app_user_id: user.id,
    });
  }
  await supabase.from("oauth_accounts").upsert(
    {
      user_id: user.id,
      provider: opts.provider,
      provider_account_id: opts.providerAccountId,
    },
    { onConflict: "provider,provider_account_id" }
  );
  await ensureOrgMembership(user.id);
  return user;
}

const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || undefined;

const providers = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          // Redirect URI comes from env (GOOGLE_REDIRECT_URI), never hardcoded.
          // Default (unset) falls back to NEXTAUTH_URL/api/auth/callback/google.
          ...(googleRedirectUri ? { redirectProxyUrl: googleRedirectUri } : {}),
        }),
      ]
    : []),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? [GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET })]
    : []),
  Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string ?? "").toLowerCase().trim();
        const password = (credentials?.password as string ?? "");
        if (!email || !password) return null;
        const user = await findUserByEmail(email);
        if (!user?.password_hash) return null;
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;
        await ensureOrgMembership(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? email.split("@")[0],
          image: user.image ?? undefined,
        };
      },
    }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
    error: "/auth/auth-code-error",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth: provision DB user on first login. Credentials handled in authorize().
      if (account && account.provider !== "credentials" && user.email) {
        const dbUser = await provisionOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });
        if (!dbUser) return false;
        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Load role from DB (single query per fresh login only).
        try {
          const db = await findUserByEmail(
            (user.email ?? token.email ?? "").toLowerCase()
          );
          if (db?.role) token.role = db.role;
        } catch {
          /* keep token without role */
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role =
          (token.role as string) ?? "operator";
      }
      return session;
    },
  },
});
