export interface WhatsAppSendParams {
  to: string; // Indian mobile number (e.g. +919822012345)
  body: string;
  templateType?: string;
  variables?: Record<string, any>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId: string;
  provider: "META_CLOUD" | "TWILIO" | "MOCK";
  error?: string;
}

export interface WhatsAppProvider {
  name: "META_CLOUD" | "TWILIO" | "MOCK";
  send(params: WhatsAppSendParams): Promise<WhatsAppSendResult>;
}

/**
 * Meta WhatsApp Cloud API Provider
 */
export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  name = "META_CLOUD" as const;
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  async send(params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
    if (!this.phoneNumberId || !this.accessToken) {
      // Fallback cleanly to mock if credentials not configured in local environment
      return new MockWhatsAppProvider().send(params);
    }

    try {
      const cleanPhone = params.to.replace(/\D/g, "");
      const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { body: params.body }
        })
      });

      const data: any = await res.json();
      if (!res.ok) {
        return {
          success: false,
          messageId: "",
          provider: this.name,
          error: data.error?.message || "Meta WhatsApp Cloud API error"
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `meta-msg-${Date.now()}`,
        provider: this.name
      };
    } catch (err: any) {
      return {
        success: false,
        messageId: "",
        provider: this.name,
        error: err.message
      };
    }
  }
}

/**
 * Mock / Local WhatsApp Provider (Development, CI/CD, Automated Tests)
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "MOCK" as const;

  async send(_params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
    const mockId = `mock-wa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      messageId: mockId,
      provider: this.name
    };
  }
}

/**
 * Provider Factory
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return new MetaCloudWhatsAppProvider();
  }
  return new MockWhatsAppProvider();
}
