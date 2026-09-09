// src/lib/security/google-auth.test.ts
// ---------------------------------------------------------------------------
// اختبارات أمان شاملة لخدمة Google Identity Services والتحقق التشفيري
// ---------------------------------------------------------------------------

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateAuthNonce,
  verifyAuthNonce,
  decodeJwtPayload,
  createSessionToken,
  verifySessionToken,
  verifyGoogleIdToken,
} from "./google-auth";

function createMockJwt(payload: Record<string, any>): string {
  const headerB64 = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureB64 = Buffer.from("mock-signature-bytes").toString("base64url");
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

describe("Google Identity Services - Security & Crypto Tests", () => {
  describe("generateAuthNonce & verifyAuthNonce (Anti-Replay)", () => {
    it("generates unique high-entropy nonces", () => {
      const n1 = generateAuthNonce();
      const n2 = generateAuthNonce();
      assert.ok(n1.length >= 24);
      assert.ok(n2.length >= 24);
      assert.notEqual(n1, n2);
    });

    it("verifies identical nonces with timing-safe comparison", () => {
      const nonce = generateAuthNonce();
      assert.equal(verifyAuthNonce(nonce, nonce), true);
    });

    it("rejects mismatched, empty or altered nonces", () => {
      const nonce = generateAuthNonce();
      assert.equal(verifyAuthNonce(nonce, "different-nonce-1234567890"), false);
      assert.equal(verifyAuthNonce(nonce, undefined), false);
      assert.equal(verifyAuthNonce(undefined, nonce), false);
      assert.equal(verifyAuthNonce("", ""), false);
    });
  });

  describe("decodeJwtPayload", () => {
    it("correctly decodes standard base64url JWT payload", () => {
      const sample = { sub: "12345", email: "test@example.com", name: "Test User" };
      const jwt = createMockJwt(sample);
      const decoded = decodeJwtPayload(jwt);
      assert.deepEqual(decoded, sample);
    });

    it("returns null for malformed or non-JWT strings", () => {
      assert.equal(decodeJwtPayload("not-a-jwt"), null);
      assert.equal(decodeJwtPayload("a.b"), null);
      assert.equal(decodeJwtPayload(""), null);
    });
  });

  describe("HMAC-SHA256 Session Token Management", () => {
    const testUser = {
      sub: "google-109283746",
      email: "client@artisan-imprimeur.dz",
      name: "Ahmed Karim",
      picture: "https://lh3.googleusercontent.com/photo.jpg",
    };

    it("signs and verifies valid session tokens", () => {
      const token = createSessionToken(testUser, 3600);
      assert.ok(token.includes("."));

      const res = verifySessionToken(token);
      assert.equal(res.valid, true);
      assert.ok(res.session);
      assert.equal(res.session?.sub, testUser.sub);
      assert.equal(res.session?.email, testUser.email);
      assert.equal(res.session?.name, testUser.name);
    });

    it("rejects tampered session tokens (payload or signature altered)", () => {
      const token = createSessionToken(testUser, 3600);
      const [p, s] = token.split(".");

      // التلاعب بالحمولة
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...testUser, email: "hacker@artisan.dz" })
      ).toString("base64url");
      const tamperedToken = `${tamperedPayload}.${s}`;

      const res = verifySessionToken(tamperedToken);
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("Invalid session signature") || res.error?.includes("Signature length mismatch"));
    });

    it("rejects expired session tokens", () => {
      // توكن منتهي الصلاحية (-10 ثوانٍ)
      const token = createSessionToken(testUser, -10);
      const res = verifySessionToken(token);
      assert.equal(res.valid, false);
      assert.equal(res.error, "Session expired");
    });
  });

  describe("verifyGoogleIdToken validation rules", () => {
    const now = Math.floor(Date.now() / 1000);
    const validPayload = {
      iss: "https://accounts.google.com",
      sub: "google-sub-998877",
      aud: "my-google-client-id.apps.googleusercontent.com",
      email: "customer@gmail.com",
      email_verified: true,
      name: "Customer <script>alert(1)</script>",
      picture: "https://lh3.googleusercontent.com/avatar.jpg",
      iat: now - 60,
      exp: now + 3600,
      nonce: "secure-nonce-123456",
    };

    it("rejects invalid JWT format", async () => {
      const res = await verifyGoogleIdToken("invalid.token");
      assert.equal(res.valid, false);
      assert.equal(res.error, "Malformed JWT");
    });

    it("rejects expired Google token", async () => {
      const expiredPayload = { ...validPayload, exp: now - 300 };
      const jwt = createMockJwt(expiredPayload);
      const res = await verifyGoogleIdToken(jwt);
      assert.equal(res.valid, false);
      assert.equal(res.error, "Token has expired");
    });

    it("rejects invalid issuer (phishing protection)", async () => {
      const fakeIssuerPayload = { ...validPayload, iss: "https://evil-auth.com" };
      const jwt = createMockJwt(fakeIssuerPayload);
      const res = await verifyGoogleIdToken(jwt);
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("Invalid issuer"));
    });

    it("rejects audience mismatch (cross-client token attack protection)", async () => {
      const jwt = createMockJwt(validPayload);
      const res = await verifyGoogleIdToken(jwt, {
        clientId: "different-client-id.apps.googleusercontent.com",
      });
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("Audience mismatch"));
    });

    it("rejects unverified Google emails", async () => {
      const unverifiedPayload = { ...validPayload, email_verified: false };
      const jwt = createMockJwt(unverifiedPayload);
      const res = await verifyGoogleIdToken(jwt);
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("not verified"));
    });

    it("rejects mismatched nonce (anti-replay attack)", async () => {
      const jwt = createMockJwt(validPayload);
      const res = await verifyGoogleIdToken(jwt, {
        expectedNonce: "different-nonce-999999",
      });
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("Nonce mismatch"));
    });

    it("validates token and sanitizes user input upon successful verification", async () => {
      const jwt = createMockJwt(validPayload);

      // محاكاة استجابة نقطة نهاية Google الرسمية
      const mockFetch: typeof fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => validPayload,
        } as any;
      };

      const res = await verifyGoogleIdToken(jwt, {
        clientId: "my-google-client-id.apps.googleusercontent.com",
        expectedNonce: "secure-nonce-123456",
        fetchImpl: mockFetch,
      });

      assert.equal(res.valid, true);
      assert.ok(res.user);
      assert.equal(res.user?.sub, validPayload.sub);
      assert.equal(res.user?.email, validPayload.email);
      // التحقق من تعقيم الاسم وتجريده من وسوم HTML الخطرة
      assert.equal(res.user?.name, "Customer scriptalert(1)/script");
      assert.equal(res.user?.picture, validPayload.picture);
      assert.equal(res.user?.provider, "google");
    });
  });
});
