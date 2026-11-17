/**
 * Cryptographic Utility for Data-at-Rest Protection & Field Masking
 * 
 * Implements AES-256-GCM authenticated encryption for sensitive patient fields
 * and privacy-aware quasi-identifier masking according to HIPAA Safe Harbor guidelines.
 */

import crypto from 'crypto';

// Encryption Key Management: Read from environment or derive securely
const RAW_KEY = process.env.PATIENT_DATA_ENCRYPTION_KEY || 'iomt-rpm-dev-master-encryption-key-32b!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest(); // Guarantees 32 bytes
const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

/**
 * Encrypts a sensitive plaintext string at rest using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptDataAtRest(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext; // Already encrypted

  try {
    const iv = crypto.randomBytes(12); // Recommended 96-bit IV for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[CryptoUtil] Encryption failure:', err.message);
    return plaintext;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 */
export function decryptDataAtRest(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  if (!ciphertext.startsWith(PREFIX)) return ciphertext; // Plaintext or unencrypted

  try {
    const parts = ciphertext.slice(PREFIX.length).split(':');
    if (parts.length !== 3) return ciphertext;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.warn('[CryptoUtil] Decryption verification failed:', err.message);
    return '[ENCRYPTED_SECURE_PAYLOAD]';
  }
}

/**
 * Masks an email address: e.g. "arthur.pendelton@example.com" -> "a***@example.com"
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 1) return `*@${domain}`;
  return `${user[0]}***@${domain}`;
}

/**
 * Masks a phone number: e.g. "+1 (555) 234-8901" -> "+1 (555) ***-8901"
 */
export function maskPhone(phone) {
  if (!phone) return phone;
  return phone.replace(/(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?(\d{4})/, '$1(***) ***-$2');
}

/**
 * Applies privacy-preserving field masking to a patient object based on requester privileges.
 * - Full unmasked: ADMIN or assigned DOCTOR
 * - Masked: Other clinical staff, NURSE, or unauthorized viewers
 */
export function maskPatientSensitiveFields(patient, user, isAssignedDoctor = false) {
  if (!patient) return patient;
  const copy = { ...patient };

  // Decrypt at rest first if encrypted
  if (copy.contactInformation) {
    copy.contactInformation = decryptDataAtRest(copy.contactInformation);
  }

  const isPrivileged = user?.role === 'ADMIN' || isAssignedDoctor;

  if (!isPrivileged) {
    // Mask contact details
    if (copy.contactInformation) {
      // Split multiple contact tokens if formatted with bullet
      const parts = copy.contactInformation.split('•').map((s) => s.trim());
      const maskedParts = parts.map((part) => {
        if (part.includes('@')) return maskEmail(part);
        if (/\d{3}/.test(part)) return maskPhone(part);
        return part;
      });
      copy.contactInformation = maskedParts.join(' • ');
    }
  }

  return copy;
}
