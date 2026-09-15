import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export class EncryptionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionConfigurationError";
  }
}

function encryptionKey(): Buffer {
  const encoded = process.env.ENCRYPTION_KEY;
  if (!encoded) {
    throw new EncryptionConfigurationError(
      "ENCRYPTION_KEY is required. Set it to a base64-encoded 32-byte secret."
    );
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new EncryptionConfigurationError(
      "ENCRYPTION_KEY must be valid base64."
    );
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new EncryptionConfigurationError(
      `ENCRYPTION_KEY must decode to exactly 32 bytes; received ${key.length}.`
    );
  }
  return key;
}

/** Encrypts a secret as base64 IV, authentication tag and ciphertext. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64")).join(":");
}

/** Decrypts an `iv:tag:ciphertext` blob and verifies its GCM tag. */
export function decryptSecret(blob: string): string {
  const parts = blob.split(":");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Encrypted secret has an invalid format.");
  }
  const [iv, tag, ciphertext] = parts.map((part) =>
    Buffer.from(part, "base64")
  );
  if (iv.length !== IV_BYTES || tag.length !== 16) {
    throw new Error(
      "Encrypted secret has an invalid IV or authentication tag."
    );
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function fingerprintSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function previewSecret(secret: string): string {
  return `••••${secret.slice(-4)}`;
}
