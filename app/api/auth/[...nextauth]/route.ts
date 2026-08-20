import NextAuth, { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { getRolesForEmail } from "@/lib/auth/role-mappings";
import { jwtDecode } from "jwt-decode"; // or `jose`'s decodeJwt — either works,
                                         // we only need to read claims, not verify
                                         // (NextAuth already validated the token
                                         // when it was issued by Cognito).

// ─── Env validation — fail loudly at boot instead of a cryptic DNS error later ──
if (!process.env.COGNITO_DOMAIN) {
  throw new Error("COGNITO_DOMAIN env var is not set");
}
if (process.env.COGNITO_DOMAIN.includes("://")) {
  // COGNITO_DOMAIN is expected to be a FULL URL (e.g. "https://your-domain.auth.region.amazoncognito.com")
  // This check just guards against someone accidentally stripping/doubling the protocol later.
  // console.log("ℹ️  COGNITO_DOMAIN includes protocol — using as-is:", process.env.COGNITO_DOMAIN);
}

// ─── Snowflake role extraction ───────────────────────────────────────────────
// Cognito's Pre Token Generation Lambda (V2_0) injects `scp: "session:role:<ROLE>"`
// into the ID token based on the user's cognito:groups, per the
// EXTERNAL_OAUTH_ANY_ROLE_MODE = DISABLE setup on the Snowflake security
// integration. This decodes that claim so it can ride along on the session.
//
// NOTE: this only reads claims — it does not verify the token's signature.
// That's fine here because NextAuth's CognitoProvider already validated the
// token against Cognito's JWKS when it was issued; we're just reading a
// claim off a token we already trust.
interface CognitoIdTokenClaims {
  "cognito:username": string;
  scp?: string; // e.g. "session:role:ANALYST_ROLE"
  [key: string]: unknown;
}

function extractSnowflakeRole(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const claims = jwtDecode<CognitoIdTokenClaims>(idToken);
    const match  = claims.scp?.match(/session:role:(\S+)/);
    return match?.[1] ?? null;
  } catch {
    // Malformed/missing token — treat as "no role asserted", not a fatal
    // error. Snowflake falls back to session:role-any (the user's default
    // role) when no scp claim is present.
    return null;
  }
}

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
    // Extended from 24h -> 7 days. NOTE: this should not exceed your Cognito
    // App Client's "refresh token expiration" setting, or the cookie will
    // outlive the refresh token and users will be forced to re-login anyway.
    maxAge: 7 * 24 * 60 * 60,
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

        // Snowflake session role — asserted by Cognito's Pre Token
        // Generation Lambda via the `scp` claim, distinct from `roles`
        // above (which drives app-level UI/authorization, not Snowflake).
        token.snowflakeRole = extractSnowflakeRole(account.id_token);

        console.log(
          "✅ Sign in:", token.email,
          "| cognito:username:", token.cognitoUsername,
          "| roles:", token.roles,
          "| snowflakeRole:", token.snowflakeRole ?? "(none — will use session:role-any)",
        );
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
        // FIX: COGNITO_DOMAIN already includes the "https://" prefix in this
        // environment (e.g. "https://slmobility-uat.auth.ap-southeast-1.amazoncognito.com").
        // The old code prepended "https://" again, producing "https://https://..."
        // which fails DNS resolution with ENOTFOUND "https". Do NOT re-add the protocol here.
        const response = await fetch(
          `${process.env.COGNITO_DOMAIN}/oauth2/token`,
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

        // IMPORTANT: re-extract the role from the *refreshed* ID token, not
        // the old one. If the user's Cognito group membership changed since
        // their last login (added/removed from an analyst/admin group),
        // Cognito's Pre Token Generation Lambda will bake a different `scp`
        // claim into this new token — re-reading it here is what makes role
        // changes take effect without forcing a full re-login.
        const refreshedSnowflakeRole = extractSnowflakeRole(refreshed.id_token);

        if (refreshedSnowflakeRole !== (token.snowflakeRole ?? null)) {
          console.log(
            "🔁 Snowflake role changed on refresh:",
            token.snowflakeRole ?? "(none)", "->", refreshedSnowflakeRole ?? "(none)",
          );
        }

        return {
          ...token,
          idToken:        refreshed.id_token,
          // Cognito refresh doesn't always return a new access_token; keep the old one if absent
          accessToken:    refreshed.access_token ?? token.accessToken,
          idTokenExpires: Date.now() + 55 * 60 * 1000,
          snowflakeRole:  refreshedSnowflakeRole,
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
        // Snowflake session role, or null to mean "let Snowflake resolve
        // session:role-any (the user's default role)". route.ts reads this
        // both to fold it into the per-user cache key and for logging.
        snowflakeRole:  (token.snowflakeRole as string | null) ?? null,
      };

      // Prefer id_token for Snowflake OAuth; fall back to access_token
      if (token.idToken) {
        session.idToken = token.idToken as string;
      }

      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }

      // Always propagate refresh errors to the session so API routes can
      // detect a dead refresh token and return 401 instead of passing a
      // stale token through to Snowflake (which fails with a confusing
      // OAuth 390318 "access token expired" error).
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