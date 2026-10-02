export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

export interface MailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  cid?: string;
}

export interface MailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: MailAttachment[];
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  response: string;
}

export interface EmailTemplate {
  subject: string;
  text?: string;
  html: string;
}

export interface EmailTemplateData {
  [key: string]: string | number | boolean | null | undefined;
}

export interface OutboundMail {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface MailTransportResult {
  messageId?: string;
  accepted?: unknown;
  rejected?: unknown;
  pending?: unknown;
  response?: string;
}

export interface MailTransport {
  sendMail(options: OutboundMail): Promise<MailTransportResult>;
}
