import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockWhatsAppProvider } from "../../apps/api/src/modules/notifications/whatsapp.provider.js";

describe("GYMCARE CRM - WhatsApp Engine & Idempotent Automation Tests", () => {
  it("MockWhatsAppProvider dispatches message cleanly and returns provider tracking ID", async () => {
    const provider = new MockWhatsAppProvider();
    const result = await provider.send({
      to: "+919822012345",
      body: "Hello Test Member, your gym fee receipt is ₹2500.",
      templateType: "PAYMENT_RECEIPT"
    });

    assert.equal(result.success, true);
    assert.equal(result.provider, "MOCK");
    assert.ok(result.messageId.startsWith("mock-wa-"));
  });

  it("WhatsApp dashboard returns metrics for authenticated tenant", async () => {
    const { buildApp } = await import("../../apps/api/src/app.js");
    const app = buildApp();
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/whatsapp/dashboard",
      headers: {
        authorization: "Bearer mock-role-owner"
      }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.data.messages_sent_today !== undefined);
    assert.ok(body.data.categories !== undefined);
    await app.close();
  });

  it("WhatsApp instant message dispatch succeeds with valid payload", async () => {
    const { buildApp } = await import("../../apps/api/src/app.js");
    const app = buildApp();
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/whatsapp/send",
      headers: {
        authorization: "Bearer mock-role-owner"
      },
      payload: {
        recipient_phone: "+919822012345",
        event_type: "CUSTOM",
        custom_message: "Automated test notification from test suite"
      }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "SENT");
    await app.close();
  });

  it("Automation runner executes idempotently without duplicate sends", async () => {
    const { buildApp } = await import("../../apps/api/src/app.js");
    const app = buildApp();
    await app.ready();

    // First execution
    const res1 = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/whatsapp/run-automation",
      headers: {
        authorization: "Bearer mock-role-owner"
      }
    });

    assert.equal(res1.statusCode, 200);
    const body1 = JSON.parse(res1.body);
    assert.equal(body1.success, true);

    // Second execution - any matching memberships must be skipped because of idempotency keys!
    const res2 = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/whatsapp/run-automation",
      headers: {
        authorization: "Bearer mock-role-owner"
      }
    });

    assert.equal(res2.statusCode, 200);
    const body2 = JSON.parse(res2.body);
    assert.equal(body2.success, true);
    assert.equal(body2.data.sent_count, 0); // 0 duplicates sent
    await app.close();
  });
});
