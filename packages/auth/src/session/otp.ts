/** Issues and checks a one-time code. The app supplies this when messaging is configured. */
export interface OtpSignIn {
  request(input: { email?: string; phone?: string }): Promise<void>;
  verify(input: { email?: string; phone?: string; code: string }): Promise<void>;
}
