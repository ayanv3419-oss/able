import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  fingerprintSecret,
  previewSecret,
} from "@/lib/crypto";

const originalKey = process.env.ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.ENCRYPTION_KEY;
  } else {
    process.env.ENCRYPTION_KEY = originalKey;
  }
});

describe("contributed key encryption", () => {
  it("round-trips with a fresh IV and never embeds plaintext", () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const first = encryptSecret("gsk_super-secret");
    const second = encryptSecret("gsk_super-secret");
    expect(first).not.toBe(second);
    expect(first).not.toContain("gsk_super-secret");
    expect(decryptSecret(first)).toBe("gsk_super-secret");
  });

  it("rejects missing and incorrectly sized encryption keys", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptSecret("secret")).toThrow("ENCRYPTION_KEY is required");
    process.env.ENCRYPTION_KEY = randomBytes(16).toString("base64");
    expect(() => encryptSecret("secret")).toThrow("exactly 32 bytes");
  });

  it("detects ciphertext tampering", () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const encrypted = encryptSecret("secret");
    const [iv, tag, ciphertext] = encrypted.split(":");
    const changed = `${iv}:${tag}:${ciphertext.slice(0, -2)}AA`;
    expect(() => decryptSecret(changed)).toThrow();
  });

  it("creates stable fingerprints and masked previews", () => {
    expect(fingerprintSecret("same")).toBe(fingerprintSecret("same"));
    expect(fingerprintSecret("same")).not.toBe(fingerprintSecret("other"));
    expect(previewSecret("abcdefgh")).toBe("••••efgh");
  });
});
