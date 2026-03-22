import { createHmac, timingSafeEqual } from "node:crypto";
import { BarayPayError } from "./errors.js";
import { jsonRequest } from "./http.js";
import type {
  CreatePaymentInput,
  PaymentStatus,
  ProviderAdapter,
  VerificationResult,
  WebhookEvent
} from "./index.js";

export interface AbaPaywayConfig {
  merchantId: string;
  apiKey: string;
  environment: "sandbox" | "production";
  baseUrl?: string;
  webhookSecret?: string;
  mock?: boolean;
}

interface AbaCreatePaymentResponse {
  transactionId: string;
  checkoutUrl?: string;
  qrCode?: string;
  status: string;
}

function hmacSHA256Hex(secret: string, payload: string | Buffer): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeCompareHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function mapCreatePaymentToAbaPayload(input: CreatePaymentInput, merchantId: string) {
  return {
    merchant_id: merchantId,
    amount: input.amount,
    currency: input.currency,
    order_id: input.orderId,
    description: input.description,
    return_url: input.returnUrl,
    metadata: input.metadata
  };
}

function mapAbaStatus(status: string): PaymentStatus {
  const normalized = status.toLowerCase();
  if (["success", "succeeded", "paid", "completed"].includes(normalized)) {
    return "succeeded";
  }
  if (["fail", "failed", "declined"].includes(normalized)) {
    return "failed";
  }
  if (["expired"].includes(normalized)) {
    return "expired";
  }
  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }
  return "pending";
}

function mapAbaCreateResponse(response: AbaCreatePaymentResponse) {
  return {
    provider: "aba" as const,
    transactionId: response.transactionId,
    checkoutUrl: response.checkoutUrl,
    qrCode: response.qrCode,
    status: mapAbaStatus(response.status),
    raw: response
  };
}

function mapAbaVerifyResponse(raw: any, transactionId: string): VerificationResult {
  return {
    provider: "aba",
    transactionId,
    status: mapAbaStatus(raw.status ?? "pending"),
    paidAmount: typeof raw.paidAmount === "number" ? raw.paidAmount : undefined,
    paidCurrency: typeof raw.paidCurrency === "string" ? raw.paidCurrency : undefined,
    raw
  };
}

function mapAbaWebhook(raw: any): WebhookEvent {
  const status = mapAbaStatus(raw.status ?? "pending");
  const eventType =
    status === "succeeded"
      ? "payment.succeeded"
      : status === "failed"
      ? "payment.failed"
      : "payment.pending";

  return {
    provider: "aba",
    eventType,
    transactionId: String(raw.transactionId ?? raw.trans_id ?? ""),
    orderId: raw.orderId ? String(raw.orderId) : undefined,
    status,
    raw
  };
}

function getBaseUrl(config: AbaPaywayConfig): string {
  if (config.baseUrl) {
    return config.baseUrl;
  }
  return config.environment === "production"
    ? "https://checkout.payway.com.kh/api"
    : "https://checkout-sandbox.payway.com.kh/api";
}

function buildMockTransactionId(orderId: string): string {
  return `aba_mock_${orderId}_${Date.now()}`;
}

export function abaPayway(config: AbaPaywayConfig): ProviderAdapter {
  const baseUrl = getBaseUrl(config);

  return {
    id: "aba",

    async createPayment(input) {
      if (config.mock) {
        return {
          provider: "aba",
          transactionId: buildMockTransactionId(input.orderId),
          checkoutUrl: `https://sandbox.example/aba/checkout/${input.orderId}`,
          qrCode: `ABA_MOCK_QR_${input.orderId}`,
          status: "pending",
          raw: { mock: true }
        };
      }

      const payload = mapCreatePaymentToAbaPayload(input, config.merchantId);
      const signature = hmacSHA256Hex(config.apiKey, JSON.stringify(payload));

      const response = await jsonRequest<any>(`${baseUrl}/payment-link/create`, {
        method: "POST",
        headers: {
          authorization: `HMAC ${signature}`
        },
        body: payload
      });

      return mapAbaCreateResponse({
        transactionId: String(response.transactionId ?? response.trans_id ?? ""),
        checkoutUrl: typeof response.checkoutUrl === "string" ? response.checkoutUrl : undefined,
        qrCode: typeof response.qrCode === "string" ? response.qrCode : undefined,
        status: String(response.status ?? "pending")
      });
    },

    async verifyPayment(input) {
      if (config.mock) {
        return {
          provider: "aba",
          transactionId: input.transactionId,
          status: "succeeded",
          paidAmount: 10,
          paidCurrency: "USD",
          raw: { mock: true }
        };
      }

      const payload = {
        merchant_id: config.merchantId,
        transaction_id: input.transactionId,
        order_id: input.orderId
      };
      const signature = hmacSHA256Hex(config.apiKey, JSON.stringify(payload));

      const response = await jsonRequest<any>(`${baseUrl}/payment/check-transaction`, {
        method: "POST",
        headers: {
          authorization: `HMAC ${signature}`
        },
        body: payload
      });

      return mapAbaVerifyResponse(response, input.transactionId);
    },

    async webhookHandler(input) {
      const signatureHeader = input.headers["x-aba-signature"];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

      if (config.webhookSecret) {
        if (!signature) {
          throw new BarayPayError("Missing ABA webhook signature", "INVALID_WEBHOOK_SIGNATURE", "aba");
        }

        const computed = hmacSHA256Hex(config.webhookSecret, input.rawBody);
        if (!safeCompareHex(computed, signature)) {
          throw new BarayPayError("Invalid ABA webhook signature", "INVALID_WEBHOOK_SIGNATURE", "aba");
        }
      }

      let payload: any;
      try {
        payload = JSON.parse(input.rawBody.toString("utf8"));
      } catch (error) {
        throw new BarayPayError("Invalid ABA webhook JSON body", "INVALID_WEBHOOK_BODY", "aba", error);
      }

      return mapAbaWebhook(payload);
    }
  };
}
