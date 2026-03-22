import type {
  CreatePaymentInput,
  GenerateKHQRInput,
  KHQRResult,
  ProviderId,
  UnifiedPayment,
  VerificationResult,
  VerifyPaymentInput,
  WebhookEvent,
  WebhookInput
} from "./types.js";

export interface ProviderAdapter {
  id: ProviderId;
  createPayment?(input: CreatePaymentInput): Promise<UnifiedPayment>;
  verifyPayment?(input: VerifyPaymentInput): Promise<VerificationResult>;
  generateKHQR?(input: GenerateKHQRInput): Promise<KHQRResult>;
  webhookHandler?(input: WebhookInput): Promise<WebhookEvent>;
}
