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
    async jwt({ token, account, profile, user }) {
      if (user) {
        token.user = {
          name: user.name || user.email,
          email: user.email,
        };
      }

    if (token.email) {
      const roles = getRolesForEmail(token.email);
      console.log('✅ Roles assigned for:', token.email, '→', roles);
      token.roles = roles;
    } else {
      console.log('⚠️ No roles assigned for:', token.email);
    }
  
      // Extract roles from Cognito groups and merge with custom mappings
      if (account?.access_token && profile) {
        token.accessToken = account.access_token;
        
        // Get Cognito groups
        const cognitoGroups = (profile as any)['cognito:groups'] || [];
        
        // Get custom role mappings from role-mappings.ts based on email
        const customRoles = token.email ? getRolesForEmail(token.email) : [];
        
        // Merge roles from both Cognito and custom mappings (remove duplicates)
        const allRoles = [...new Set([...cognitoGroups, ...customRoles])];
        token.roles = allRoles;
        
        // Store additional user info
        token.username = (profile as any)['cognito:username'];
        token.givenName = (profile as any)['given_name'];
        token.middleName = (profile as any)['middle_name'];
        
        // Log role assignment for debugging
        if (allRoles.length > 0) {
          console.log('✅ Roles assigned for:', token.email, '→', allRoles);
        } else {
          console.log('⚠️ No roles assigned for:', token.email);
        }
      }

      return token;
    },

   

    async session({ session, token }) {
      if (!session.user) {
        session.user = {};
      }

      // Add user info and roles to session
      session.user = {
        ...(token.user as any),
        roles: token.roles as string[] || [],
        username: token.username as string,
        givenName: token.givenName as string,
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
      return `${baseUrl}/`;
    },
  },

  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };