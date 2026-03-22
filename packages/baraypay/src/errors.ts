export class BarayPayError extends Error {
  public readonly code: string;
  public readonly provider?: string;

  constructor(message: string, code = "BARAYPAY_ERROR", provider?: string, cause?: unknown) {
    super(message, { cause });
    this.name = "BarayPayError";
    this.code = code;
    this.provider = provider;
  }
}
