/** Gates real OTP delivery. Omit it and the channel sends. */
export interface OtpDeliveryPolicy {
  enabled: boolean;
  devCode?: string;
}

export function readOtpEnabled(value: string | boolean | undefined): boolean {
  return value === true || value === 'true' || value === '1';
}

export function skippedOtpMessage(devCode: string | undefined): string {
  return `OTP code: ${devCode ?? ''}`;
}
