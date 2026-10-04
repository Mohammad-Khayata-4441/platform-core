import { OAuth2Client } from 'google-auth-library';
import { SessionError, type GoogleIdentity, type GoogleSignIn } from '@core/auth/nest';

/**
 * Google sign-in for a deployment that set both `GOOGLE_CLIENT_ID` and
 * `GOOGLE_CLIENT_SECRET`. Returns nothing otherwise, so the route refuses.
 */
export function googleSignInFromEnv(
  env: Record<string, string | undefined> = process.env,
): GoogleSignIn | undefined {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return undefined;
  return createGoogleSignIn(clientId, clientSecret);
}

/** Verify an identity token against the deployment's Google client id. */
export function createGoogleSignIn(clientId: string, clientSecret: string): GoogleSignIn {
  const client = new OAuth2Client({ clientId, clientSecret });
  return {
    async verify(idToken: string): Promise<GoogleIdentity> {
      try {
        const ticket = await client.verifyIdToken({ idToken, audience: clientId });
        const payload = ticket.getPayload();
        const subject = payload?.sub?.trim();
        if (!subject) throw new SessionError('Invalid Google token', 401);
        const email = payload?.email_verified === false ? null : (payload?.email ?? null);
        return { subject, email };
      } catch (error) {
        if (error instanceof SessionError) throw error;
        throw new SessionError('Invalid Google token', 401);
      }
    },
  };
}
