export type ProviderId = "aba" | "bakong" | (string & {});

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "expired"
  | "cancelled";

export interface CreatePaymentInput {
  provider: ProviderId;
  amount: number;
  currency: "USD" | "KHR" | string;
  orderId: string;
  description?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface UnifiedPayment {
  provider: ProviderId;
  transactionId: string;
  checkoutUrl?: string;
  qrCode?: string;
  status: PaymentStatus;
  raw?: unknown;
}

export interface VerifyPaymentInput {
  provider: ProviderId;
  transactionId: string;
  orderId?: string;
}

export interface VerificationResult {
  provider: ProviderId;
  transactionId: string;
  status: PaymentStatus;
  paidAmount?: number;
  paidCurrency?: string;
  raw?: unknown;
}

export interface GenerateKHQRInput {
  provider: ProviderId;
  amount: number;
  currency: "KHR" | "USD" | string;
  merchantName: string;
  billNumber?: string;
  storeLabel?: string;
}

export interface KHQRResult {
  provider: ProviderId;
  qrString: string;
  qrCodeDataUrl?: string;
  expiresAt?: string;
  raw?: unknown;
}

export interface WebhookInput {
  provider: ProviderId;
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
}

export interface WebhookEvent {
  provider: ProviderId;
  eventType: "payment.succeeded" | "payment.failed" | "payment.pending";
  transactionId: string;
  orderId?: string;
  status: PaymentStatus;
  raw: unknown;
}
