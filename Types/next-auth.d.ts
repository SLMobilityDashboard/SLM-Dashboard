import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
  }

  interface User {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      username?: string
      roles?: string[]
      givenName?: string
      middleName?: string
      name?: string
      email?: string
      image?: string
    }
    accessToken?: string
  }

  interface JWT {
    user?: {
      name?: string
      email?: string
    }
    roles?: string[]
    username?: string
    givenName?: string
    middleName?: string
    accessToken?: string
  }
}

declare module "next-auth" {
  interface User {
    roles?: string[];
  }
  
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
  }
}

// types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { Role } from "@/lib/auth/role-mappings";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: string[];
      username?: string;
      givenName?: string;
      middleName?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User {
    roles?: string[];
    username?: string;
    givenName?: string;
    middleName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: {
      name?: string | null;
      email?: string | null;
    };
    roles?: string[];
    accessToken?: string;
    username?: string;
    givenName?: string;
    middleName?: string;
  }
}