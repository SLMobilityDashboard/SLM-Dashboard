// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { getRolesForEmail } from "@/lib/auth/role-mappings";

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      checks: ["pkce", "state"],
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 day
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // account is only present on the first JWT call, right after OAuth callback.
      // This is the correct place to fetch roles — runs once at sign-in, not on every request.
      if (account?.access_token && profile) {
        token.accessToken = account.access_token;
        token.username    = (profile as any)['cognito:username'];
        token.givenName   = (profile as any)['given_name'];
        token.middleName  = (profile as any)['middle_name'];

        // Roles from Cognito groups (if any)
        const cognitoGroups: string[] = (profile as any)['cognito:groups'] ?? [];

        // Custom roles from Supabase via internal API
        // getRolesForEmail is async — must be awaited or token.roles becomes a Promise
        const customRoles: string[] = token.email
          ? await getRolesForEmail(token.email)
          : [];

        // Merge and deduplicate both sources
        token.roles = [...new Set([...cognitoGroups, ...customRoles])];

        console.log('✅ Roles assigned for:', token.email, '→', token.roles);
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        name:       (token.user as any)?.name  ?? token.name,
        email:      (token.user as any)?.email ?? token.email,
        roles:      (token.roles as string[])  ?? [],
        username:   token.username   as string,
        givenName:  token.givenName  as string,
        middleName: token.middleName as string,
      };

      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/realtime`;
    },
  },

  pages: {
    signIn: "/auth/sign-in",
    error:  "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };