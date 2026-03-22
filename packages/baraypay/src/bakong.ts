import { BarayPayError } from "./errors.js";
import type { GenerateKHQRInput, PaymentStatus, ProviderAdapter } from "./index.js";

export interface BakongConfig {
  merchantId: string;
  merchantName: string;
  acquiringBank?: string;
}

function normalizeBakongStatus(status?: string): PaymentStatus {
  const value = (status ?? "pending").toLowerCase();
  if (value === "success" || value === "succeeded" || value === "paid") {
    return "succeeded";
  }
  if (value === "failed") {
    return "failed";
  }
  return "pending";
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildKHQRString(input: GenerateKHQRInput, config: BakongConfig): string {
  const payloadFormatIndicator = tlv("00", "01");
  const pointOfInitiationMethod = tlv("01", "12");

  const merchantAccountInfo = tlv(
    "29",
    [
      tlv("00", "kh.gov.nbc.bakong"),
      tlv("01", config.merchantId),
      tlv("02", input.billNumber ?? input.merchantName)
    ].join("")
  );

  const transactionCurrency = tlv("53", input.currency === "USD" ? "840" : "116");
  const transactionAmount = tlv("54", input.amount.toFixed(2));
  const countryCode = tlv("58", "KH");
  const merchantName = tlv("59", (config.merchantName || input.merchantName).slice(0, 25));
  const merchantCity = tlv("60", (input.storeLabel ?? "Phnom Penh").slice(0, 15));

  const additionalData = tlv(
    "62",
    [
      tlv("01", input.billNumber ?? ""),
      tlv("05", input.storeLabel ?? "BarayPay")
    ].join("")
  );

  const withoutCrc = [
    payloadFormatIndicator,
    pointOfInitiationMethod,
    merchantAccountInfo,
    transactionCurrency,
    transactionAmount,
    countryCode,
    merchantName,
    merchantCity,
    additionalData,
    "6304"
  ].join("");

  return `${withoutCrc}${crc16ccitt(withoutCrc)}`;
}

export function bakongKHQR(config: BakongConfig): ProviderAdapter {
  return {
    id: "bakong",

    async generateKHQR(input) {
      const qrString = buildKHQRString(input, config);
      return {
        provider: "bakong",
        qrString,
        raw: {
          merchantId: config.merchantId,
          merchantName: config.merchantName,
          billNumber: input.billNumber
        }
      };
    },

    async createPayment(input) {
      const qr = await this.generateKHQR?.({
        provider: "bakong",
        amount: input.amount,
        currency: input.currency,
        merchantName: config.merchantName,
        billNumber: input.orderId,
        storeLabel: "BarayPay"
      });

      if (!qr) {
        throw new BarayPayError("Bakong KHQR generation failed", "KHQR_GENERATION_FAILED", "bakong");
      }

      return {
        provider: "bakong",
        transactionId: `bakong_${input.orderId}`,
        qrCode: qr.qrString,
        status: "pending",
        raw: qr.raw
      };
    },

    async verifyPayment(input) {
      return {
        provider: "bakong",
        transactionId: input.transactionId,
        status: "pending",
        raw: {
          note: "Bakong verification endpoint not configured in this sample provider"
        }
      };
    },

    async webhookHandler(input) {
      let payload: any;
      try {
        payload = JSON.parse(input.rawBody.toString("utf8"));
      } catch (error) {
        throw new BarayPayError("Invalid Bakong webhook JSON body", "INVALID_WEBHOOK_BODY", "bakong", error);
      }

      const status = normalizeBakongStatus(payload.status);

      return {
        provider: "bakong",
        eventType:
          status === "succeeded"
            ? "payment.succeeded"
            : status === "failed"
            ? "payment.failed"
            : "payment.pending",
        transactionId: String(payload.transactionId ?? payload.billNumber ?? ""),
        orderId: payload.orderId ? String(payload.orderId) : undefined,
        status,
        raw: payload
      };
    }
  };
}
