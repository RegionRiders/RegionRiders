/**
 * Cryptography utilities for sensitive data
 * Provides encryption/decryption for OAuth tokens
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text Plain text to encrypt
 * @returns Encrypted data as base64 string with IV and auth tag
 */
export function encryptToken(text: string): string {
  if (!text) {
    return text;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Store IV and auth tag with encrypted data
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts data encrypted with encryptToken
 * @param encryptedData Encrypted data string
 * @returns Decrypted plain text
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) {
    return encryptedData;
  }

  const [ivBase64, authTagBase64, encrypted] = encryptedData.split(':');
  if (!ivBase64 || !authTagBase64 || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Invalid encrypted data format');
  }
}

/**
 * Gets the encryption key from environment variable
 * Uses a per-installation salt for better security
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.OAUTH_ENCRYPTION_KEY;
  const saltEnv = process.env.OAUTH_ENCRYPTION_SALT || 'regionriders-default-salt';

  if (!keyEnv) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is required');
  }

  // Use OWASP-recommended scrypt parameters for OAuth token protection
  // N=131072 (2^17): CPU/memory cost (~128 MiB RAM, ~0.5s on modern CPUs)
  // r=8: Block size (1024 bytes)
  // p=1: Parallelization factor
  // maxmem: Memory limit ~144 MiB (128 * N * r = 128 MiB requirement + overhead)
  // See: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
  return scryptSync(keyEnv, saltEnv, 32, {
    N: 131072,
    r: 8,
    p: 1,
    maxmem: 144 * 1024 * 1024,
  });
}
