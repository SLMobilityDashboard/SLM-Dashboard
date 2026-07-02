import NextAuth, { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { getRolesForEmail } from "@/lib/auth/role-mappings";

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId:     process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      checks: ["pkce", "state"],
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // ─── Initial sign in ──────────────────────────────────────────────────
      if (account?.access_token && profile) {
        token.idToken        = account.id_token;
        token.accessToken    = account.access_token;
        token.refreshToken   = account.refresh_token;
        token.idTokenExpires = Date.now() + 55 * 60 * 1000;

        // FIX: store cognito:username — this is what Snowflake expects as `username`
        // It matches the LOGIN_NAME in Snowflake, NOT the email address.
        token.cognitoUsername = (profile as any)["cognito:username"];

        // Keep these for display purposes only
        token.givenName  = (profile as any)["given_name"];
        token.middleName = (profile as any)["middle_name"];

        const cognitoGroups: string[] = (profile as any)["cognito:groups"] ?? [];
        const customRoles: string[]   = token.email
          ? await getRolesForEmail(token.email)
          : [];

        token.roles = [...new Set([...cognitoGroups, ...customRoles])];

        console.log("✅ Sign in:", token.email, "| cognito:username:", token.cognitoUsername, "| roles:", token.roles);
        return token;
      }

      // ─── Tokens still valid ───────────────────────────────────────────────
      if (Date.now() < (token.idTokenExpires as number)) {
        return token;
      }

      // ─── Tokens expired — refresh ─────────────────────────────────────────
      console.log("🔄 Refreshing Cognito tokens...");

      if (!token.refreshToken) {
        console.error("❌ No refresh token — user must re-login");
        token.error = "RefreshTokenError";
        return token;
      }

      try {
        const response = await fetch(
          `https://${process.env.COGNITO_DOMAIN}/oauth2/token`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type:    "refresh_token",
              client_id:     process.env.COGNITO_CLIENT_ID!,
              client_secret: process.env.COGNITO_CLIENT_SECRET!,
              refresh_token: token.refreshToken as string,
            }),
          }
        );

        const refreshed = await response.json();

        if (!response.ok || refreshed.error) {
          console.error("❌ Token refresh failed:", refreshed);
          token.error = "RefreshTokenError";
          return token;
        }

        console.log("✅ Tokens refreshed successfully");

        return {
          ...token,
          idToken:        refreshed.id_token,
          // Cognito refresh doesn't always return a new access_token; keep the old one if absent
          accessToken:    refreshed.access_token ?? token.accessToken,
          idTokenExpires: Date.now() + 55 * 60 * 1000,
          error:          undefined,
        };

      } catch (err) {
        console.error("❌ Token refresh error:", err);
        token.error = "RefreshTokenError";
        return token;
      }
    },

    async session({ session, token }) {
      session.user = {
        name:           (token.user as any)?.name  ?? token.name,
        email:          (token.user as any)?.email ?? token.email,
        roles:          (token.roles as string[])  ?? [],
        // FIX: expose cognitoUsername — route.ts must pass this to Snowflake, not email
        username:       token.cognitoUsername as string,
        givenName:      token.givenName       as string,
        middleName:     token.middleName      as string,
      };

      // Prefer id_token for Snowflake OAuth; fall back to access_token
      if (token.idToken) {
        session.idToken = token.idToken as string;
      }

      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }

      if (token.error) {
        (session as any).error = token.error;
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

  logger: {
    debug: (code, metadata) => {
      if (code === "CHUNKING_SESSION_COOKIE") return;
      console.debug(code, metadata);
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug:  process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };