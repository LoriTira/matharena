import crypto from 'crypto';

const SECRET = process.env.PERF_SECRET || 'dev-fallback-secret';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Creates an HMAC-signed verification token for a user.
 * Format: base64url(userId:expiry).base64url(signature)
 */
export function createVerificationToken(userId: string): string {
  const expiry = Date.now() + TOKEN_EXPIRY_MS;
  const payload = `${userId}:${expiry}`;
  const signature = crypto
    .createHmac('sha256', `${SECRET}:email-verify`)
    .update(payload)
    .digest('base64url');
  const encodedPayload = Buffer.from(payload).toString('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Validates a verification token and returns the userId if valid.
 */
export function validateVerificationToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const [userId, expiryStr] = payload.split(':');
  if (!userId || !expiryStr) return null;

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) return null;

  const expectedSignature = crypto
    .createHmac('sha256', `${SECRET}:email-verify`)
    .update(payload)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  return userId;
}
