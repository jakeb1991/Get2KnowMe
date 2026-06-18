import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce — recommended for GCM
const ENC_PREFIX = 'enc:';

function getKey() {
  const secret = process.env.FIELD_ENCRYPTION_SECRET;
  if (!secret) throw new Error('FIELD_ENCRYPTION_SECRET env var is not set');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(value) {
  if (value === null || value === undefined || value === '') return value;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(value) {
  if (!value || typeof value !== 'string' || !value.startsWith(ENC_PREFIX)) return value;
  try {
    const [ivHex, authTagHex, encryptedHex] = value.slice(ENC_PREFIX.length).split(':');
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    return value; // Return raw value — handles legacy plaintext data gracefully
  }
}
