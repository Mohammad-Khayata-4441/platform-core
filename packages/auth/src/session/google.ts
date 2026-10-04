/** A Google account the deployment has already verified. `subject` is the stable `sub` claim. */
export interface GoogleIdentity {
  subject: string;
  email?: string | null;
}

/** Checks an identity token. The app supplies this when Google is configured. */
export interface GoogleSignIn {
  verify(idToken: string): Promise<GoogleIdentity>;
}
