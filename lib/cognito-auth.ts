import { CognitoJwtVerifier } from "aws-jwt-verify";

export interface CognitoUser {
  username: string;
  email:    string;
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (verifier) return verifier;

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId   = process.env.COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new Error("COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set");
  }

  verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "id",
    clientId,
  });

  return verifier;
}

/** Validate `Authorization: Bearer <cognito-id-token>` from the React app. */
export async function getUserFromCognitoToken(
  authHeader: string | null,
): Promise<CognitoUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const payload = await getVerifier().verify(token);
    const username =
      (payload["cognito:username"] as string | undefined) ??
      (payload.preferred_username as string | undefined) ??
      (payload.sub as string);

    return {
      username,
      email: (payload.email as string | undefined) ?? "",
    };
  } catch {
    return null;
  }
}
